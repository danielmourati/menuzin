import type { Order, OrderStatus } from "@/lib/mock-data";
import { OrderCard } from "./OrderCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OrdersKanbanBoardProps {
  orders: Order[];
  onViewDetails: (order: Order) => void;
  onAccept: (orderId: string) => void;
  onCancel: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

interface Column {
  id: string;
  title: string;
  statuses: OrderStatus[];
  colorClass: string;
  badgeClass: string;
}

const COLUMNS: Column[] = [
  {
    id: "novo",
    title: "Novos",
    statuses: ["novo"],
    colorClass: "bg-red-500/5 border-t-2 border-t-primary dark:bg-red-950/5",
    badgeClass: "bg-primary text-primary-foreground",
  },
  {
    id: "aceito",
    title: "Aceitos",
    statuses: ["aceito"],
    colorClass: "bg-amber-500/5 border-t-2 border-t-amber-500 dark:bg-amber-950/5",
    badgeClass: "bg-amber-500 text-white",
  },
  {
    id: "preparo",
    title: "Em Preparo",
    statuses: ["preparo"],
    colorClass: "bg-blue-500/5 border-t-2 border-t-blue-500 dark:bg-blue-950/5",
    badgeClass: "bg-blue-500 text-white",
  },
  {
    id: "despachado",
    title: "Prontos / Despachados",
    statuses: ["pronto_retirada", "saiu_entrega", "servido"],
    colorClass: "bg-green-500/5 border-t-2 border-t-success dark:bg-green-950/5",
    badgeClass: "bg-success text-success-foreground",
  },
];

export function OrdersKanbanBoard({
  orders,
  onViewDetails,
  onAccept,
  onCancel,
  onUpdateStatus,
}: OrdersKanbanBoardProps) {
  // Filtra apenas pedidos ativos (não finalizados nem cancelados)
  const activeOrders = orders.filter(
    (o) => o.status !== "finalizado" && o.status !== "cancelado"
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[calc(100vh-210px)] min-h-[450px]">
      {COLUMNS.map((col) => {
        const colOrders = activeOrders.filter((o) => col.statuses.includes(o.status));

        return (
          <div
            key={col.id}
            className={`rounded-xl border flex flex-col h-full overflow-hidden ${col.colorClass}`}
          >
            {/* Header da Coluna */}
            <div className="p-4 flex items-center justify-between bg-card border-b shrink-0">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                {col.title}
                <Badge className={`rounded-full px-2 py-0.5 text-xs ${col.badgeClass}`}>
                  {colOrders.length}
                </Badge>
              </h3>
            </div>

            {/* Lista de Cards com Scroll Interno */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
              {colOrders.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-muted rounded-xl bg-card/40">
                  <span className="text-2xl">💤</span>
                  <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                    Sem pedidos nesta etapa
                  </p>
                </div>
              ) : (
                colOrders.map((order) => (
                  <div
                    key={order.id}
                    className="cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-transform duration-200"
                  >
                    <OrderCard
                      order={order}
                      onViewDetails={() => onViewDetails(order)}
                      onAccept={() => onAccept(order.id)}
                      onCancel={() => onCancel(order)}
                      onUpdateStatus={(status) => onUpdateStatus(order.id, status)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
