import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brl, modeLabel, formatDateTime } from "@/lib/format";
import type { Order } from "@/lib/domain-types";
import { parseAddonLabel } from "@/lib/product-selection";
import { OrderStatusBadge, PaymentStatusBadge } from "./OrderStatusBadge";
import { OrderStatusTimeline } from "./OrderStatusTimeline";
import { OrderStatusActions } from "./OrderStatusActions";
import { WhatsAppOrderActions } from "./WhatsAppOrderActions";
import { PrintOrderButton } from "./PrintOrderButton";
import { MapPin, Phone, Clipboard, Check, AlertTriangle, Utensils, Calendar } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getMyTenant } from "@/lib/tenants.functions";

interface OrderDetailsDrawerProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onCancel: () => void;
  onUpdateStatus: (status: any) => void;
  storeName?: string;
}

export function OrderDetailsDrawer({
  order,
  isOpen,
  onClose,
  onAccept,
  onCancel,
  onUpdateStatus,
  storeName = "Burger Prime",
}: OrderDetailsDrawerProps) {
  const { data: tenantData } = useQuery({ queryKey: ["my-tenant"], queryFn: () => getMyTenant(), staleTime: 60_000 });
  const paperWidth = ((tenantData?.tenant as { pos_paper_width?: string } | null)?.pos_paper_width === "55mm" ? "55mm" : "80mm") as "55mm" | "80mm";
  const [copied, setCopied] = useState(false);

  if (!order) return null;

  const handleCopySummary = () => {
    const lines = [
      `*Pedido #${order.number} — ${modeLabel[order.mode].toUpperCase()}*`,
      `Cliente: ${order.customerName}`,
      `WhatsApp: ${order.whatsapp}`,
    ];

    if (order.mode === "entrega" && order.address) {
      lines.push(
        `Endereço: ${order.address.street}, ${order.address.number} — ${order.address.neighborhood}`
      );
      if (order.address.complement) lines.push(`Compl: ${order.address.complement}`);
      if (order.address.reference) lines.push(`Ref: ${order.address.reference}`);
    } else if (order.mode === "consumo_local" && order.table) {
      lines.push(`Local: ${order.table}`);
    }

    lines.push("");
    lines.push("*Itens:*");
    order.items.forEach((item) => {
      lines.push(`• ${item.qty}x ${item.name} (${brl(item.unitPrice)})`);
      const sizes: string[] = [];
      const flavors: string[] = [];
      const groups: Record<string, string[]> = {};
      const extras: string[] = [];
      for (const a of item.addons ?? []) {
        const p = parseAddonLabel(a.name);
        const suffix = Number(a.price) > 0 ? ` (+${brl(a.price)})` : "";
        if (p.kind === "size") sizes.push(p.label);
        else if (p.kind === "flavor") flavors.push(p.label);
        else if (p.kind === "group" && p.groupName) {
          (groups[p.groupName] ||= []).push(p.label + suffix);
        } else extras.push(p.label + suffix);
      }
      if (sizes.length) lines.push(`   Tamanho: ${sizes.join(", ")}`);
      if (flavors.length) lines.push(`   Sabores: ${flavors.join(" + ")}`);
      for (const [g, opts] of Object.entries(groups)) lines.push(`   ${g}: ${opts.join(", ")}`);
      if (extras.length) lines.push(`   Adicionais: ${extras.join(", ")}`);
      if (item.note) lines.push(`   Obs: ${item.note}`);
    });

    lines.push("");
    if (order.note) {
      lines.push(`Observação geral: ${order.note}`);
      lines.push("");
    }

    lines.push(`Subtotal: ${brl(order.subtotal)}`);
    if (order.deliveryFee > 0) lines.push(`Taxa de Entrega: ${brl(order.deliveryFee)}`);
    lines.push(`*Total: ${brl(order.total)}*`);
    lines.push(`Forma de Pagamento: ${order.payment} (${order.paymentStatus === "approved" ? "Aprovado" : "Pendente/Manual"})`);

    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      toast.success("Resumo do pedido copiado!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getMapLink = () => {
    if (!order.address) return "";
    const query = encodeURIComponent(
      `${order.address.street}, ${order.address.number}, ${order.address.neighborhood}, Parnaíba - PI`
    );
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-full gap-0">
        <SheetHeader className="p-6 border-b shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold flex items-center gap-2">
              Pedido #{order.number}
            </SheetTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="h-8 text-xs gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Clipboard className="h-3.5 w-3.5" />}
              {copied ? "Copiado!" : "Copiar Resumo"}
            </Button>
          </div>
          <SheetDescription className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant="secondary" className="font-semibold">
              {modeLabel[order.mode]}
            </Badge>
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Linha do Tempo de Status */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Acompanhamento
              </h3>
              <div className="bg-muted/30 border rounded-lg p-4">
                <OrderStatusTimeline order={order} />
              </div>
            </div>

            <Separator />

            {/* Informações do Cliente */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Cliente
              </h3>
              <div className="space-y-3 bg-muted/20 border rounded-lg p-4 text-sm">
                <div>
                  <span className="font-medium text-foreground text-base block">{order.customerName}</span>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0 text-success" />
                  <a
                    href={`tel:${order.whatsapp}`}
                    className="hover:underline text-foreground"
                  >
                    {order.whatsapp}
                  </a>
                </div>

                {order.mode === "entrega" && order.address && (
                  <div className="flex items-start gap-2 text-muted-foreground pt-1 border-t border-dashed">
                    <MapPin className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                    <div className="flex-1">
                      <a
                        href={getMapLink()}
                        target="_blank"
                        rel="noreferrer"
                        className="text-foreground hover:underline font-medium block"
                      >
                        {order.address.street}, {order.address.number}
                      </a>
                      <span>
                        {order.address.neighborhood}
                        {order.address.complement ? ` — ${order.address.complement}` : ""}
                      </span>
                      {order.address.reference && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Ref: {order.address.reference}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {order.mode === "consumo_local" && order.table && (
                  <div className="flex items-center gap-2 text-primary pt-1 border-t border-dashed font-semibold">
                    <Utensils className="h-4 w-4 shrink-0" />
                    <span>Consumir no local: {order.table}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-muted-foreground pt-1 border-t border-dashed">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>Enviado às {formatDateTime(order.createdAt)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Itens do Pedido */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Itens do Pedido
              </h3>
              <div className="border rounded-lg overflow-hidden divide-y">
                {order.items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-card text-sm">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold text-foreground">
                        {item.qty}x {item.name}
                      </span>
                      <span className="font-medium shrink-0">
                        {brl(item.unitPrice * item.qty)}
                      </span>
                    </div>
                    
                    {item.addons && item.addons.length > 0 && (
                      <div className="pl-3 mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                        {item.addons.map((add) => {
                          const p = parseAddonLabel(add.name);
                          const prefix =
                            p.kind === "size" ? "Tamanho:" :
                            p.kind === "flavor" ? "Sabor:" :
                            p.kind === "group" ? `${p.groupName}:` :
                            "+";
                          return (
                            <div key={add.id} className="flex justify-between">
                              <span>{prefix} {p.label}</span>
                              {Number(add.price) > 0 && <span>{brl(add.price)}</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {item.note && (
                      <p className="mt-1.5 pl-3 border-l-2 text-xs text-muted-foreground italic">
                        Obs: {item.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Observações Gerais */}
            {order.note && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Observações Gerais
                </h3>
                <p className="text-sm border rounded-lg bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-900/30 p-3 italic text-foreground/80">
                  "{order.note}"
                </p>
              </div>
            )}

            <Separator />

            {/* Valores e Pagamento */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Valores e Pagamento
              </h3>
              <div className="bg-muted/10 border rounded-lg p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{brl(order.subtotal)}</span>
                </div>
                {order.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxa de Entrega</span>
                    <span>{brl(order.deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Total</span>
                  <span className="text-primary">{brl(order.total)}</span>
                </div>

                <div className="border-t border-dashed pt-3 mt-2 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Método</span>
                    <span className="font-semibold text-foreground uppercase">{order.payment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status do Pagamento</span>
                    <span className="font-semibold text-foreground">
                      {order.paymentStatus === "approved"
                        ? "PAGO"
                        : order.paymentStatus === "pending"
                        ? "AGUARDANDO PAGAMENTO"
                        : "PAGAR NA ENTREGA"}
                    </span>
                  </div>
                  {order.changeFor && (
                    <div className="flex justify-between text-amber-600 dark:text-amber-500 font-medium">
                      <span>Troco para</span>
                      <span>{brl(order.changeFor)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Fixo com Ações */}
        <div className="p-4 bg-muted/30 border-t shrink-0 flex flex-col gap-3">
          {/* Ações Rápidas do WhatsApp */}
          <WhatsAppOrderActions order={order} storeName={storeName} />
          
          <div className="flex gap-2">
            <PrintOrderButton order={order} className="flex-1" paperWidth={paperWidth} />
            <Button variant="outline" onClick={onClose} className="flex-1">
              Fechar
            </Button>
          </div>

          <Separator className="my-1" />

          {/* Ações de Status */}
          <OrderStatusActions
            order={order}
            onUpdateStatus={onUpdateStatus}
            onCancel={onCancel}
            className="w-full justify-stretch"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
