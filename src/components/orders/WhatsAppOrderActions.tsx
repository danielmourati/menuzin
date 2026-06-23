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
  hideStatusButton?: boolean;
}

type WhatsAppMsgType = "aceito" | "preparo" | "saiu_entrega" | "pronto_retirada" | "cancelado" | "conversa";

export function WhatsAppOrderActions({
  order,
  storeName = "Burger Prime",
  className = "",
  size = "default",
  hideStatusButton = false,
}: WhatsAppOrderActionsProps) {
  const getTemplateType = (): WhatsAppMsgType => {
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
        return "conversa";
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
        return "Enviar Mensagem";
    }
  };

  const templateType = getTemplateType();
  const message = whatsappOrderMessage(templateType, {
    cliente: order.customerName,
    numero: order.number,
    loja: storeName,
    motivo: order.cancelReason,
  });

  const chatMessage = whatsappOrderMessage("conversa", {
    cliente: order.customerName,
    numero: order.number,
    loja: storeName,
  });

  const handleSendStatus = () => {
    window.open(whatsappLink(order.whatsapp, message), "_blank", "noreferrer");
  };

  const handleOpenChat = () => {
    window.open(whatsappLink(order.whatsapp, chatMessage), "_blank", "noreferrer");
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {templateType !== "conversa" && (
        <Button
          onClick={handleSendStatus}
          variant="outline"
          size={size}
          className="flex-1 border-success/30 hover:border-success/50 hover:bg-success/5 text-success font-medium"
        >
          <MessageCircle className="mr-2 h-4 w-4 text-success" />
          {getButtonLabel()}
        </Button>
      )}
      <Button
        onClick={handleOpenChat}
        variant="outline"
        size={size}
        className="flex-1"
        title="Iniciar conversa livre no WhatsApp"
      >
        <MessageCircle className="mr-2 h-4 w-4 text-muted-foreground" />
        Conversar (WhatsApp)
      </Button>
    </div>
  );
}
