import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brl, modeLabel, timeAgo, formatDateTime } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/domain-types";
import { OrderStatusBadge, PaymentStatusBadge } from "./OrderStatusBadge";
import { PrintOrderButton } from "./PrintOrderButton";
import { PrintKitchenButton } from "./PrintKitchenButton";
import { Clock, MapPin, Utensils, Eye, Check, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getMyTenant } from "@/lib/tenants.functions";
import { useAuth } from "@/lib/auth-context";

interface OrderCardProps {
  order: Order;
  onViewDetails: () => void;
  onAccept: () => void;
  onCancel: () => void;
  onUpdateStatus: (status: OrderStatus) => void;
}

export function OrderCard({
  order,
  onViewDetails,
  onAccept,
  onCancel,
  onUpdateStatus,
}: OrderCardProps) {
  const { isAuthenticated } = useAuth();
  const { data: tenantData } = useQuery({
    queryKey: ["my-tenant"],
    queryFn: () => getMyTenant(),
    staleTime: 60_000,
    enabled: isAuthenticated,
    retry: false,
  });
  const paperWidth = ((tenantData?.tenant as { pos_paper_width?: string } | null)?.pos_paper_width === "55mm" ? "55mm" : "80mm") as "55mm" | "80mm";
  const [elapsed, setElapsed] = useState(() => timeAgo(order.createdAt));

  useEffect(() => {
    const id = setInterval(() => setElapsed(timeAgo(order.createdAt)), 15000);
    return () => clearInterval(id);
  }, [order.createdAt]);

  const isNew = order.status === "novo";
  const accentBar =
    isNew ? "bg-primary"
    : order.status === "aceito" ? "bg-amber-500"
    : order.status === "preparo" ? "bg-blue-500"
    : order.status === "cancelado" ? "bg-destructive"
    : "bg-emerald-500";

  // CTA principal por status
  const primaryCta = (() => {
    if (order.status === "novo") {
      return { label: "Aceitar", icon: Check, variant: "default" as const, action: onAccept, className: "bg-success hover:bg-success/90 text-success-foreground" };
    }
    if (order.status === "aceito") {
      return { label: "Iniciar preparo", icon: ArrowRight, variant: "default" as const, action: () => onUpdateStatus("preparo"), className: "bg-warning hover:bg-warning/90 text-warning-foreground" };
    }
    if (order.status === "preparo") {
      const next: OrderStatus = order.mode === "entrega" ? "saiu_entrega" : order.mode === "retirada" ? "pronto_retirada" : "servido";
      const label = order.mode === "entrega" ? "Saiu p/ entrega" : order.mode === "retirada" ? "Pronto" : "Servir";
      return { label, icon: ArrowRight, variant: "default" as const, action: () => onUpdateStatus(next), className: "bg-blue-600 hover:bg-blue-700 text-white" };
    }
    if (order.status === "saiu_entrega" || order.status === "pronto_retirada" || order.status === "servido") {
      return { label: "Finalizar", icon: Check, variant: "default" as const, action: () => onUpdateStatus("finalizado"), className: "bg-emerald-600 hover:bg-emerald-700 text-white" };
    }
    return null;
  })();

  return (
    <div
      className={`group relative flex flex-col rounded-2xl border bg-card transition-all duration-200 hover:shadow-md overflow-hidden ${
        isNew ? "border-primary/40 ring-1 ring-primary/20 shadow-sm" : "border-border"
      }`}
    >
      {/* Barra lateral colorida */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentBar}`} />

      {/* Ping novo pedido */}
      {isNew && (
        <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
        </span>
      )}

      {/* HEADER */}
      <div className="px-4 pt-3 pl-5 flex items-center gap-2 flex-wrap">
        <span className="font-extrabold text-sm text-foreground">#{order.number}</span>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">{modeLabel[order.mode]}</Badge>
        <OrderStatusBadge status={order.status} className="text-[10px] px-1.5 py-0 h-5" />
        <div className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
          <Clock className="h-3 w-3" />
          <span title={formatDateTime(order.createdAt)}>{elapsed}</span>
        </div>
      </div>

      {/* CLIENTE + ENDEREÇO */}
      <div className="px-4 pl-5 pt-2">
        <p className="font-bold text-base text-foreground leading-tight truncate" title={order.customerName}>
          {order.customerName || "Sem nome"}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          {order.whatsapp && <span className="truncate max-w-[160px]">{order.whatsapp}</span>}
          {order.mode === "entrega" && order.address && (
            <span className="flex items-center gap-0.5 truncate min-w-0">
              <MapPin className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{order.address.street}, {order.address.number}</span>
            </span>
          )}
          {order.mode === "consumo_local" && order.table && (
            <span className="flex items-center gap-0.5 font-semibold text-primary">
              <Utensils className="h-2.5 w-2.5" /> Mesa {order.table}
            </span>
          )}
        </div>
      </div>

      {/* RESUMO ITENS */}
      <div className="px-4 pl-5 pt-2">
        <p className="text-xs text-muted-foreground line-clamp-2">
          <span className="font-semibold text-foreground/80">{order.items.length} {order.items.length === 1 ? "item" : "itens"}: </span>
          {order.items.map((i) => `${i.qty}x ${i.name}`).join(" · ")}
        </p>
      </div>

      {/* TOTAL + PAGAMENTO */}
      <div className="px-4 pl-5 pt-3 flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
          <p className="font-extrabold text-lg text-foreground leading-none">{brl(order.total)}</p>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">{order.payment || "—"}</span>
          <PaymentStatusBadge status={order.paymentStatus} className="text-[9px] px-1 py-0 h-4" />
        </div>
      </div>

      {/* AÇÕES */}
      <div className="mt-3 px-3 pb-3 pl-4 flex items-center gap-2 border-t bg-muted/20 pt-3">
        {isNew ? (
          /* Pedidos novos: apenas "Ler pedido" prominente. Demais ações dentro do modal. */
          <Button
            size="lg"
            onClick={onViewDetails}
            className="flex-1 h-11 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <Eye className="h-4 w-4 mr-2" />
            Ler pedido
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onViewDetails}
              className="flex-1 h-9 text-xs font-semibold"
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Abrir
            </Button>

            {primaryCta && (
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); primaryCta.action(); }}
                className={`flex-1 h-9 text-xs font-semibold ${primaryCta.className}`}
              >
                <primaryCta.icon className="h-3.5 w-3.5 mr-1.5" />
                {primaryCta.label}
              </Button>
            )}

            <PrintOrderButton order={order} size="icon" className="h-9 w-9 shrink-0" paperWidth={paperWidth} />
            <PrintKitchenButton order={order} size="icon" className="h-9 w-9 shrink-0" />
          </>
        )}
      </div>
    </div>
  );
}
