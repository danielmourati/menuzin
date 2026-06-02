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

  const waMessage = `Olá ${tenant.name}! Acabei de fazer o pedido #${order.number}.`;

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
            <div className="mt-3 space-y-1 text-sm">
              {order.items.map((i, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{i.qty}x {i.name}</span>
                  <span className="text-muted-foreground">{brl(i.unitPrice * i.qty)}</span>
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
