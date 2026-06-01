import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brl, modeLabel, timeAgo } from "@/lib/format";
import type { Order } from "@/lib/mock-data";
import { OrderStatusBadge, PaymentStatusBadge } from "./OrderStatusBadge";
import { OrderStatusActions } from "./OrderStatusActions";
import { PrintOrderButton } from "./PrintOrderButton";
import { Eye, Clock, MapPin, MessageCircle, Utensils } from "lucide-react";
import { whatsappLink } from "@/lib/whatsapp";

interface OrderCardProps {
  order: Order;
  onViewDetails: () => void;
  onAccept: () => void;
  onCancel: () => void;
  onUpdateStatus: (status: any) => void;
}

export function OrderCard({
  order,
  onViewDetails,
  onAccept,
  onCancel,
  onUpdateStatus,
}: OrderCardProps) {
  const [elapsed, setElapsed] = useState(() => timeAgo(order.createdAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(timeAgo(order.createdAt));
    }, 15000); // atualiza a cada 15 segundos

    return () => clearInterval(interval);
  }, [order.createdAt]);

  const isNew = order.status === "novo";

  return (
    <Card
      className={`group relative overflow-hidden transition-all duration-300 hover:shadow-md border-l-4 ${
        isNew
          ? "border-l-primary border-primary/40 shadow-sm animate-none ring-1 ring-primary/20"
          : "border-l-zinc-300 dark:border-l-zinc-700"
      }`}
    >
      {/* Indicador pulsante para novos pedidos */}
      {isNew && (
        <span className="absolute top-0 right-0 flex h-2 w-2 m-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
        </span>
      )}

      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          {/* Top Line */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-foreground">
                #{order.number}
              </span>
              <Badge variant="outline" className="font-medium text-xs">
                {modeLabel[order.mode]}
              </Badge>
              <OrderStatusBadge status={order.status} />
            </div>
            
            <div className="flex items-center text-xs text-muted-foreground font-medium gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{elapsed}</span>
            </div>
          </div>

          {/* Customer and Details */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-start">
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">
                {order.customerName}
              </h3>
              
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{order.whatsapp}</span>
                {order.mode === "entrega" && order.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="line-clamp-1">
                      {order.address.street}, {order.address.number} — {order.address.neighborhood}
                    </span>
                  </span>
                )}
                {order.mode === "consumo_local" && order.table && (
                  <span className="flex items-center gap-1 font-semibold text-primary">
                    <Utensils className="h-3 w-3 shrink-0" />
                    <span>{order.table}</span>
                  </span>
                )}
              </div>

              {/* Items List Summary */}
              <p className="text-xs text-muted-foreground pt-1.5 line-clamp-2">
                <span className="font-semibold text-foreground/80">Itens:</span>{" "}
                {order.items.map((i) => `${i.qty}x ${i.name}`).join(" · ")}
              </p>
            </div>

            {/* Price & Payment */}
            <div className="md:text-right shrink-0">
              <div className="font-bold text-lg text-foreground">
                {brl(order.total)}
              </div>
              <div className="flex flex-wrap md:justify-end items-center gap-1.5 mt-0.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {order.payment}
                </span>
                <PaymentStatusBadge status={order.paymentStatus} className="text-[10px] px-1 py-0" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between border-t pt-3.5 gap-2 mt-1">
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={onViewDetails}
                className="h-9 px-3"
              >
                <Eye className="h-4 w-4 mr-1.5" />
                Detalhes
              </Button>

              <PrintOrderButton order={order} size="sm" />

              <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-success hover:bg-success/10 hover:text-success"
              >
                <a
                  href={whatsappLink(
                    order.whatsapp,
                    `Olá ${order.customerName}, sobre seu pedido #${order.number} na Burger Prime...`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  title="Falar no WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              </Button>
            </div>

            {/* Flow actions */}
            <OrderStatusActions
              order={order}
              onUpdateStatus={onUpdateStatus}
              onCancel={onCancel}
              size="sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
