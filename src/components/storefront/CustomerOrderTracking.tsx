import { useCustomerOrder } from "@/hooks/useCustomerOrder";
import { useQuery } from "@tanstack/react-query";
import { getTenantBySlug } from "@/lib/catalog.functions";
import { dbTenantToUi } from "@/lib/db-adapters";
import { brl } from "@/lib/format";
import { OrderStatusTimeline } from "../orders/OrderStatusTimeline";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, ArrowLeft, ShoppingBag, MapPin, Utensils, Clock, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { whatsappLink } from "@/lib/whatsapp";
import { OrderStatusBadge, PaymentStatusBadge } from "../orders/OrderStatusBadge";
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

  const isCancelled = order.status === "cancelado";

  return (
    <div className="min-h-screen bg-muted/10 pb-12">
      <div className="gradient-brand text-primary-foreground py-6 px-4 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg font-bold">
              {tenant.logoLetter}
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-wide uppercase">{tenant.name}</h2>
              <p className="text-xs opacity-80">Acompanhamento do Pedido</p>
            </div>
          </div>
          <Badge variant="outline" className="border-white/30 text-white font-bold text-xs uppercase px-2.5 py-0.5">
            #{order.number}
          </Badge>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-6 space-y-5">
        <Card className="overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                  Status Atual
                </span>
                <h3 className="font-extrabold text-lg mt-0.5 text-foreground">
                  {isCancelled ? "Pedido Cancelado" : "Pedido em Processamento"}
                </h3>
              </div>
              <OrderStatusBadge status={order.status} className="text-sm px-3 py-1 font-bold" />
            </div>

            <div className="border-t pt-4">
              <OrderStatusTimeline order={order} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5 border-b pb-2">
              <ShoppingBag className="h-4 w-4" /> Detalhes do seu pedido
            </h3>

            <div className="divide-y text-sm">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex justify-between">
                    <span className="font-semibold text-foreground">
                      {item.qty}x {item.name}
                    </span>
                    <span className="font-medium text-muted-foreground">
                      {brl(item.unitPrice * item.qty)}
                    </span>
                  </div>
                  {item.addons && item.addons.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 pl-3">
                      Adicionais: {item.addons.map((a) => a.name).join(", ")}
                    </p>
                  )}
                  {item.note && (
                    <p className="text-xs text-amber-600 dark:text-amber-500 italic mt-1 pl-3">
                      Obs: {item.note}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t pt-3 text-xs space-y-2 text-muted-foreground">
              {order.mode === "entrega" && order.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground block">Endereço de Entrega:</span>
                    <span>
                      {order.address.street}, {order.address.number}
                      {order.address.complement ? ` — ${order.address.complement}` : ""}
                      <br />
                      {order.address.neighborhood}
                    </span>
                  </div>
                </div>
              )}

              {order.mode === "consumo_local" && order.table && (
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Utensils className="h-4 w-4 shrink-0" />
                  <span>Consumo Local na {order.table}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1 border-t border-dashed">
                <Clock className="h-3.5 w-3.5" />
                <span>Forma de Pagamento: <strong className="text-foreground uppercase">{order.payment}</strong></span>
                <PaymentStatusBadge status={order.paymentStatus} className="text-[10px] py-0 px-1" />
              </div>
            </div>

            <div className="border-t pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{brl(order.subtotal)}</span>
              </div>
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Taxa de Entrega</span>
                  <span>{brl(order.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-dashed pt-2">
                <span>Total Pago</span>
                <span className="text-primary">{brl(order.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {(["saiu_entrega", "pronto_retirada", "servido", "finalizado"] as const).includes(order.status as never) && (
          <OrderRatingCard orderId={order.id} />
        )}

        <div className="space-y-2">
          <Button asChild className="h-12 w-full bg-success hover:bg-success/90 text-success-foreground font-semibold">
            <a
              href={whatsappLink(
                tenant.whatsapp,
                `Olá, equipe ${tenant.name}! Tenho uma dúvida sobre o meu pedido #${order.number}.`
              )}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="mr-2 h-5 w-5" /> Falar com o estabelecimento
            </a>
          </Button>

          <Button asChild variant="outline" className="w-full h-11">
            <Link to="/$slug" params={{ slug }}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Cardápio
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
