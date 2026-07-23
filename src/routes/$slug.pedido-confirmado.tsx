import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, MessageCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brl, modeLabel } from "@/lib/format";
import { whatsappLink } from "@/lib/whatsapp";
import { getOrderByNumber } from "@/lib/orders.functions";
import { getTenantBySlug } from "@/lib/catalog.functions";
import { dbOrderToUi, dbHistoryToUi } from "@/lib/order-adapters";
import { dbTenantToUi } from "@/lib/db-adapters";
import { useCustomerOrder } from "@/hooks/useCustomerOrder";
import { parseAddonLabel } from "@/lib/product-selection";
import type { Order } from "@/lib/domain-types";

export const Route = createFileRoute("/$slug/pedido-confirmado")({
  validateSearch: (s: Record<string, unknown>) => ({ n: Number(s.n) || 0 }),
  component: ConfirmedPage,
});

function ConfirmedPage() {
  const { slug } = Route.useParams();
  const { n } = Route.useSearch();

  const initial = useQuery({
    queryKey: ["order-by-number", slug, n],
    queryFn: () => getOrderByNumber({ data: { tenant_slug: slug, number: n } }),
    enabled: n > 0,
    staleTime: 5_000,
  });

  const initialOrder = initial.data?.order
    ? dbOrderToUi(initial.data.order, dbHistoryToUi(initial.data.history))
    : null;

  const { order: liveOrder } = useCustomerOrder(
    initialOrder ? { kind: "id", id: initialOrder.id } : null
  );
  const order = liveOrder ?? initialOrder;

  const { data: tenantRes } = useQuery({
    queryKey: ["tenant", slug],
    queryFn: () => getTenantBySlug({ data: { slug } }),
    staleTime: 60_000,
  });
  const tenant = tenantRes?.tenant ? dbTenantToUi(tenantRes.tenant) : null;

  if (initial.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order || !tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-muted-foreground">Pedido não encontrado.</p>
          <Button asChild className="mt-4">
            <Link to="/$slug" params={{ slug }}>Voltar ao catálogo</Link>
          </Button>
        </div>
      </div>
    );
  }

  const waMessage = buildWhatsAppOrderMessage(order, tenant.name);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-lg px-4 py-10">
        <div className="rounded-3xl border bg-card p-6 text-center shadow-[var(--shadow-soft)]">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Pedido recebido!</h1>
          <p className="mt-1 text-muted-foreground">
            Pedido nº <span className="font-semibold text-foreground">#{order.number}</span>
          </p>

          <div className="mt-6 rounded-2xl border bg-muted/30 p-4 text-left">
            <p className="text-sm text-muted-foreground">Modalidade</p>
            <p className="font-semibold">{modeLabel[order.mode]}</p>
            <div className="mt-3 space-y-3 text-sm">
              {order.items.map((i, idx) => (
                <div key={idx}>
                  <div className="flex justify-between">
                    <span className="font-medium">{i.qty}x {i.name}</span>
                    <span className="text-muted-foreground">{brl(i.unitPrice * i.qty)}</span>
                  </div>
                  {i.addons && i.addons.length > 0 && (
                    <ul className="mt-1 space-y-0.5 pl-3 text-xs text-muted-foreground">
                      {i.addons.map((a) => {
                        const p = parseAddonLabel(a.name);
                        const prefix =
                          p.kind === "size" ? "Tamanho:" :
                          p.kind === "flavor" ? "Sabor:" :
                          p.kind === "group" ? `${p.groupName}:` : "+";
                        return (
                          <li key={a.id} className="flex justify-between gap-2">
                            <span>{prefix} {p.label}</span>
                            {Number(a.price) > 0 && <span>+ {brl(a.price)}</span>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {i.note && <p className="mt-1 pl-3 text-xs italic text-muted-foreground">Obs: {i.note}</p>}
                </div>
              ))}
            </div>
            <div className="mt-3 border-t pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>{brl(order.subtotal)}</span>
              </div>
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Entrega</span><span>{brl(order.deliveryFee)}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between font-bold">
                <span>Total</span><span>{brl(order.total)}</span>
              </div>
            </div>
          </div>

          {/pix manual/i.test(order.payment ?? "") && (
            <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left">
              <p className="text-sm font-semibold">Envie o comprovante do PIX</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Após efetuar o PIX, envie o comprovante ao lojista pelo WhatsApp para agilizar a confirmação.
              </p>
              <Button asChild className="mt-3 h-11 w-full bg-success text-success-foreground hover:bg-success/90">
                <a
                  href={whatsappLink(
                    tenant.whatsapp,
                    `Olá ${tenant.name}! Segue comprovante do PIX referente ao meu pedido #${order.number} — ${order.customerName}. Total: ${brl(order.total)}.`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="mr-2 h-4 w-4" /> Enviar comprovante via WhatsApp
                </a>
              </Button>
            </div>
          )}

          <div className="mt-6 space-y-2">
            <Button asChild className="h-12 w-full bg-success hover:bg-success/90 text-success-foreground">
              <a href={whatsappLink(tenant.whatsapp, waMessage)} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> Enviar pelo WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" className="h-12 w-full">
              <Link
                to="/$slug/acompanhar/$orderId"
                params={{ slug, orderId: order.id }}
              >
                Acompanhar pedido
              </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/$slug" params={{ slug }}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao catálogo
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildWhatsAppOrderMessage(order: Order, tenantName: string): string {
  const lines: string[] = [];
  lines.push(`Olá ${tenantName}! Segue meu pedido #${order.number}.`);
  lines.push("");
  lines.push(`*Cliente:* ${order.customerName}`);
  lines.push(`*Modalidade:* ${modeLabel[order.mode]}`);
  if (order.mode === "entrega" && order.address) {
    const a = order.address;
    lines.push(`*Endereço:* ${a.street ?? ""}, ${a.number ?? ""} — ${a.neighborhood ?? ""}`);
    if (a.complement) lines.push(`Compl.: ${a.complement}`);
    if (a.reference) lines.push(`Ref.: ${a.reference}`);
  }
  if (order.mode === "consumo_local" && order.table) lines.push(`*Local:* ${order.table}`);
  lines.push("");
  lines.push("*Itens:*");
  for (const it of order.items) {
    lines.push(`• ${it.qty}x ${it.name} — ${brl(it.unitPrice * it.qty)}`);
    const sizes: string[] = [];
    const flavors: string[] = [];
    const groups: Record<string, string[]> = {};
    const extras: string[] = [];
    for (const a of it.addons ?? []) {
      const p = parseAddonLabel(a.name);
      const suffix = Number(a.price) > 0 ? ` (+${brl(a.price)})` : "";
      if (p.kind === "size") sizes.push(p.label);
      else if (p.kind === "flavor") flavors.push(p.label);
      else if (p.kind === "group" && p.groupName) (groups[p.groupName] ||= []).push(p.label + suffix);
      else extras.push(p.label + suffix);
    }
    if (sizes.length) lines.push(`   _Tamanho:_ ${sizes.join(", ")}`);
    if (flavors.length) lines.push(`   _Sabores:_ ${flavors.join(" + ")}`);
    for (const [g, opts] of Object.entries(groups)) lines.push(`   _${g}:_ ${opts.join(", ")}`);
    if (extras.length) lines.push(`   _Adicionais:_ ${extras.join(", ")}`);
    if (it.note) lines.push(`   _Obs:_ ${it.note}`);
  }
  lines.push("");
  lines.push(`Subtotal: ${brl(order.subtotal)}`);
  if (order.deliveryFee > 0) lines.push(`Entrega: ${brl(order.deliveryFee)}`);
  lines.push(`*Total: ${brl(order.total)}*`);
  lines.push(`Pagamento: ${order.payment}`);
  if (order.note) {
    lines.push("");
    lines.push(`Observação geral: ${order.note}`);
  }
  return lines.join("\n");
}
