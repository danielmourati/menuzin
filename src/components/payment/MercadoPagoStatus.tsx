import { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MpConnectionStatus } from "@/lib/payment-types";

interface MercadoPagoStatusProps {
  status: MpConnectionStatus;
  onConnect: () => void;
  onDisconnect: () => void;
  onTestPayment: () => void;
  expiresAt?: string;
}

export function MercadoPagoStatus({
  status,
  onConnect,
  onDisconnect,
  onTestPayment,
  expiresAt,
}: MercadoPagoStatusProps) {
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    await onTestPayment();
    setTesting(false);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] transition-all">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#009EE3]/10 text-[#009EE3]">
            <svg
              className="h-7 w-7"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 33C26.2843 33 33 26.2843 33 18C33 9.71573 26.2843 3 18 3C9.71573 3 3 9.71573 3 18C3 26.2843 9.71573 33 18 33Z"
                fill="#009EE3"
              />
              <path
                d="M24.75 13.5H20.25V24.75H24.75V13.5ZM15.75 13.5H11.25V24.75H15.75V13.5Z"
                fill="white"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-card-foreground">Mercado Pago Checkout</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px]">
                    <p className="text-xs">
                      Aceite pagamentos online direto no catálogo e receba o valor instantaneamente na sua conta.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xs text-muted-foreground">
              Checkout Transparente via Pix e Cartão
            </p>
          </div>
        </div>

        <div>
          {status === "connected" && (
            <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 px-2.5 py-1 flex gap-1 items-center font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Conectado
            </Badge>
          )}
          {status === "disconnected" && (
            <Badge className="bg-muted text-muted-foreground px-2.5 py-1 border border-border flex gap-1 items-center font-medium">
              <XCircle className="h-3.5 w-3.5" />
              Desconectado
            </Badge>
          )}
          {status === "expired" && (
            <Badge className="bg-amber-500/15 text-amber-600 border border-amber-500/20 px-2.5 py-1 flex gap-1 items-center font-medium animate-pulse">
              <AlertTriangle className="h-3.5 w-3.5" />
              Token Expirado
            </Badge>
          )}
          {status === "error" && (
            <Badge className="bg-destructive/15 text-destructive border border-destructive/20 px-2.5 py-1 flex gap-1 items-center font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              Erro de Conexão
            </Badge>
          )}
          {status === "connecting" && (
            <Badge className="bg-blue-500/15 text-blue-600 border border-blue-500/20 px-2.5 py-1 flex gap-1 items-center font-medium">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Conectando...
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-muted bg-muted/20 p-4">
        {status === "connected" ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Os valores dos pedidos online cairão diretamente na sua conta Mercado Pago.</strong> A plataforma não cobra comissão por transação.
            </p>
            {expiresAt && (
              <p className="text-xs text-muted-foreground">
                Sua conexão é válida até <span className="font-semibold">{formatDate(expiresAt)}</span> e será renovada automaticamente.
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                onClick={onDisconnect}
              >
                Desconectar Mercado Pago
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 text-xs font-semibold"
                disabled={testing}
                onClick={handleTest}
              >
                {testing ? (
                  <>
                    <RefreshCw className="mr-1.5 h-3 w-3 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Testar pagamento"
                )}
              </Button>
            </div>
          </div>
        ) : status === "expired" ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              A conexão com sua conta expirou por motivos de segurança. Por favor, reconecte para reativar os pagamentos online.
            </p>
            <Button
              size="sm"
              className="h-9 bg-[#009EE3] hover:bg-[#0087c2] text-white font-semibold text-xs px-4"
              onClick={onConnect}
            >
              Reconectar conta Mercado Pago
            </Button>
          </div>
        ) : status === "error" ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Ocorreu um erro ao validar suas credenciais com o Mercado Pago. Tente desconectar e conectar novamente.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-9 bg-[#009EE3] hover:bg-[#0087c2] text-white font-semibold text-xs px-4"
                onClick={onConnect}
              >
                Tentar novamente
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                onClick={onDisconnect}
              >
                Desconectar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Conecte sua conta Mercado Pago para aceitar Pix e cartão diretamente no seu catálogo.
            </p>
            <Button
              className="h-10 bg-[#009EE3] hover:bg-[#0087c2] text-white font-semibold text-sm px-5 rounded-xl shadow-sm transition-all"
              onClick={onConnect}
            >
              Conectar minha conta Mercado Pago
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
