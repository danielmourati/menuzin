import { Badge } from "@/components/ui/badge";
import { statusLabel, statusColor, paymentStatusLabel, paymentStatusColor } from "@/lib/format";
import type { OrderStatus, PaymentStatus } from "@/lib/domain-types";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className = "" }: OrderStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`font-semibold transition-all duration-300 ${statusColor[status] || ""} ${className}`}
    >
      {statusLabel[status] || status}
    </Badge>
  );
}

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

export function PaymentStatusBadge({ status, className = "" }: PaymentStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`font-semibold transition-all duration-300 ${paymentStatusColor[status] || ""} ${className}`}
    >
      {paymentStatusLabel[status] || status}
    </Badge>
  );
}
