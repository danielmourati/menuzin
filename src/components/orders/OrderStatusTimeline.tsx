import { getTimelineSteps, getTimelineIndex, formatTime } from "@/lib/format";
import type { Order } from "@/lib/mock-data";
import { Check, Clock, Play } from "lucide-react";

interface OrderStatusTimelineProps {
  order: Order;
  className?: string;
}

export function OrderStatusTimeline({ order, className = "" }: OrderStatusTimelineProps) {
  const steps = getTimelineSteps(order.mode);
  const currentIndex = getTimelineIndex(order.mode, order.status);
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
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatTime(order.cancelledAt)}
              </p>
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

        let icon = <Clock className="h-3 w-3 text-muted-foreground" />;
        let iconBg = "bg-muted border border-border";

        if (isDone) {
          icon = <Check className="h-3.5 w-3.5 text-white" />;
          iconBg = "bg-success border-none shadow-sm";
        } else if (isCurrent) {
          icon = <Play className="h-3.5 w-3.5 text-white animate-pulse" />;
          iconBg = "bg-primary border-none shadow-md ring-4 ring-primary/20";
        }

        return (
          <div key={step.key} className="flex gap-4 relative z-10">
            <div className={`h-6.5 w-6.5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${iconBg}`}>
              {icon}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className={`text-sm font-semibold transition-colors duration-300 ${isCurrent ? "text-primary" : isPending ? "text-muted-foreground" : "text-foreground"}`}>
                  {step.label}
                </h4>
                {historyEntry && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatTime(historyEntry.createdAt)}
                  </span>
                )}
              </div>
              {historyEntry?.note && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {historyEntry.note}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
