import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/lib/whatsapp";
import { whatsappOrderMessage } from "@/lib/format";
import type { Order } from "@/lib/domain-types";
import { MessageCircle } from "lucide-react";

interface WhatsAppOrderActionsProps {
  order: Order;
  storeName?: string;
  className?: string;
  size?: "default" | "sm" | "lg";
}

type WhatsAppMsgType = "aceito" | "preparo" | "saiu_entrega" | "pronto_retirada" | "cancelado" | "conversa";

/**
 * Botão "Notificar <status>" via WhatsApp. Renderiza apenas para status notificáveis.
 * O botão "Conversar" foi movido para o card Cliente do OrderDetailsDrawer.
 */
export function WhatsAppOrderActions({
  order,
  storeName = "Burger Prime",
  className = "",
  size = "default",
}: WhatsAppOrderActionsProps) {
  const getTemplateType = (): WhatsAppMsgType | null => {
    switch (order.status) {
      case "aceito":
        return "aceito";
      case "preparo":
        return "preparo";
      case "saiu_entrega":
        return "saiu_entrega";
      case "pronto_retirada":
        return "pronto_retirada";
      case "cancelado":
        return "cancelado";
      default:
        return null;
    }
  };

  const getButtonLabel = () => {
    switch (order.status) {
      case "aceito":
        return "Notificar Aceite";
      case "preparo":
        return "Notificar Preparo";
      case "saiu_entrega":
        return "Notificar Envio";
      case "pronto_retirada":
        return "Notificar Retirada";
      case "cancelado":
        return "Notificar Cancelamento";
      default:
        return "";
    }
  };

  const templateType = getTemplateType();
  if (!templateType) return null;

  const message = whatsappOrderMessage(templateType, {
    cliente: order.customerName,
    numero: order.number,
    loja: storeName,
    motivo: order.cancelReason,
  });

  const handleSendStatus = () => {
    window.open(whatsappLink(order.whatsapp, message), "_blank", "noreferrer");
  };

  return (
    <Button
      onClick={handleSendStatus}
      size={size}
      variant="outline"
      className={`border-success/30 text-success hover:bg-success/10 hover:text-success font-medium ${className}`}
    >
      <MessageCircle className="mr-2 h-4 w-4 text-success" />
      {getButtonLabel()}
    </Button>
  );
}
