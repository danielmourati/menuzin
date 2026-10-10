import { useCustomerOrder } from "@/hooks/useCustomerOrder";
import { useQuery } from "@tanstack/react-query";
import { getTenantBySlug } from "@/lib/catalog.functions";
import { dbTenantToUi } from "@/lib/db-adapters";
import { brl } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { MessageCircle, ArrowLeft, MapPin, Loader2, ChevronRight, Store as StoreIcon, Timer, CheckCircle2, XCircle, PhoneCall, Globe } from "lucide-react";
import { formatScheduledFull, formatScheduledShort, formatHourSp } from "@/lib/scheduling";
import { formatPhoneNumber } from "@/lib/format";
import type { Order, Tenant } from "@/lib/domain-types";
import { Link } from "@tanstack/react-router";
import { whatsappLink } from "@/lib/whatsapp";
import { getAgentPublicInfo } from "@/lib/ai-agent.functions";
import { AiOrderChatWindow } from "./AiOrderChat";
import { PaymentStatusBadge } from "../orders/OrderStatusBadge";
import { OrderRatingCard } from "./OrderRatingCard";

interface CustomerOrderTrackingProps {
  slug: string;
  orderId: string; // pode ser UUID ou número (#)
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function CustomerOrderTracking({ slug, orderId }: CustomerOrderTrackingProps) {
  const isUuid = UUID_RE.test(orderId);
  const asNumber = Number(orderId);

  const lookup = isUuid
    ? { kind: "id" as const, id: orderId }
    : Number.isFinite(asNumber) && asNumber > 0
      ? { kind: "number" as const, tenantSlug: slug, number: asNumber }
      : null;

  const { order, isLoading } = useCustomerOrder(lookup);

  const { data: tenantRes } = useQuery({
    queryKey: ["tenant", slug],
    queryFn: () => getTenantBySlug({ data: { slug } }),
    staleTime: 60_000,
  });
  const tenant = tenantRes?.tenant ? dbTenantToUi(tenantRes.tenant) : null;

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6">
          <CardContent className="space-y-4 pt-4">
            <span className="text-4xl">🏪</span>
            <h2 className="text-xl font-bold">Estabelecimento não encontrado</h2>
            <p className="text-sm text-muted-foreground">
              A loja que você está tentando acessar não está ativa ou não existe.
            </p>
            <Button asChild className="w-full">
              <Link to="/">Voltar à plataforma</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-muted/10 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6">
          <CardContent className="space-y-4 pt-4">
            <span className="text-4xl">🔍</span>
            <h2 className="text-xl font-bold">Pedido não encontrado</h2>
            <p className="text-sm text-muted-foreground">
              Não encontramos o pedido <strong>{orderId}</strong> em nosso sistema. Verifique o link ou tente novamente.
            </p>
            <Button asChild className="w-full">
              <Link to="/$slug" params={{ slug }}>
                Voltar ao Cardápio
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <TrackingView order={order} tenant={tenant} slug={slug} />;
}

const STEP_COPY: Record<string, { title: string; text: string }> = {
  novo: { title: "Efetuado", text: "Seu pedido foi realizado e está aguardando a confirmação do estabelecimento." },
  aceito: { title: "Confirmado", text: "Seu pedido foi confirmado e está sendo preparado." },
  preparo: { title: "Em preparo", text: "Seu pedido está sendo preparado com carinho." },
  saiu_entrega: { title: "Saiu para entrega", text: "Seu pedido está a caminho." },
  pronto_retirada: { title: "Pronto para retirada", text: "Seu pedido está pronto. Pode vir buscar!" },
  servido: { title: "Servido", text: "Seu pedido foi servido. Bom apetite!" },
  finalizado: { title: "Finalizado", text: "Pedido concluído. Obrigado pela preferência!" },
  cancelado: { title: "Cancelado", text: "Seu pedido foi cancelado." },
  mal_sucedido: { title: "Não concluído", text: "Não foi possível concluir o pedido." },
};

const PROGRESS: Record<string, number> = {
  novo: 15, aceito: 40, preparo: 60, saiu_entrega: 80, pronto_retirada: 80, servido: 90, finalizado: 100, cancelado: 100,
};

function TrackingView({ order, tenant, slug }: { order: Order; tenant: Tenant; slug: string }) {
  const [details, setDetails] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const { data: aiInfo } = useQuery({
    queryKey: ["ai-agent-info", slug],
    queryFn: () => getAgentPublicInfo({ data: { slug } }),
    staleTime: 60_000,
  });
  const isCancelled = order.status === "cancelado";
  const current = STEP_COPY[order.status] ?? STEP_COPY.novo;
  const progress = PROGRESS[order.status] ?? 15;

  const modeTitle = order.mode === "entrega" ? "Entregar meu pedido" : order.mode === "retirada" ? "Retirar meu pedido" : "Consumir no local";
  const addressLines =
    order.mode === "entrega" && order.address
      ? [
          `${order.address.street ?? ""}${order.address.number ? ", " + order.address.number : ""}${order.address.complement ? " — " + order.address.complement : ""}`,
          order.address.neighborhood ?? "",
          order.address.cep ? `CEP ${order.address.cep}` : "",
        ]
      : [
          `${tenant.address}${tenant.addressNumber ? ", " + tenant.addressNumber : ""}`,
          tenant.neighborhood ?? "",
          [tenant.city, tenant.state].filter(Boolean).join(", ") + (tenant.cep ? ` - ${tenant.cep}` : ""),
        ];

  const forecast = (() => {
    if (order.scheduledFor) return new Date(order.scheduledFor);
    const max = order.mode === "entrega" ? tenant.deliveryTimeMax ?? tenant.deliveryTimeMin : tenant.takeoutTimeMax ?? tenant.takeoutTimeMin;
    if (!max) return null;
    const base = new Date(order.acceptedAt ?? order.createdAt).getTime();
    return new Date(base + max * 60_000);
  })();

  const history = [...order.statusHistory].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const phoneDigits = tenant.whatsapp.replace(/\D/g, "");

  if (details) {
    return (
      <div className="min-h-screen bg-background pb-12">
        <Header title="Detalhes do pedido" onBack={() => setDetails(false)} />
        <div className="mx-auto max-w-lg space-y-6 px-4 pt-4">
          <div className="flex items-center justify-center gap-3 rounded-2xl bg-muted/60 p-5">
            <Globe className="h-8 w-8 text-primary" />
            <div>
              <p className="font-bold">{current.title}</p>
              <p className="text-sm text-muted-foreground">Pedido feito pelo site</p>
            </div>
          </div>
          {order.scheduledFor && (
            <section>
              <h3 className="font-bold">Agendado para</h3>
              <p className="mt-1">{formatScheduledFull(order.scheduledFor, tenant.schedulingSlotMinutes ?? 10)}</p>
            </section>
          )}
          <section>
            <h3 className="font-bold">{modeTitle}</h3>
            {order.mode === "consumo_local" && order.table && <p className="mt-1">Mesa: {order.table}</p>}
            <div className="mt-1 text-muted-foreground">
              {addressLines.filter(Boolean).map((l, i) => <p key={i}>{l}</p>)}
            </div>
          </section>
          <section>
            <h3 className="border-b pb-2 font-bold">Itens</h3>
            <div className="divide-y">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex gap-3 py-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-sm font-bold">{item.qty}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold">{item.name}</span>
                      <span className="shrink-0">{brl(item.unitPrice * item.qty)}</span>
                    </div>
                    {item.addons?.map((a, i) => <p key={i} className="text-sm text-muted-foreground">{a.name}</p>)}
                    {item.note && <p className="text-sm italic text-muted-foreground">Obs: {item.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="space-y-2 border-t pt-3">
            <Row label="Subtotal" value={brl(order.subtotal)} />
            {order.deliveryFee > 0 && <Row label="Taxa de entrega" value={brl(order.deliveryFee)} />}
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{brl(order.total)}</span>
            </div>
            <div className="flex items-center gap-2 pt-1 text-sm">
              <span className="font-semibold">{order.payment}</span>
              <PaymentStatusBadge status={order.paymentStatus} className="px-1 py-0 text-[10px]" />
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <h1 className="sr-only">Acompanhamento do pedido #{order.number} — {tenant.name}</h1>
      <Header title={tenant.name} backTo={slug} logo={tenant.logoUrl} />
      <div className="mx-auto max-w-lg px-4 pt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">Pedido #{order.number}</h2>
          <button type="button" onClick={() => setDetails(true)} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            Ver detalhes <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 font-semibold">{modeTitle}</p>
        <div className="mt-2 flex gap-3">
          {order.mode === "entrega" ? <MapPin className="h-6 w-6 shrink-0" /> : <StoreIcon className="h-6 w-6 shrink-0" />}
          <div className="text-sm text-muted-foreground">
            {addressLines.filter(Boolean).map((l, i) => <p key={i}>{l}</p>)}
            {order.mode === "consumo_local" && order.table && <p>Mesa: {order.table}</p>}
          </div>
        </div>

        <div className="relative mt-6 h-1.5 rounded-full bg-muted">
          <div className={`h-full rounded-full transition-all ${isCancelled ? "bg-destructive" : "bg-primary"}`} style={{ width: `${progress}%` }} />
          <span className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ${isCancelled ? "bg-destructive" : "bg-primary"}`} style={{ left: `calc(${progress}% - ${progress >= 100 ? 8 : 0}px)` }} />
        </div>
        {forecast && !isCancelled && order.status !== "finalizado" && (
          <p className="mt-4 flex items-center justify-center gap-2 text-sm italic text-muted-foreground">
            <Timer className="h-4 w-4" /> Previsto para {formatForecast(forecast)}
          </p>
        )}

        <div className="mt-6 flex items-center gap-4 rounded-2xl bg-muted/60 p-5 shadow-sm">
          <div className="min-w-0 flex-1">
            <p className="font-bold">{current.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{current.text}</p>
          </div>
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${isCancelled ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
            {isCancelled ? <XCircle className="h-6 w-6" /> : <Loader2 className={`h-6 w-6 ${order.status === "finalizado" ? "" : "animate-spin"}`} />}
          </span>
        </div>

        {order.driverName && (
          <p className="mt-3 rounded-xl bg-muted/60 p-3 text-sm">
            Entregador: <strong>{order.driverName}</strong>
          </p>
        )}

        {history.length > 0 && (
          <section className="mt-8">
            <h3 className="text-base">Linha do tempo</h3>
            <ol className="mt-3 space-y-4">
              {history.map((h) => {
                const c = STEP_COPY[h.newStatus] ?? { title: h.newStatus, text: "" };
                return (
                  <li key={h.id} className="flex gap-3">
                    <span className="w-12 shrink-0 text-sm text-muted-foreground">{formatHourSp(h.createdAt)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{c.title}</p>
                      <p className="text-sm text-muted-foreground">{c.text}</p>
                    </div>
                    <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {(["saiu_entrega", "pronto_retirada", "servido", "finalizado"] as const).includes(order.status as never) && (
          <div className="mt-6">
            <OrderRatingCard orderId={order.id} />
          </div>
        )}

        <section className="mt-8 border-y py-5">
          <h3 className="text-base">Precisa de ajuda? Fale conosco</h3>
          {aiInfo?.enabled ? (
            <button type="button" onClick={() => setChatOpen(true)} className="mt-4 flex items-center gap-3">
              <MessageCircle className="h-6 w-6" /> Chat
            </button>
          ) : (
            <a
              href={whatsappLink(tenant.whatsapp, `Olá, equipe ${tenant.name}! Tenho uma dúvida sobre o meu pedido #${order.number}.`)}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center gap-3"
            >
              <MessageCircle className="h-6 w-6" /> Chat
            </a>
          )}
          {chatOpen && aiInfo?.enabled && (
            <AiOrderChatWindow
              slug={slug}
              info={aiInfo}
              orderId={order.id}
              orderGreeting={`Oi${order.customerName ? `, ${order.customerName.split(" ")[0]}` : ""}! Seu pedido #${order.number} está **${current.title}**. Posso ajudar com alguma dúvida sobre ele?`}
              onClose={() => setChatOpen(false)}
            />
          )}
          {phoneDigits && (
            <a href={`tel:+55${phoneDigits}`} className="mt-4 flex items-center gap-3">
              <PhoneCall className="h-6 w-6" /> Ligar para {formatPhoneNumber(phoneDigits)}
            </a>
          )}
        </section>

        <div className="mt-6 flex justify-center">
          <Button asChild variant="outline" className="h-12 w-48 font-semibold">
            <Link to="/$slug" params={{ slug }}>Voltar</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatForecast(d: Date) {
  const iso = d.toISOString();
  const [date] = formatScheduledShort(iso).split(" ");
  return `${date} às ${formatHourSp(iso)}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function Header({ title, onBack, backTo, logo }: { title: string; onBack?: () => void; backTo?: string; logo?: string }) {
  const icon = (
    <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
      <ArrowLeft className="h-5 w-5" />
    </span>
  );
  return (
    <div className="border-b bg-card" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
        {onBack ? (
          <button type="button" onClick={onBack} aria-label="Voltar">{icon}</button>
        ) : backTo ? (
          <Link to="/$slug" params={{ slug: backTo }} aria-label="Voltar ao cardápio">{icon}</Link>
        ) : null}
        {logo && <img src={logo} alt="" className="h-8 w-8 rounded-full object-cover" />}
        <p className="truncate text-lg font-bold">{title}</p>
      </div>
    </div>
  );
}
