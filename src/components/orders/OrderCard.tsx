import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brl, modeLabel, timeAgo } from "@/lib/format";
import type { Order } from "@/lib/domain-types";
import { OrderStatusBadge, PaymentStatusBadge } from "./OrderStatusBadge";
import { OrderStatusActions } from "./OrderStatusActions";
import { PrintOrderButton } from "./PrintOrderButton";
import { Eye, Clock, MapPin, MessageCircle, Utensils, ChevronDown, ChevronUp } from "lucide-react";
import { whatsappLink } from "@/lib/whatsapp";
import { useQuery } from "@tanstack/react-query";
import { getMyTenant } from "@/lib/tenants.functions";
import { useAuth } from "@/lib/auth-context";

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
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(timeAgo(order.createdAt));
    }, 15000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  const isNew = order.status === "novo";

  return (
    <div
      className={`group relative w-full rounded-xl border bg-card transition-all duration-200 hover:shadow-md overflow-hidden ${
        isNew
          ? "border-primary/40 ring-1 ring-primary/20 shadow-sm"
          : "border-border"
      }`}
    >
      {/* Barra lateral colorida */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
          isNew
            ? "bg-primary"
            : order.status === "aceito"
            ? "bg-amber-500"
            : order.status === "preparo"
            ? "bg-blue-500"
            : "bg-emerald-500"
        }`}
      />

      {/* Indicador pulsante para novos pedidos */}
      {isNew && (
        <span className="absolute top-0 right-0 flex h-2 w-2 m-2.5 z-10">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
      )}

      {/* ── LINHA PRINCIPAL ────────────────────────────────────────────── */}
      <div className="pl-4 pr-3 py-3 flex items-center gap-3 flex-wrap sm:flex-nowrap">

        {/* Número + Modo + Status */}
        <div className="flex items-center gap-2 shrink-0 min-w-[120px]">
          <span className="font-bold text-sm text-foreground">#{order.number}</span>
          <Badge variant="outline" className="font-medium text-[10px] px-1.5 py-0 h-5">
            {modeLabel[order.mode]}
          </Badge>
          <OrderStatusBadge status={order.status} className="text-[10px] px-1.5 py-0 h-5" />
        </div>

        {/* Tempo */}
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium shrink-0 min-w-[60px]">
          <Clock className="h-3 w-3" />
          <span>{elapsed}</span>
        </div>

        {/* Cliente + Endereço */}
        <div className="flex-1 min-w-0 basis-[180px] flex flex-col gap-0.5">
          <span className="font-semibold text-sm text-foreground truncate" title={order.customerName}>
            {order.customerName || "Sem nome"}
          </span>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground min-w-0">
            <span className="truncate">{order.whatsapp}</span>
            {order.mode === "entrega" && order.address && (
              <span className="flex items-center gap-0.5 shrink-0 truncate">
                <MapPin className="h-2.5 w-2.5" />
                {order.address.street}, {order.address.number}
              </span>
            )}
            {order.mode === "consumo_local" && order.table && (
              <span className="flex items-center gap-0.5 font-semibold text-primary shrink-0">
                <Utensils className="h-2.5 w-2.5" />
                {order.table}
              </span>
            )}
          </div>
        </div>

        {/* Itens resumidos — só em telas largas para não roubar espaço do cliente */}
        <div className="hidden xl:block flex-1 min-w-0 basis-[220px]">
          <p className="text-[11px] text-muted-foreground line-clamp-1">
            <span className="font-semibold text-foreground/80">Itens: </span>
            {order.items.map((i) => `${i.qty}x ${i.name}`).join(" · ")}
          </p>
        </div>

        {/* Total + Pagamento */}
        <div className="text-right shrink-0">
          <div className="font-bold text-sm text-foreground">{brl(order.total)}</div>
          <div className="flex items-center justify-end gap-1 mt-0.5">
            <span className="text-[10px] text-muted-foreground">{order.payment}</span>
            <PaymentStatusBadge status={order.paymentStatus} className="text-[9px] px-1 py-0 h-4" />
          </div>
        </div>

        {/* Botões de ação rápida */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onViewDetails}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Ver detalhes"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>

          <PrintOrderButton order={order} size="icon" className="h-8 w-8" paperWidth={paperWidth} />

          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
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
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
          </Button>

          {/* Ações de status (inline) */}
          <OrderStatusActions
            order={order}
            onUpdateStatus={onUpdateStatus}
            onCancel={onCancel}
            size="sm"
            compact
          />

          {/* Expandir itens no mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground md:hidden"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Recolher" : "Expandir"}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* ── LINHA EXPANDIDA (mobile: itens detalhados) ─────────────────── */}
      {expanded && (
        <div className="pl-4 pr-3 pb-3 border-t border-dashed mx-3 pt-2 md:hidden animate-fade-in">
          <p className="text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground/80">Itens: </span>
            {order.items.map((i) => `${i.qty}x ${i.name}`).join(" · ")}
          </p>
        </div>
      )}
    </div>
  );
}
