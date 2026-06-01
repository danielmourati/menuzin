import type { Order, OrderStatus } from "@/lib/mock-data";
import { OrderCard } from "./OrderCard";
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
    colorClass: "bg-red-500/5 border border-zinc-200 dark:border-zinc-800 border-l-4 border-l-primary dark:bg-red-950/5",
    badgeClass: "bg-primary text-primary-foreground font-bold",
  },
  {
    id: "aceito",
    title: "Aceitos",
    statuses: ["aceito"],
    colorClass: "bg-amber-500/5 border border-zinc-200 dark:border-zinc-800 border-l-4 border-l-amber-500 dark:bg-amber-950/5",
    badgeClass: "bg-amber-500 text-white font-bold",
  },
  {
    id: "preparo",
    title: "Em Preparo",
    statuses: ["preparo"],
    colorClass: "bg-blue-500/5 border border-zinc-200 dark:border-zinc-800 border-l-4 border-l-blue-500 dark:bg-blue-950/5",
    badgeClass: "bg-blue-500 text-white font-bold",
  },
  {
    id: "despachado",
    title: "Prontos / Despachados",
    statuses: ["pronto_retirada", "saiu_entrega", "servido"],
    colorClass: "bg-green-500/5 border border-zinc-200 dark:border-zinc-800 border-l-4 border-l-success dark:bg-green-950/5",
    badgeClass: "bg-success text-success-foreground font-bold",
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
    <div className="space-y-6">
      {COLUMNS.map((col) => {
        const colOrders = activeOrders.filter((o) => col.statuses.includes(o.status));

        return (
          <div
            key={col.id}
            className={`rounded-2xl p-5 transition-all duration-300 shadow-sm flex flex-col gap-4 ${col.colorClass}`}
          >
            {/* Header da Linha */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200/50 dark:border-zinc-800/50">
              <h3 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${
                  col.id === "novo" 
                    ? "bg-primary" 
                    : col.id === "aceito" 
                    ? "bg-amber-500" 
                    : col.id === "preparo" 
                    ? "bg-blue-500" 
                    : "bg-success"
                }`} />
                {col.title}
                <Badge className={`rounded-full px-2 py-0.5 text-xs ${col.badgeClass}`}>
                  {colOrders.length}
                </Badge>
              </h3>
            </div>

            {/* Grid de Cards na Linha */}
            {colOrders.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-zinc-300/60 dark:border-zinc-700/60 rounded-xl bg-card/40 flex flex-col sm:flex-row items-center justify-center gap-2">
                <span className="text-xl">💤</span>
                <p className="text-xs text-muted-foreground font-semibold">
                  Sem pedidos nesta etapa no momento.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {colOrders.map((order) => (
                  <div
                    key={order.id}
                    className="hover:translate-x-0.5 transition-transform duration-150"
                  >
                    <OrderCard
                      order={order}
                      onViewDetails={() => onViewDetails(order)}
                      onAccept={() => onAccept(order.id)}
                      onCancel={() => onCancel(order)}
                      onUpdateStatus={(status) => onUpdateStatus(order.id, status)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
