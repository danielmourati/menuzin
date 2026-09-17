import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, CreditCard, User, Phone, MessageSquare, ExternalLink, PackageCheck, AlertCircle, Plus } from "lucide-react";
import { brl } from "@/lib/format";
import type { Order } from "@/lib/domain-types";
import { listMyDrivers } from "@/lib/drivers.functions";
import { Link } from "@tanstack/react-router";

interface DispatchOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDispatch: (driverId: string, driverName: string, sendWhatsapp: boolean) => void;
  isPending?: boolean;
}

export function DispatchOrderModal({
  order,
  isOpen,
  onClose,
  onConfirmDispatch,
  isPending = false,
}: DispatchOrderModalProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");

  const { data } = useQuery({
    queryKey: ["my-drivers"],
    queryFn: () => listMyDrivers(),
    enabled: isOpen,
  });

  const drivers = (data?.drivers ?? []).filter((d) => d.active);

  // Seleciona o primeiro por padrão quando a modal abre
  useEffect(() => {
    if (isOpen && drivers.length > 0) {
      if (order?.driverId && drivers.some((d) => d.id === order.driverId)) {
        setSelectedDriverId(order.driverId);
      } else {
        setSelectedDriverId(drivers[0].id);
      }
    }
  }, [isOpen, drivers, order?.driverId]);

  if (!order) return null;

  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);

  // Formatação do Endereço Completo
  const addr = order.address;
  const addressString = addr
    ? `${addr.street || ""}, ${addr.number || "s/n"}${addr.neighborhood ? ` - ${addr.neighborhood}` : ""}${addr.complement ? ` (${addr.complement})` : ""}`
    : "Retirada ou Endereço não informado";
  
  const googleMapsUrl = addr
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${addr.street || ""}, ${addr.number || ""}, ${addr.neighborhood || ""}`
      )}`
    : null;

  // Gerador de mensagem formatada para WhatsApp do Entregador
  const generateWhatsappUrl = () => {
    if (!selectedDriver) return null;
    const driverPhone = selectedDriver.phone.replace(/\D/g, "");
    
    const itemsSummary = order.items
      .map((it) => `• ${it.qty}x ${it.name}${it.note ? ` (${it.note})` : ""}`)
      .join("\n");

    const message = `🛵 *DESPACHO DE PEDIDO #${order.number}*\n` +
      `-----------------------------------\n` +
      `👤 *Cliente:* ${order.customerName}\n` +
      `📞 *Telefone:* ${order.whatsapp}\n\n` +
      `📍 *ENDEREÇO DE ENTREGA:*\n` +
      `${addressString}\n` +
      (addr?.reference ? `💡 *Ref:* ${addr.reference}\n` : "") +
      (googleMapsUrl ? `🗺️ *Mapa:* ${googleMapsUrl}\n\n` : "\n") +
      `💳 *FORMA DE PAGAMENTO:*\n` +
      `${order.payment}\n` +
      `💰 *Total:* R$ ${order.total.toFixed(2).replace(".", ",")}\n` +
      (order.changeFor ? `💵 *Troco para:* R$ ${order.changeFor.toFixed(2).replace(".", ",")}\n` : "") +
      `\n📦 *ITENS DO PEDIDO:*\n` +
      `${itemsSummary}\n` +
      `-----------------------------------\n` +
      `Bom trabalho! 🚀`;

    return `https://wa.me/${driverPhone}?text=${encodeURIComponent(message)}`;
  };

  const handleDispatch = (sendWhatsapp: boolean) => {
    if (!selectedDriverId || !selectedDriver) return;

    if (sendWhatsapp) {
      const url = generateWhatsappUrl();
      if (url) {
        window.open(url, "_blank");
      }
    }

    onConfirmDispatch(selectedDriver.id, selectedDriver.name, sendWhatsapp);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Banner do Modal */}
        <DialogHeader className="p-5 bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Truck className="h-5 w-5 text-primary" /> Despachar Pedido #{order.number}
            </DialogTitle>
            <Badge variant="outline" className="font-semibold border-primary text-primary">
              R$ {order.total.toFixed(2).replace(".", ",")}
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Seleção do Entregador */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Escolher Entregador *
              </Label>
              <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs text-primary">
                <a href="/admin/entregadores" target="_blank" rel="noopener noreferrer">
                  <Plus className="mr-1 h-3 w-3" /> Gerenciar Entregadores
                </a>
              </Button>
            </div>

            {drivers.length === 0 ? (
              <div className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-xs text-warning-foreground flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  Nenhum entregador ativo cadastrado.{" "}
                  <a href="/admin/entregadores" target="_blank" rel="noopener noreferrer" className="font-bold underline">
                    Cadastrar entregador agora
                  </a>
                </div>
              </div>
            ) : (
              <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                <SelectTrigger className="h-11 rounded-xl text-sm font-semibold border-input bg-card">
                  <SelectValue placeholder="Selecione um entregador..." />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id} className="py-2.5">
                      <div className="flex items-center justify-between w-full gap-4">
                        <span className="font-medium text-foreground">{d.name}</span>
                        <span className="text-xs text-muted-foreground">{d.vehicle || "Moto"} · {d.phone}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Destaque das Informações de Entrega */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3 text-sm">
            {/* Cliente */}
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-semibold text-muted-foreground block">Cliente</span>
                <span className="font-semibold text-foreground">{order.customerName}</span>
                <a
                  href={`https://wa.me/${order.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-xs font-medium text-emerald-600 hover:underline inline-flex items-center gap-1"
                >
                  <Phone className="h-3 w-3" /> {order.whatsapp}
                </a>
              </div>
            </div>

            {/* Endereço */}
            <div className="flex items-start gap-3 border-t border-border/60 pt-2.5">
              <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-xs font-semibold text-muted-foreground block">Endereço de Entrega</span>
                <p className="font-medium text-foreground text-xs leading-snug">{addressString}</p>
                {addr?.reference && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">Ref: {addr.reference}</p>
                )}
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" /> Abrir no Google Maps
                  </a>
                )}
              </div>
            </div>

            {/* Pagamento */}
            <div className="flex items-start gap-3 border-t border-border/60 pt-2.5">
              <CreditCard className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-semibold text-muted-foreground block">Pagamento & Troco</span>
                <p className="font-bold text-foreground text-xs">
                  {order.payment} — Total: {brl(order.total)}
                </p>
                {order.changeFor && (
                  <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    Troco para: {brl(order.changeFor)} (Troco: {brl(order.changeFor - order.total)})
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé com botões de ação */}
        <DialogFooter className="p-4 bg-muted/30 border-t shrink-0 flex flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button
            onClick={() => handleDispatch(true)}
            disabled={!selectedDriverId || isPending}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-xs"
          >
            <MessageSquare className="mr-2 h-4 w-4" /> Despachar e Enviar no WhatsApp
          </Button>

          <div className="flex items-center justify-between gap-2 w-full pt-1 border-t border-border/50">
            <Button variant="ghost" onClick={onClose} disabled={isPending} className="text-muted-foreground hover:text-foreground">
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDispatch(false)}
              disabled={!selectedDriverId || isPending}
              className="font-medium text-xs border-border bg-background hover:bg-accent"
            >
              <PackageCheck className="mr-1.5 h-3.5 w-3.5" /> Apenas Despachar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
