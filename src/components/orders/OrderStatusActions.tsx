import { Button } from "@/components/ui/button";
import { nextStatuses, statusLabel } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/domain-types";
import { Check, Flame, Truck, PackageCheck, Coffee, Award, XCircle } from "lucide-react";

interface OrderStatusActionsProps {
  order: Order;
  onUpdateStatus: (status: OrderStatus) => void;
  onCancel: () => void;
  className?: string;
  size?: "default" | "sm" | "lg";
  compact?: boolean; // Icon-only mode for row/bar layouts
}

export function OrderStatusActions({
  order,
  onUpdateStatus,
  onCancel,
  className = "",
  size = "default",
  compact = false,
}: OrderStatusActionsProps) {
  const next = nextStatuses(order.mode, order.status);

  if (next.length === 0) return null;

  const getStatusButtonIcon = (status: OrderStatus) => {
    switch (status) {
      case "aceito":
        return <Check className="h-4 w-4 mr-1.5" />;
      case "preparo":
        return <Flame className="h-4 w-4 mr-1.5" />;
      case "saiu_entrega":
        return <Truck className="h-4 w-4 mr-1.5" />;
      case "pronto_retirada":
        return <PackageCheck className="h-4 w-4 mr-1.5" />;
      case "servido":
        return <Coffee className="h-4 w-4 mr-1.5" />;
      case "finalizado":
        return <Award className="h-4 w-4 mr-1.5" />;
      case "cancelado":
        return <XCircle className="h-4 w-4 mr-1.5" />;
      default:
        return null;
    }
  };

  const getStatusButtonLabel = (status: OrderStatus) => {
    switch (status) {
      case "aceito":
        return "Aceitar Pedido";
      case "preparo":
        // Quando vier de "novo", o botão representa "Aceitar Pedido"
        // (fluxo simplificado: aceitar já inicia o preparo).
        return order.status === "novo" ? "Aceitar Pedido" : "Iniciar Preparo";
      case "saiu_entrega":
        return "Saiu para Entrega";
      case "pronto_retirada":
        return "Pronto para Retirada";
      case "servido":
        return "Servir na Mesa";
      case "finalizado":
        return "Finalizar Pedido";
      default:
        return statusLabel[status] || status;
    }
  };

  const getStatusButtonVariant = (status: OrderStatus) => {
    switch (status) {
      case "aceito":
        return "success";
      case "preparo":
        return "warning";
      case "saiu_entrega":
        return "info";
      case "pronto_retirada":
        return "success";
      case "servido":
        return "success";
      case "finalizado":
        return "default";
      default:
        return "outline";
    }
  };

  const isNew = order.status === "novo";

  // ── Compact (icon-only row) mode ──────────────────────────────────────────
  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {next.map((status) => {
          if (status === "cancelado") {
            return (
              <Button
                key={status}
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onCancel(); }}
                className="h-8 px-2.5 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground text-xs font-semibold"
              >
                {isNew ? "Recusar" : "Cancelar"}
              </Button>
            );
          }

          const variant = getStatusButtonVariant(status);
          let btnClass = "h-8 px-2.5 text-xs font-semibold ";
          if (variant === "success") {
            btnClass += "bg-success hover:bg-success/90 text-success-foreground";
          } else if (variant === "warning") {
            btnClass += "bg-warning hover:bg-warning/90 text-warning-foreground";
          } else if (variant === "info") {
            btnClass += "bg-blue-600 hover:bg-blue-700 text-white";
          }

          return (
            <Button
              key={status}
              variant={variant === "success" || variant === "warning" || variant === "info" ? "default" : variant}
              size="sm"
              className={btnClass}
              title={getStatusButtonLabel(status)}
              onClick={(e) => { e.stopPropagation(); onUpdateStatus(status); }}
            >
              {getStatusButtonIcon(status)}
              <span className="hidden sm:inline">{getStatusButtonLabel(status)}</span>
            </Button>
          );
        })}
      </div>
    );
  }

  // ── Full mode (default card layout) ──────────────────────────────────────
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {next.map((status) => {
        if (status === "cancelado") {
          return (
            <Button
              key={status}
              variant="outline"
              size={size}
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              className="flex-1 sm:flex-initial border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              {isNew ? "Recusar" : "Cancelar"}
            </Button>
          );
        }

        const variant = getStatusButtonVariant(status);
        
        // Custom color classes for custom variants like success, warning, info
        let btnClass = "flex-1 sm:flex-initial ";
        if (variant === "success") {
          btnClass += "bg-success hover:bg-success/90 text-success-foreground font-semibold";
        } else if (variant === "warning") {
          btnClass += "bg-warning hover:bg-warning/90 text-warning-foreground font-semibold";
        } else if (variant === "info") {
          btnClass += "bg-blue-600 hover:bg-blue-700 text-white font-semibold";
        }

        return (
          <Button
            key={status}
            variant={variant === "success" || variant === "warning" || variant === "info" ? "default" : variant}
            size={size}
            className={btnClass}
            onClick={(e) => {
              e.stopPropagation();
              onUpdateStatus(status);
            }}
          >
            {getStatusButtonIcon(status)}
            {getStatusButtonLabel(status)}
          </Button>
        );
      })}
    </div>
  );
}
