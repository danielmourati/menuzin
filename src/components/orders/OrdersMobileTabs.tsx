import { useState } from "react";
import type { Order, OrderStatus } from "@/lib/domain-types";
import { OrderCard } from "./OrderCard";
import { OrdersFinalizedList } from "./OrdersFinalizedList";
import { Badge } from "@/components/ui/badge";

interface OrdersMobileTabsProps {
  orders: Order[];
  onViewDetails: (order: Order) => void;
  onAccept: (orderId: string) => void;
  onCancel: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

type TabType = "novo" | "preparo" | "despachado" | "finalizado";

export function OrdersMobileTabs({
  orders,
  onViewDetails,
  onAccept,
  onCancel,
  onUpdateStatus,
}: OrdersMobileTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("novo");

  const byStatus = (statuses: OrderStatus[]) =>
    orders.filter((o) => statuses.includes(o.status));

  const lists: Record<TabType, Order[]> = {
    novo: byStatus(["novo"]),
    preparo: byStatus(["aceito", "preparo"]),
    despachado: byStatus(["pronto_retirada", "saiu_entrega", "servido"]),
    finalizado: byStatus(["finalizado", "cancelado"]),
  };

  const tabs: { id: TabType; label: string; color: string }[] = [
    { id: "novo", label: "Novos", color: "bg-primary" },
    { id: "preparo", label: "Em preparo", color: "bg-blue-500" },
    { id: "despachado", label: "Prontos", color: "bg-success" },
    { id: "finalizado", label: "Finalizados", color: "bg-zinc-500" },
  ];

  const filtered = lists[activeTab];

  return (
    <div className="flex flex-col gap-4 md:hidden">
      {/* Abas Horizontais com Scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 shrink-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = lists[tab.id].length;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold border shrink-0 transition-all duration-200 ${
                isActive
                  ? "bg-card text-foreground border-zinc-900 shadow-sm dark:border-zinc-100"
                  : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/70"
              }`}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <Badge
                  className={`rounded-full px-1.5 py-0 h-4.5 min-w-4.5 flex items-center justify-center text-[10px] ${tab.color} text-white border-none`}
                >
                  {count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Conteúdo da aba */}
      <div className="space-y-3 pb-8">
        {activeTab === "finalizado" ? (
          filtered.length === 0 ? (
            <div className="py-12 text-center border border-dashed rounded-xl bg-card/50 text-muted-foreground">
              <p className="font-semibold text-sm">Nenhum pedido finalizado ainda.</p>
            </div>
          ) : (
            <OrdersFinalizedList orders={filtered} onViewDetails={onViewDetails} />
          )
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center border border-dashed rounded-xl bg-card/50 text-muted-foreground flex flex-col items-center justify-center">
            <span className="text-3xl mb-2">🎈</span>
            <p className="font-semibold text-sm">Sem pedidos nesta aba</p>
            <p className="text-xs text-muted-foreground mt-0.5">Nenhum pedido ativo corresponde a este filtro.</p>
          </div>
        ) : (
          filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onViewDetails={() => onViewDetails(order)}
              onAccept={() => onAccept(order.id)}
              onCancel={() => onCancel(order)}
              onUpdateStatus={(status) => onUpdateStatus(order.id, status)}
            />
          ))
        )}
      </div>
    </div>
  );
}
