import { toast } from "sonner";
import { brl } from "@/lib/format";
import type { Order } from "@/lib/domain-types";
import { ShoppingBag, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NewOrderToastProps {
  order: Order;
  toastId: string | number;
  onView: () => void;
  onAccept: () => void;
}

export function NewOrderToast({ order, toastId, onView, onAccept }: NewOrderToastProps) {
  const handleView = () => {
    toast.dismiss(toastId);
    onView();
  };

  const handleAccept = () => {
    toast.dismiss(toastId);
    onAccept();
  };

  return (
    <div className="w-full max-w-sm bg-card border border-primary/20 dark:border-primary/30 rounded-xl shadow-lg p-4 flex flex-col gap-3.5 relative overflow-hidden pointer-events-auto">
      {/* Top flashing line for premium alert styling */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-primary animate-pulse" />

      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <ShoppingBag className="h-5 w-5 text-primary animate-bounce" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-foreground flex items-center justify-between">
            Novo Pedido Recebido!
            <button
              onClick={() => toast.dismiss(toastId)}
              className="text-muted-foreground hover:text-foreground shrink-0 p-0.5 rounded-md hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Pedido #{order.number} · {order.customerName}
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-sm font-extrabold text-foreground">
              {brl(order.total)}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
              ({order.payment})
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t pt-3">
        <Button
          onClick={handleView}
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs font-semibold"
        >
          Ver Pedido
        </Button>
        <Button
          onClick={handleAccept}
          variant="default"
          size="sm"
          className="flex-1 h-8 text-xs font-semibold bg-success hover:bg-success/90 text-success-foreground"
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          Aceitar
        </Button>
      </div>
    </div>
  );
}

// Helper para disparar este toast customizado facilmente
export function showNewOrderToast(order: Order, onView: () => void, onAccept: () => void) {
  toast.custom(
    (t) => (
      <NewOrderToast
        order={order}
        toastId={t}
        onView={onView}
        onAccept={onAccept}
      />
    ),
    {
      duration: 15000, // fica por 15 segundos na tela
      position: "top-right",
    }
  );
}
