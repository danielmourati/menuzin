import { Button } from "@/components/ui/button";
import { nextStatuses, statusLabel } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/mock-data";
import { Check, Flame, Truck, PackageCheck, Coffee, Award, XCircle } from "lucide-react";

interface OrderStatusActionsProps {
  order: Order;
  onUpdateStatus: (status: OrderStatus) => void;
  onCancel: () => void;
  className?: string;
  size?: "default" | "sm" | "lg";
}

export function OrderStatusActions({
  order,
  onUpdateStatus,
  onCancel,
  className = "",
  size = "default",
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
        return "Iniciar Preparo";
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
              className="flex-1 sm:flex-initial"
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
