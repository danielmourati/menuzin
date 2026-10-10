import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlanGate } from "@/components/subscription/PlanGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ChefHat, ArrowUp, ArrowDown, Trash2, Plus, Headset, Mic } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  getMyAgentSettings, saveMyAgentSettings, listMyAgentConversations, getMyAgentConversationMessages,
  listMyQuickReplies, restoreDefaultQuickReplies, saveMyQuickReply, deleteMyQuickReply, reorderMyQuickReplies, sendStaffReply, setHandoffStatus, acceptHandoff, getMyAgentAudioUrl,
} from "@/lib/ai-agent.functions";

export const Route = createFileRoute("/admin/atendente-ia")({
  head: () => ({
    meta: [
      { title: "Atendente IA — Menuzin" },
      { name: "description", content: "Configure o atendente com IA que recebe pedidos conversando no cardápio da loja." },
      { property: "og:title", content: "Atendente IA — Menuzin" },
      { property: "og:description", content: "Pedidos por conversa direto para a cozinha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PlanGate min="pro" title="Atendente IA" featureLabel="Atendente IA">
      <AdminLayout title="Atendente IA">
        <Tabs defaultValue={typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "conversas" ? "conversas" : "config"} className="space-y-4">
          <TabsList>
            <TabsTrigger value="config">Configurações</TabsTrigger>
            <TabsTrigger value="atalhos">Atalhos</TabsTrigger>
            <TabsTrigger value="conversas">Conversas</TabsTrigger>
          </TabsList>
          <TabsContent value="config"><SettingsTab /></TabsContent>
          <TabsContent value="atalhos"><QuickRepliesTab /></TabsContent>
          <TabsContent value="conversas"><ConversationsTab /></TabsContent>
        </Tabs>
      </AdminLayout>
    </PlanGate>
  ),
});

function SettingsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["ai-agent-settings"], queryFn: () => getMyAgentSettings() });
  const [form, setForm] = useState({ enabled: false, agent_name: "Zinho", tone: "descontraido" as "descontraido" | "formal", greeting: "", extra_instructions: "" });
  useEffect(() => {
    if (data) setForm({ enabled: data.enabled, agent_name: data.agent_name, tone: data.tone as "descontraido" | "formal", greeting: data.greeting, extra_instructions: data.extra_instructions });
  }, [data]);
  const save = useMutation({
    mutationFn: () => saveMyAgentSettings({ data: form }),
    onSuccess: () => { toast.success("Atendente salvo!"); qc.invalidateQueries({ queryKey: ["ai-agent-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ChefHat className="h-5 w-5 text-primary" /> Pedidos por conversa</CardTitle>
        <CardDescription>
          Seus clientes tocam em "Pedir conversando" no cardápio e fazem o pedido escrevendo. O atendente usa seu cardápio, cupons e itens em falta,
          monta o resumo e só envia para a cozinha depois que o cliente confirma. Os preços sempre vêm do seu cardápio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-xl border p-3">
          <div>
            <p className="font-medium">Atendente ligado</p>
            <p className="text-xs text-muted-foreground">Mostra o botão "Pedir conversando" na sua loja.</p>
          </div>
          <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Nome do atendente</Label>
            <Input value={form.agent_name} maxLength={40} onChange={(e) => setForm({ ...form, agent_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Jeito de falar</Label>
            <div className="flex gap-2">
              {(["descontraido", "formal"] as const).map((t) => (
                <Button key={t} type="button" variant={form.tone === t ? "default" : "outline"} className="flex-1" onClick={() => setForm({ ...form, tone: t })}>
                  {t === "descontraido" ? "Descontraído" : "Formal"}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Mensagem de boas-vindas</Label>
          <Input value={form.greeting} maxLength={300} placeholder="Oi! Sou o Zinho 👋 O que vai ser hoje?" onChange={(e) => setForm({ ...form, greeting: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Recados para o atendente</Label>
          <Textarea rows={4} maxLength={1500} value={form.extra_instructions}
            placeholder="Ex.: Não fazemos troca de recheio. Sempre ofereça o suco de laranja natural."
            onChange={(e) => setForm({ ...form, extra_instructions: e.target.value })} />
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
        </Button>
      </CardContent>
    </Card>
  );
}

type QRow = { id: string | null; label: string; message: string; active: boolean };
function QuickRepliesTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["ai-quick-replies"], queryFn: () => listMyQuickReplies() });
  const [edit, setEdit] = useState<QRow | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["ai-quick-replies"] });
  const save = useMutation({
    mutationFn: (r: QRow) => saveMyQuickReply({ data: r }),
    onSuccess: () => { toast.success("Atalho salvo!"); setEdit(null); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({ mutationFn: (id: string) => deleteMyQuickReply({ data: { id } }), onSuccess: refresh, onError: (e: Error) => toast.error(e.message) });
  const move = useMutation({
    mutationFn: (ids: string[]) => reorderMyQuickReplies({ data: { ids } }), onSuccess: refresh,
    onError: (e: Error) => { toast.error(e.message); refresh(); },
  });
  const restore = useMutation({
    mutationFn: () => restoreDefaultQuickReplies(),
    onSuccess: () => { toast.success("Atalhos padrão restaurados."); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
  const rows = data ?? [];
  const swap = (i: number, j: number) => { const ids = rows.map((r) => r.id); [ids[i], ids[j]] = [ids[j], ids[i]]; move.mutate(ids); };
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Atalhos da conversa</CardTitle>
        <CardDescription>Botões que aparecem no início do chat para o cliente tocar. Toque em um atalho para editar. Até 8 ativos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" disabled={restore.isPending} onClick={() => { if (confirm("Substituir todos os atalhos pelos 3 padrões?")) restore.mutate(); }}>
            Restaurar padrões
          </Button>
        </div>
        {rows.map((r, i) => (
          <div key={r.id} className="flex items-center gap-2 rounded-xl border p-2">
            <div className="flex flex-col">
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={i === 0 || move.isPending} onClick={() => swap(i, i - 1)} aria-label="Subir"><ArrowUp className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={i === rows.length - 1 || move.isPending} onClick={() => swap(i, i + 1)} aria-label="Descer"><ArrowDown className="h-3.5 w-3.5" /></Button>
            </div>
            <button className="flex-1 text-left" onClick={() => setEdit({ id: r.id, label: r.label, message: r.message, active: r.active })}>
              <p className="text-sm font-medium">{r.label}</p>
              {r.message && r.message !== r.label && <p className="text-xs text-muted-foreground">Envia: {r.message}</p>}
            </button>
            <Switch checked={r.active} onCheckedChange={(v) => save.mutate({ id: r.id, label: r.label, message: r.message, active: v })} />
            <Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)} aria-label="Apagar"><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        {edit ? (
          <div className="space-y-2 rounded-xl border p-3">
            <Label>Texto do botão</Label>
            <Input maxLength={80} value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} placeholder="Ex.: Tem promoção hoje?" />
            <Label>Mensagem enviada (opcional)</Label>
            <Input maxLength={80} value={edit.message} onChange={(e) => setEdit({ ...edit, message: e.target.value })} placeholder="Se vazio, envia o próprio texto" />
            <div className="flex gap-2">
              <Button onClick={() => save.mutate(edit)} disabled={!edit.label.trim() || save.isPending}>Salvar</Button>
              <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setEdit({ id: null, label: "", message: "", active: true })}><Plus className="mr-1 h-4 w-4" /> Novo atalho</Button>
        )}
      </CardContent>
    </Card>
  );
}

function ConversationsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["ai-agent-conversations"], queryFn: () => listMyAgentConversations(), refetchInterval: 10000 });
  const [selected, setSelected] = useState<string | null>(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("conversa") : null);
  const [onlyWaiting, setOnlyWaiting] = useState(false);
  const [reply, setReply] = useState("");
  const msgs = useQuery({
    queryKey: ["ai-agent-conv", selected],
    queryFn: () => getMyAgentConversationMessages({ data: { id: selected! } }),
    enabled: !!selected, refetchInterval: 5000,
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["ai-agent-conversations"] }); qc.invalidateQueries({ queryKey: ["ai-agent-conv", selected] }); };
  const send = useMutation({
    mutationFn: () => sendStaffReply({ data: { id: selected!, text: reply } }),
    onSuccess: () => { setReply(""); refresh(); }, onError: (e: Error) => toast.error(e.message),
  });
  const accept = useMutation({
    mutationFn: () => acceptHandoff({ data: { id: selected! } }),
    onSuccess: () => { toast.success("Você assumiu o atendimento."); refresh(); }, onError: (e: Error) => toast.error(e.message),
  });
  const setStatus = useMutation({
    mutationFn: (status: "none" | "closed") => setHandoffStatus({ data: { id: selected!, status } }),
    onSuccess: refresh, onError: (e: Error) => toast.error(e.message),
  });
  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
  if (!data?.length) return <p className="text-sm text-muted-foreground">Nenhuma conversa ainda.</p>;
  const waiting = (c: any) => c.status === "open" && (c.handoff_status === "requested" || c.handoff_status === "human");
  const list = onlyWaiting ? data.filter(waiting) : data;
  const cur: any = data.find((c) => c.id === selected);
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm"><Switch checked={onlyWaiting} onCheckedChange={setOnlyWaiting} /> Só aguardando atendente</label>
        {list.map((c: any) => (
          <button key={c.id} onClick={() => setSelected(c.id)}
            className={`w-full rounded-xl border p-3 text-left text-sm transition hover:border-primary ${selected === c.id ? "border-primary bg-primary/5" : "bg-card"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{c.customer_name || "Cliente"}</span>
              {c.status === "ordered" ? <Badge>Pedido #{c.order_number ?? "—"}</Badge>
                : c.handoff_status === "requested" ? <Badge variant="destructive">Aguardando atendente</Badge>
                : c.handoff_status === "human" ? <Badge variant="secondary">Com a loja</Badge>
                : <Badge variant="outline">Sem pedido</Badge>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {c.customer_phone || "sem WhatsApp"} · {new Date(c.updated_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </p>
          </button>
        ))}
      </div>
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {!selected ? <p className="text-sm text-muted-foreground">Escolha uma conversa.</p>
            : msgs.isLoading ? <Loader2 className="h-5 w-5 animate-spin" />
            : (msgs.data?.messages ?? []).filter((m) => m.text).map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm [&_p]:my-0.5 ${m.role === "user" ? "whitespace-pre-line bg-primary text-primary-foreground" : m.staff ? "border border-primary bg-card" : "bg-muted"}`}>
                  {m.staff && <p className="mb-0.5 text-[10px] font-semibold text-primary">Loja</p>}
                  {m.role === "user" ? m.text : <ReactMarkdown>{m.text}</ReactMarkdown>}
                  {m.audioPath && selected && <AudioPlayer convId={selected} path={m.audioPath} />}
                </div>
              </div>
            ))}
          </div>
          {msgs.data?.location && (
            <a className="block text-xs text-primary underline" target="_blank" rel="noreferrer"
              href={`https://www.google.com/maps?q=${msgs.data.location.lat},${msgs.data.location.lng}`}>📍 Abrir localização do cliente no mapa</a>
          )}
          {msgs.data?.cart && msgs.data.cart.lines.length > 0 && (
            <div className="rounded-xl border bg-muted/40 p-3 text-xs">
              <p className="mb-1 font-semibold">Carrinho do cliente</p>
              {msgs.data.cart.lines.map((l, i) => (
                <div key={i} className="flex justify-between gap-2"><span>{l.qty}× {l.name}{l.details ? ` — ${l.details}` : ""}</span><span>{brl(l.line_total)}</span></div>
              ))}
              <div className="mt-1 flex justify-between border-t pt-1 font-semibold"><span>Total{msgs.data.cart.delivery_fee ? ` (entrega ${brl(msgs.data.cart.delivery_fee)})` : ""}</span><span>{brl(msgs.data.cart.total)}</span></div>
              <p className="mt-1 text-muted-foreground">
                {[msgs.data.cart.mode, msgs.data.cart.payment, msgs.data.cart.address && [msgs.data.cart.address.street, msgs.data.cart.address.number, msgs.data.cart.address.neighborhood].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
              </p>
            </div>
          )}
          {cur?.order_id && <Link to="/admin/pedidos" className="block pt-2 text-xs text-primary underline">Ver nos pedidos</Link>}
          {cur && cur.status === "open" && cur.handoff_status === "requested" && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <span className="flex-1">O cliente pediu para falar com alguém. Leia a conversa e assuma.</span>
              <Button onClick={() => accept.mutate()} disabled={accept.isPending}><Headset className="mr-1 h-4 w-4" />Assumir atendimento</Button>
            </div>
          )}
          {cur?.handoff_status === "human" && cur.handoff_staff_name && <p className="text-xs text-muted-foreground">Em atendimento por {cur.handoff_staff_name}</p>}
          {cur && cur.status === "open" && (
            <div className="space-y-2 border-t pt-3">
              <div className="flex gap-2">
                <Input value={reply} maxLength={1000} placeholder="Responder ao cliente…" onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && reply.trim()) send.mutate(); }} />
                <Button onClick={() => send.mutate()} disabled={!reply.trim() || send.isPending}><Headset className="mr-1 h-4 w-4" />Enviar</Button>
              </div>
              {waiting(cur) && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setStatus.mutate("none")}>Devolver para a IA</Button>
                  <Button size="sm" variant="outline" onClick={() => setStatus.mutate("closed")}>Encerrar</Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AudioPlayer({ convId, path }: { convId: string; path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  if (url) return <audio controls autoPlay src={url} className="mt-2 h-9 w-full max-w-[240px]" />;
  return (
    <Button type="button" size="sm" variant="secondary" className="mt-2 h-7 text-xs" disabled={loading}
      onClick={async () => {
        setLoading(true);
        try { setUrl((await getMyAgentAudioUrl({ data: { id: convId, path } })).url); }
        catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao carregar o áudio."); }
        finally { setLoading(false); }
      }}>
      {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Mic className="mr-1 h-3 w-3" />} Ouvir áudio original
    </Button>
  );
}

function brl(n: number) { return Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
