import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { listCustomerOrders } from "@/lib/customers.functions";
import { useCustomerProfile } from "@/lib/customer-profile";
import { brl } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { Loader2, Receipt, ArrowRight, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  aceito: "Aceito",
  preparo: "Em preparo",
  saiu_entrega: "Saiu para entrega",
  pronto_retirada: "Pronto para retirada",
  servido: "Servido",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
  mal_sucedido: "Não finalizado",
};

export function StorefrontOrdersDrawer({
  open,
  onOpenChange,
  slug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
}) {
  const profile = useCustomerProfile();

  const canQuery = !!profile?.phone && !!profile?.token && open;
  const { data, isLoading } = useQuery({
    queryKey: ["customer-orders", profile?.phone],
    queryFn: () =>
      listCustomerOrders({ data: { phone: profile!.phone, token: profile!.token } }),
    enabled: canQuery,
  });

  const orders = (data?.orders ?? []).filter((o) => o.tenant_slug === slug);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto px-4 pb-8 pt-4 sm:max-w-md mx-auto">
        <SheetHeader className="mb-4 text-left">
          <SheetTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Seus Pedidos
          </SheetTitle>
        </SheetHeader>

        {!profile?.phone ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Receipt className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">Nenhum pedido encontrado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Você ainda não fez nenhum pedido nesta loja.
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Store className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">Nenhum pedido encontrado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Você ainda não fez pedidos nesta loja.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => {
              const isFinal = ["finalizado", "cancelado", "mal_sucedido"].includes(o.status);
              return (
                <Link
                  key={o.id}
                  to="/$slug/acompanhar/$orderId"
                  params={{ slug, orderId: o.id }}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm transition hover:bg-muted/50"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">Pedido #{o.number}</span>
                      <Badge variant={isFinal ? "secondary" : "default"} className="text-[10px]">
                        {STATUS_LABEL[o.status] ?? o.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-sm font-medium">{brl(o.total)}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
