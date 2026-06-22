import { useState } from "react";
import type { Order } from "@/lib/domain-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brl, modeLabel, formatTime } from "@/lib/format";
import { Eye, ChevronDown, ChevronUp, CheckCircle2, XCircle, ChefHat } from "lucide-react";
import { PrintKitchenButton } from "./PrintKitchenButton";

interface OrdersFinalizedListProps {
  orders: Order[];
  onViewDetails: (order: Order) => void;
}

export function OrdersFinalizedList({ orders, onViewDetails }: OrdersFinalizedListProps) {
  const [open, setOpen] = useState(false);
  if (orders.length === 0) return null;

  // Mais recentes primeiro
  const sorted = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-2 group"
      >
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-400" />
          <h3 className="font-bold text-sm text-foreground">Finalizados / Cancelados</h3>
          <Badge className="rounded-full px-2 py-0 text-[10px] bg-muted text-muted-foreground">
            {orders.length}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" asChild>
          <span>{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
        </Button>
      </button>

      {open && (
        <div className="border border-border rounded-xl overflow-hidden divide-y bg-card">
          {sorted.map((order) => {
            const cancelled = order.status === "cancelado";
            return (
              <div
                key={order.id}
                className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
              >
                {cancelled ? (
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                )}
                <span className="font-bold text-foreground w-14 shrink-0">#{order.number}</span>
                <span className="font-medium text-foreground truncate flex-1 min-w-0" title={order.customerName}>
                  {order.customerName || "Sem nome"}
                </span>
                <span className="hidden sm:inline-block text-xs text-muted-foreground shrink-0 w-24 truncate">
                  {modeLabel[order.mode]}
                </span>
                <span className="hidden md:inline-block text-xs text-muted-foreground shrink-0 w-14">
                  {formatTime(order.createdAt)}
                </span>
                <span className="font-semibold text-primary shrink-0 w-20 text-right">
                  {brl(order.total)}
                </span>
                <PrintKitchenButton
                  order={order}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(order)}
                  className="h-8 px-2 text-xs shrink-0"
                >
                  <Eye className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Visualizar</span>
                </Button>
              </div>
            );
          })}
          {/* Indica que o ícone de cozinha é reimpressão */}
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground bg-muted/30 flex items-center gap-1">
            <ChefHat className="h-3 w-3" /> Clique no chapéu para reimprimir a comanda da cozinha.
          </div>
        </div>
      )}
    </section>
  );
}
