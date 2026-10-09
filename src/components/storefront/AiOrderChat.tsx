import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { ChefHat, Loader2, Send, X, RotateCcw, CheckCircle2, ShoppingBag, CreditCard, Flag, Headset, MessageCircle } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getAgentPublicInfo, startAgentConversation, getAgentConversation, confirmAgentOrder, requestHumanHandoff,
} from "@/lib/ai-agent.functions";
import { readCustomerProfile, writeCustomerProfile } from "@/lib/customer-profile";

type Stored = { id: string; accessKey: string };
type QR = { label: string; message: string };
type Info = { enabled: boolean; name: string; greeting: string; quickReplies: QR[]; whatsapp: string };
type Priced = {
  lines: { name: string; qty: number; details: string[]; line_total: number; note: string | null }[];
  subtotal: number; discount: number; delivery_fee: number; total: number; change_back: number | null;
  ready: boolean; coupon_code: string | null; missing: string[]; errors: string[];
  draft: { mode: string | null; payment: string | null; customer_name: string | null; address: Record<string, string | null> | null; table_label: string | null };
};
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const key = (slug: string) => `menuzin:ai-chat:${slug}`;
const PAY: Record<string, string> = { dinheiro: "Dinheiro", credito: "Maquininha (crédito)", debito: "Maquininha (débito)", pix_manual: "Pix manual" };
const MODE: Record<string, string> = { entrega: "Entrega", retirada: "Retirada", consumo_local: "Consumo no local" };

export function AiOrderChatLauncher({ slug }: { slug: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    getAgentPublicInfo({ data: { slug } }).then(setInfo).catch(() => setInfo(null));
  }, [slug]);
  if (!info?.enabled) return null;
  return (
    <>
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:scale-105"
          aria-label="Pedir conversando"
        >
          <ChefHat className="h-5 w-5" /> Pedir conversando
        </Button>
      )}
      {open && <AiOrderChatWindow slug={slug} info={info} onClose={() => setOpen(false)} />}
    </>
  );
}

function AiOrderChatWindow({ slug, info, onClose }: { slug: string; info: Info; onClose: () => void }) {
  const { name, greeting } = info;
  const [handoff, setHandoff] = useState("none");
  const [conv, setConv] = useState<Stored | null>(null);
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  const [priced, setPriced] = useState<Priced | null>(null);
  const [error, setError] = useState<string | null>(null);

  const boot = async (forceNew = false) => {
    setError(null);
    setInitial(null);
    try {
      let stored: Stored | null = null;
      if (!forceNew) {
        try { stored = JSON.parse(localStorage.getItem(key(slug)) || "null"); } catch { stored = null; }
      }
      if (stored) {
        const c = await getAgentConversation({ data: stored });
        if (c && c.status === "open") {
          setConv(stored); setPriced(c.priced); setHandoff(c.handoff_status); setInitial(c.messages as UIMessage[]);
          return;
        }
      }
      const p = readCustomerProfile();
      const created = await startAgentConversation({ data: { slug, customer_name: p?.name ?? null, whatsapp: p?.phone || null } });
      localStorage.setItem(key(slug), JSON.stringify(created));
      setConv(created); setPriced(null); setHandoff("none"); setInitial([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Atendente indisponível.");
    }
  };
  useEffect(() => { void boot(); }, [slug]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex h-[85dvh] flex-col overflow-hidden rounded-t-2xl border bg-card shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:h-[620px] sm:w-[400px] sm:rounded-2xl">
      <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/15"><ChefHat className="h-5 w-5" /></div>
          <div>
            <p className="text-sm font-semibold leading-none">{name}</p>
            <p className="mt-1 text-xs opacity-80">Atendente virtual · faça seu pedido conversando</p>
          </div>
        </div>
        <div className="flex gap-1">
          {conv && handoff === "none" && (
            <Button variant="ghost" size="icon" onClick={async () => {
              try { await requestHumanHandoff({ data: conv }); setHandoff("requested"); } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao chamar atendente."); }
            }} className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" aria-label="Falar com atendente" title="Falar com atendente"><Headset className="h-4 w-4" /></Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => boot(true)} className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" aria-label="Nova conversa" title="Nova conversa"><RotateCcw className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" aria-label="Fechar"><X className="h-5 w-5" /></Button>
        </div>
      </div>
      {error ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">{error}</div>
      ) : !conv || !initial ? (
        <div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <ChatBody key={conv.id} slug={slug} conv={conv} initial={initial} greeting={greeting} name={name}
          priced={priced} setPriced={setPriced} info={info} handoff={handoff} setHandoff={setHandoff} onNew={() => boot(true)} onClose={onClose} />
      )}
    </div>
  );
}

function ChatBody({ slug, conv, initial, greeting, name, priced, setPriced, info, handoff, setHandoff, onNew, onClose }: {
  info: Info; handoff: string; setHandoff: (h: string) => void;
  slug: string; conv: Stored; initial: UIMessage[]; greeting: string; name: string; priced: Priced | null;
  setPriced: (p: Priced | null) => void; onNew: () => void; onClose: () => void;
}) {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/public/ai-chat", body: { slug, conversationId: conv.id, accessKey: conv.accessKey } }),
    [slug, conv.id, conv.accessKey],
  );
  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: conv.id, messages: initial, transport,
    onFinish: async () => {
      const c = await getAgentConversation({ data: conv }).catch(() => null);
      if (c) { setPriced(c.priced); setHandoff(c.handoff_status); }
      inputRef.current?.focus();
    },
  });
  const humanMode = handoff === "requested" || handoff === "human";
  useEffect(() => {
    if (!humanMode) return;
    const t = setInterval(async () => {
      if (status === "submitted" || status === "streaming") return;
      const c = await getAgentConversation({ data: conv }).catch(() => null);
      if (!c) return;
      setHandoff(c.handoff_status);
      setPriced(c.priced);
      setMessages(c.messages as UIMessage[]);
    }, 5000);
    return () => clearInterval(t);
  }, [humanMode, conv, status, setMessages, setHandoff, setPriced]);
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, status, priced]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    void sendMessage({ text: t });
    setInput("");
  };

  const showCart = () => {
    if (!priced?.lines.length) {
      send("Quero ver meu carrinho.");
      return;
    }
    summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const finishOrder = () => {
    if (priced?.ready) {
      summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    send("Quero finalizar meu pedido. Me ajude com o que ainda falta.");
  };

  const confirm = async () => {
    setConfirming(true);
    try {
      const r = await confirmAgentOrder({ data: { ...conv, slug } });
      if (r.customer) writeCustomerProfile({ phone: r.customer.phone, name: priced?.draft.customer_name ?? undefined, token: r.customer.token } as never);
      localStorage.removeItem(key(slug));
      toast.success("Pedido enviado para a loja!");
      onClose();
      navigate({ to: "/$slug/acompanhar/$orderId", params: { slug, orderId: r.orderId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível confirmar.");
    } finally {
      setConfirming(false);
    }
  };

  const welcome = greeting || `Oi! Eu sou o ${name} 👋 Me conta o que você quer pedir hoje que eu monto tudo pra você.`;

  return (
    <>
      <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4">
        <Bubble role="assistant" text={welcome} />
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {info.quickReplies.map((q) => (
              <Button key={q.label} variant="outline" size="sm" onClick={() => send(q.message)} className="h-auto rounded-full bg-card px-3 py-1.5 text-xs hover:border-primary hover:text-primary">{q.label}</Button>
            ))}
          </div>
        )}
        {messages.map((m) => {
          const text = m.parts.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join("");
          const usedTool = m.parts.some((p) => p.type === "tool-update_draft");
          const staff = m.parts.some((p) => p.type === "data-staff");
          return (
            <div key={m.id} className="space-y-1">
              {usedTool && m.role === "assistant" && (
                <p className="pl-1 text-[11px] text-muted-foreground">🧾 Pedido atualizado</p>
              )}
              {staff && <p className="pl-1 text-[11px] font-medium text-primary">Atendente da loja</p>}
              {text && <Bubble role={m.role} text={text} />}
            </div>
          );
        })}
        {status === "submitted" && (
          <div className="flex w-fit gap-1 rounded-2xl bg-card px-3 py-2">
            {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${i * 0.15}s` }} />)}
          </div>
        )}
        {error && <p className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{error.message || "Falha ao responder."}</p>}
        {humanMode && (
          <div className="space-y-2 rounded-xl border border-primary/30 bg-card p-3 text-xs">
            <p>{handoff === "requested" ? "Chamamos alguém da loja, aguarde um instante 🙂 Pode ir escrevendo por aqui." : "Você está falando com a equipe da loja."}</p>
            {info.whatsapp && (
              <a target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary underline"
                href={`https://wa.me/55${info.whatsapp.replace(/^55/, "")}?text=${encodeURIComponent(`Olá! Estava fazendo um pedido pelo chat.${priced?.lines.length ? "\n" + priced.lines.map((l) => `${l.qty}x ${l.name}`).join("\n") : ""}`)}`}>
                <MessageCircle className="h-3.5 w-3.5" /> Chamar no WhatsApp da loja
              </a>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2" aria-label="Ações do pedido">
          {priced?.lines.length ? (
            <Button variant="outline" size="sm" onClick={showCart} disabled={busy} className="rounded-full bg-card">
              <ShoppingBag /> Ver carrinho
            </Button>
          ) : null}
          {priced?.lines.length ? (
            <Button variant="outline" size="sm" onClick={() => send("Quero seguir para o pagamento.")} disabled={busy || !!priced.draft.payment} className="rounded-full bg-card">
              <CreditCard /> {priced.draft.payment ? "Pagamento informado" : "Seguir para pagamento"}
            </Button>
          ) : null}
          {priced?.lines.length ? (
            <Button variant="outline" size="sm" onClick={() => send("Ok, já terminei de escolher meus itens.")} disabled={busy} className="rounded-full bg-card">
              <CheckCircle2 /> Ok, já terminei
            </Button>
          ) : null}
          {priced?.lines.length ? (
            <Button size="sm" onClick={finishOrder} disabled={busy} className="rounded-full">
              <Flag /> Finalizar pedido
            </Button>
          ) : null}
        </div>
        {priced && priced.lines.length > 0 && (
          <div ref={summaryRef}>
            <Summary priced={priced} confirming={confirming} busy={busy} onConfirm={confirm} onChange={() => { setInput("Quero alterar: "); inputRef.current?.focus(); }} />
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex items-end gap-2 border-t bg-card p-3"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          rows={1}
          maxLength={800}
          placeholder="Ex.: 2 pastéis de carne grandes, entrega…"
          className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <Button type="submit" size="icon" disabled={busy || !input.trim()} className="h-11 w-11 shrink-0 rounded-xl" aria-label="Enviar">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </>
  );
}

function Bubble({ role, text }: { role: string; text: string }) {
  const user = role === "user";
  return (
    <div className={`flex ${user ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${user ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-card text-card-foreground"}`}>
        {user ? text : <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:my-1 [&_ul]:my-1"><ReactMarkdown>{text}</ReactMarkdown></div>}
      </div>
    </div>
  );
}

function Summary({ priced, confirming, busy, onConfirm, onChange }: { priced: Priced; confirming: boolean; busy: boolean; onConfirm: () => void; onChange: () => void }) {
  const d = priced.draft;
  const addr = d.address ? [d.address.street, d.address.number, d.address.neighborhood].filter(Boolean).join(", ") : "";
  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-card p-3.5 text-sm shadow-sm">
      <p className="mb-2 font-semibold">Resumo do pedido</p>
      <ul className="space-y-1.5">
        {priced.lines.map((l, i) => (
          <li key={i} className="flex justify-between gap-2">
            <div>
              <span className="font-medium">{l.qty}× {l.name}</span>
              {l.details.length > 0 && <p className="text-xs text-muted-foreground">{l.details.join(" · ")}</p>}
              {l.note && <p className="text-xs italic text-muted-foreground">Obs.: {l.note}</p>}
            </div>
            <span className="shrink-0">{brl(l.line_total)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 space-y-0.5 border-t pt-2 text-xs text-muted-foreground">
        <div className="flex justify-between"><span>Subtotal</span><span>{brl(priced.subtotal)}</span></div>
        {priced.discount > 0 && <div className="flex justify-between"><span>Cupom {priced.coupon_code}</span><span>- {brl(priced.discount)}</span></div>}
        {d.mode === "entrega" && <div className="flex justify-between"><span>Entrega</span><span>{brl(priced.delivery_fee)}</span></div>}
        <div className="flex justify-between pt-1 text-sm font-bold text-foreground"><span>Total</span><span>{brl(priced.total)}</span></div>
        {d.mode && <p>{MODE[d.mode]}{addr ? `: ${addr}` : ""}{d.table_label ? ` · Mesa ${d.table_label}` : ""}</p>}
        {d.payment && <p>Pagamento: {PAY[d.payment]}{priced.change_back != null ? ` · troco ${brl(priced.change_back)}` : ""}</p>}
        {d.customer_name && <p>Cliente: {d.customer_name}</p>}
      </div>
      {priced.ready ? (
        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" onClick={onChange} disabled={confirming} className="h-auto flex-1 rounded-xl py-2 text-xs">Alterar</Button>
          <Button size="sm" onClick={onConfirm} disabled={confirming || busy} className="h-auto flex-[2] rounded-xl py-2 text-xs">
            {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Confirmar pedido
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Continue a conversa para completar o pedido.</p>
      )}
    </div>
  );
}
