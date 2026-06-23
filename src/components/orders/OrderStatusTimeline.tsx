import {
  getTimelineSteps,
  getCustomerTimelineSteps,
  getTimelineIndex,
  formatTime,
} from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/domain-types";
import {
  Clock,
  Inbox,
  CheckCircle2,
  ChefHat,
  Flame,
  Bike,
  PackageCheck,
  Utensils,
  Award,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface OrderStatusTimelineProps {
  order: Order;
  orientation?: "vertical" | "horizontal";
  audience?: "admin" | "customer";
  className?: string;
}

function iconForStep(
  key: OrderStatus,
  state: "done" | "current" | "pending",
): LucideIcon {
  switch (key) {
    case "novo":
      return Inbox;
    case "aceito":
      return CheckCircle2;
    case "preparo":
      return state === "current" ? Flame : ChefHat;
    case "saiu_entrega":
      return Bike;
    case "pronto_retirada":
      return PackageCheck;
    case "servido":
      return Utensils;
    case "finalizado":
      return Award;
    default:
      return Clock;
  }
}

function useSteps(order: Order, audience: "admin" | "customer") {
  const steps =
    audience === "customer"
      ? getCustomerTimelineSteps(order.mode)
      : getTimelineSteps(order.mode);
  const currentIndex = getTimelineIndex(order.mode, order.status, steps);
  return { steps, currentIndex };
}

export function OrderStatusTimeline({
  order,
  orientation = "vertical",
  audience = "admin",
  className = "",
}: OrderStatusTimelineProps) {
  if (orientation === "horizontal") {
    return <HorizontalTimeline order={order} audience={audience} className={className} />;
  }
  return <VerticalTimeline order={order} audience={audience} className={className} />;
}

function VerticalTimeline({
  order,
  audience,
  className,
}: { order: Order; audience: "admin" | "customer"; className: string }) {
  const { steps, currentIndex } = useSteps(order, audience);
  const isCancelled = order.status === "cancelado";

  return (
    <div className={`space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted ${className}`}>
      {isCancelled && (
        <div className="flex gap-4 relative z-10">
          <div className="h-6 w-6 rounded-full bg-destructive flex items-center justify-center text-white shrink-0 shadow-sm">
            <XIcon className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="font-semibold text-destructive">Pedido Cancelado</h4>
            {order.cancelledAt && (
              <p className="text-xs text-muted-foreground mt-0.5">{formatTime(order.cancelledAt)}</p>
            )}
            {order.cancelReason && (
              <p className="text-sm text-muted-foreground mt-1 bg-destructive/5 border border-destructive/10 rounded px-2.5 py-1.5 inline-block">
                Motivo: {order.cancelReason}
              </p>
            )}
          </div>
        </div>
      )}

      {steps.map((step, idx) => {
        const historyEntry = order.statusHistory.find((h) => h.newStatus === step.key);
        const isDone = !isCancelled && idx < currentIndex;
        const isCurrent = !isCancelled && idx === currentIndex;
        const isPending = isCancelled || idx > currentIndex;
        const state = isDone ? "done" : isCurrent ? "current" : "pending";
        const Icon = iconForStep(step.key, state);

        let iconBg = "bg-muted border border-border";
        let iconColor = "text-muted-foreground";
        if (isDone) {
          iconBg = "bg-success border-none shadow-sm";
          iconColor = "text-white";
        } else if (isCurrent) {
          iconBg = "bg-primary border-none shadow-md ring-4 ring-primary/20";
          iconColor = "text-white";
        }

        return (
          <div key={step.key} className="flex gap-4 relative z-10">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${iconBg}`}>
              <Icon className={`h-3.5 w-3.5 ${iconColor} ${isCurrent ? "animate-pulse" : ""}`} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className={`text-sm font-semibold transition-colors duration-300 ${isCurrent ? "text-primary" : isPending ? "text-muted-foreground" : "text-foreground"}`}>
                  {step.label}
                </h4>
                {historyEntry && (
                  <span className="text-xs text-muted-foreground shrink-0">{formatTime(historyEntry.createdAt)}</span>
                )}
              </div>
              {historyEntry?.note && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{historyEntry.note}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HorizontalTimeline({
  order,
  audience,
  className,
}: { order: Order; audience: "admin" | "customer"; className: string }) {
  const { steps, currentIndex } = useSteps(order, audience);
  const isCancelled = order.status === "cancelado";

  return (
    <div className={`w-full ${className}`}>
      {isCancelled && (
        <div className="mb-3 flex items-center gap-2 rounded-md bg-destructive/5 border border-destructive/20 px-3 py-2 text-xs">
          <span className="h-5 w-5 rounded-full bg-destructive flex items-center justify-center text-white">
            <XIcon className="h-3 w-3" />
          </span>
          <span className="font-semibold text-destructive">Pedido cancelado</span>
          {order.cancelReason && <span className="text-muted-foreground truncate">— {order.cancelReason}</span>}
        </div>
      )}
      <div className="w-full overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex items-start gap-1 min-w-max sm:min-w-0 sm:w-full">
          {steps.map((step, idx) => {
            const historyEntry = order.statusHistory.find((h) => h.newStatus === step.key);
            const isDone = !isCancelled && idx < currentIndex;
            const isCurrent = !isCancelled && idx === currentIndex;
            const isLast = idx === steps.length - 1;
            const state = isDone ? "done" : isCurrent ? "current" : "pending";
            const Icon = iconForStep(step.key, state);

            let iconBg = "bg-muted border border-border";
            let iconColor = "text-muted-foreground";
            if (isDone) {
              iconBg = "bg-success border-none shadow-sm";
              iconColor = "text-white";
            } else if (isCurrent) {
              iconBg = "bg-primary border-none ring-4 ring-primary/20 shadow-md";
              iconColor = "text-white";
            }
            const connectorColor = isDone ? "bg-success" : "bg-muted";

            return (
              <div key={step.key} className="flex items-start flex-1 sm:min-w-0">
                <div className="flex flex-col items-center flex-1 min-w-[88px] sm:min-w-0">
                  <div className={`h-11 w-11 rounded-full flex items-center justify-center transition-all ${iconBg}`}>
                    <Icon className={`h-5 w-5 ${iconColor} ${isCurrent ? "animate-pulse" : ""}`} />
                  </div>
                  <span
                    className={`mt-2 text-xs sm:text-sm text-center leading-tight font-semibold px-1 ${
                      isCurrent ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                  {historyEntry && (
                    <span className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      {formatTime(historyEntry.createdAt)}
                    </span>
                  )}
                </div>
                {!isLast && (
                  <div className={`h-1 mt-5 flex-1 min-w-[24px] rounded-full ${connectorColor} transition-colors`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
