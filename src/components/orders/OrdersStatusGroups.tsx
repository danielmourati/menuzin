import { useState } from "react";
import type { Order, OrderStatus } from "@/lib/domain-types";
import { OrderCard } from "./OrderCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface OrdersStatusGroupsProps {
  orders: Order[];
  onViewDetails: (order: Order) => void;
  onAccept: (orderId: string) => void;
  onCancel: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

type Group = {
  id: string;
  title: string;
  statuses: OrderStatus[];
  dotClass: string;
  badgeClass: string;
  defaultOpen?: boolean;
};

const GROUPS: Group[] = [
  { id: "novo", title: "Novos pedidos", statuses: ["novo"], dotClass: "bg-primary", badgeClass: "bg-primary text-primary-foreground", defaultOpen: true },
  { id: "aceito", title: "Pedidos lidos / aceitos", statuses: ["aceito"], dotClass: "bg-amber-500", badgeClass: "bg-amber-500 text-white", defaultOpen: true },
  { id: "preparo", title: "Em preparo", statuses: ["preparo"], dotClass: "bg-blue-500", badgeClass: "bg-blue-500 text-white", defaultOpen: true },
  { id: "prontos", title: "Prontos / Despachados", statuses: ["pronto_retirada", "saiu_entrega", "servido"], dotClass: "bg-emerald-500", badgeClass: "bg-success text-success-foreground", defaultOpen: true },
  { id: "arquivados", title: "Finalizados / Cancelados", statuses: ["finalizado", "cancelado"], dotClass: "bg-zinc-400", badgeClass: "bg-muted text-muted-foreground", defaultOpen: false },
];

export function OrdersStatusGroups({ orders, onViewDetails, onAccept, onCancel, onUpdateStatus }: OrdersStatusGroupsProps) {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GROUPS.map((g) => [g.id, g.defaultOpen ?? true])),
  );
  const toggle = (id: string) => setOpenMap((m) => ({ ...m, [id]: !m[id] }));

  return (
    <div className="space-y-6">
      {GROUPS.map((g) => {
        const list = orders.filter((o) => g.statuses.includes(o.status));
        if (g.id === "arquivados" && list.length === 0) return null;
        const open = openMap[g.id];

        return (
          <section key={g.id}>
            <button
              type="button"
              onClick={() => toggle(g.id)}
              className="w-full flex items-center justify-between py-2 group"
            >
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${g.dotClass}`} />
                <h3 className="font-bold text-sm text-foreground">{g.title}</h3>
                <Badge className={`rounded-full px-2 py-0 text-[10px] ${g.badgeClass}`}>{list.length}</Badge>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" asChild>
                <span>{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
              </Button>
            </button>

            {open && (
              list.length === 0 ? (
                <div className="py-6 text-center border border-dashed border-zinc-300/60 dark:border-zinc-700/60 rounded-xl bg-card/40">
                  <p className="text-xs text-muted-foreground font-medium">Sem pedidos nesta etapa.</p>
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
    </div>
  );
}
