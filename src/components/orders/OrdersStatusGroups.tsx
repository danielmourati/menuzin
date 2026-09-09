import { useState } from "react";
import type { Order, OrderStatus } from "@/lib/domain-types";
import { OrderCard } from "./OrderCard";
import { OrdersFinalizedList } from "./OrdersFinalizedList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Zap } from "lucide-react";

interface OrdersStatusGroupsProps {
  orders: Order[];
  onViewDetails: (order: Order) => void;
  onAccept: (orderId: string) => void;
  onCancel: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  autoAcceptEnabled?: boolean;
}

type Group = {
  id: string;
  title: string;
  statuses: OrderStatus[];
  dotClass: string;
  badgeClass: string;
  defaultOpen?: boolean;
};

// Fluxo simplificado: 3 colunas ativas (Novos · Em preparo · Prontos)
// + lista de Finalizados/Cancelados separada.
const GROUPS: Group[] = [
  { id: "novo", title: "Novos pedidos", statuses: ["novo"], dotClass: "bg-primary", badgeClass: "bg-primary text-primary-foreground", defaultOpen: true },
  { id: "preparo", title: "Em preparo", statuses: ["aceito", "preparo"], dotClass: "bg-blue-500", badgeClass: "bg-blue-500 text-white", defaultOpen: true },
  { id: "prontos", title: "Prontos / Despachados", statuses: ["pronto_retirada", "saiu_entrega", "servido"], dotClass: "bg-emerald-500", badgeClass: "bg-emerald-600 text-white", defaultOpen: true },
];

export function OrdersStatusGroups({
  orders,
  onViewDetails,
  onAccept,
  onCancel,
  onUpdateStatus,
  autoAcceptEnabled = false,
}: OrdersStatusGroupsProps) {
  const newOrdersCount = orders.filter((o) => o.status === "novo").length;

  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => ({
    novo: autoAcceptEnabled && newOrdersCount === 0 ? false : true,
    preparo: true,
    prontos: true,
  }));

  const toggle = (id: string) => setOpenMap((m) => ({ ...m, [id]: !m[id] }));
  const finalizedOrders = orders.filter((o) => o.status === "finalizado" || o.status === "cancelado");

  return (
    <div className="space-y-6">
      {GROUPS.map((g) => {
        const list = orders.filter((o) => g.statuses.includes(o.status));
        const open = openMap[g.id];
        const isNovoGroup = g.id === "novo";
        const hasPendingNew = isNovoGroup && list.length > 0;

        // Visual distinction:
        // Only use alert color when items actually require action.
        // When zero items, use calm neutral badge/dot so 0 doesn't look like an orange alert.
        const dotStyle = isNovoGroup
          ? hasPendingNew
            ? "bg-primary animate-pulse shadow-xs"
            : "bg-muted-foreground/30"
          : list.length > 0
            ? g.dotClass
            : "bg-muted-foreground/30";

        const badgeStyle = isNovoGroup
          ? hasPendingNew
            ? "bg-primary text-primary-foreground font-bold shadow-xs animate-bounce"
            : "bg-muted/80 text-muted-foreground font-normal border border-border/40"
          : list.length > 0
            ? g.badgeClass
            : "bg-muted/80 text-muted-foreground font-normal border border-border/40";

        return (
          <section key={g.id} className="transition-all">
            <button
              type="button"
              onClick={() => toggle(g.id)}
              className="w-full flex items-center justify-between py-2 group text-left"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`h-2.5 w-2.5 rounded-full transition-colors ${dotStyle}`} />
                <h3 className="font-bold text-sm text-foreground">{g.title}</h3>
                <Badge className={`rounded-full px-2 py-0 text-[10px] transition-colors ${badgeStyle}`}>
                  {list.length}
                </Badge>
                {isNovoGroup && autoAcceptEnabled && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    <Zap className="h-3 w-3 fill-amber-500 text-amber-500" />
                    Aceite automático ativo
                  </span>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" asChild>
                <span>{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
              </Button>
            </button>

            {open && (
              list.length === 0 ? (
                <div className="py-5 text-center border border-dashed border-border/60 rounded-xl bg-card/40 px-4">
                  {isNovoGroup && autoAcceptEnabled ? (
                    <p className="text-xs text-muted-foreground font-medium flex items-center justify-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      <span>
                        Aceite automático ativo — novos pedidos entram direto em <strong>"Em preparo"</strong> e são enviados para a cozinha.
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground font-medium">Sem pedidos nesta etapa.</p>
                  )}
                </div>
              ) : (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {list.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onViewDetails={() => onViewDetails(order)}
                      onAccept={() => onAccept(order.id)}
                      onCancel={() => onCancel(order)}
                      onUpdateStatus={(status) => onUpdateStatus(order.id, status)}
                    />
                  ))}
                </div>
              )
            )}
          </section>
        );
      })}

      <OrdersFinalizedList orders={finalizedOrders} onViewDetails={onViewDetails} />
    </div>
  );
}
