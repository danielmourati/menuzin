import { useState, useEffect } from "react";
import { CheckCircle2, Copy, CopyCheck, RefreshCw, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import type { PixPaymentData, PaymentStatus } from "@/lib/payment-types";
import { pollPaymentStatus } from "@/lib/payment-service";

interface PixCheckoutProps {
  pixData: PixPaymentData;
  amount: number;
  storeSlug: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PixCheckout({ pixData, amount, storeSlug, onSuccess, onCancel }: PixCheckoutProps) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>("pending");
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutos em segundos
  const [progress, setProgress] = useState(100);

  // Timer regressivo
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus("expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Atualizar barra de progresso do tempo restante
  useEffect(() => {
    setProgress((timeLeft / 900) * 100);
  }, [timeLeft]);

  // Simular e monitorar o status do pagamento via polling mockado
  useEffect(() => {
    if (status !== "pending") return;

    let attempt = 0;
    const interval = setInterval(async () => {
      attempt++;
      try {
        const nextStatus = await pollPaymentStatus(pixData.payment_id, attempt);
        if (nextStatus === "approved") {
          setStatus("approved");
          clearInterval(interval);
          toast.success("Pagamento via Pix aprovado instantaneamente!");
          setTimeout(() => {
            onSuccess();
          }, 2000);
        }
      } catch (err) {
        console.error("Erro no pooling de pagamento", err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [status, pixData.payment_id, onSuccess]);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      toast.success("Código Pix copia e cola copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center space-y-6 animate-fade-in">
      {status === "pending" && (
        <>
          <div className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight">Aguardando Pagamento</h3>
            <p className="text-sm text-muted-foreground">
              Abra o app do seu banco e pague com o Pix copia e cola ou leia o QR code abaixo.
            </p>
          </div>

          <div className="relative p-4 border rounded-3xl bg-white shadow-sm flex items-center justify-center h-52 w-52 sm:h-60 sm:w-60">
            {/* QR Code Placeholder premium */}
            <div className="absolute inset-0 m-4 flex flex-col items-center justify-center border-4 border-dashed border-primary/20 rounded-2xl bg-muted/5">
              <svg className="h-32 w-32 text-primary" viewBox="0 0 100 100" fill="none">
                <rect x="10" y="10" width="20" height="20" stroke="currentColor" strokeWidth="4" />
                <rect x="15" y="15" width="10" height="10" fill="currentColor" />
                <rect x="70" y="10" width="20" height="20" stroke="currentColor" strokeWidth="4" />
                <rect x="75" y="15" width="10" height="10" fill="currentColor" />
                <rect x="10" y="70" width="20" height="20" stroke="currentColor" strokeWidth="4" />
                <rect x="15" y="75" width="10" height="10" fill="currentColor" />
                {/* Linhas simulando o QR code */}
                <path d="M40 20h10v10H40zm20 0h5v5h-5zm0 10h10v5H60zm-20 20h5v15h-5zm10 0h15v5H50zm10 10h10v5H60zm-20 10h20v5H40zm30-10h10v20H70z" fill="currentColor" fillOpacity="0.8" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-[1px] animate-pulse">
                <div className="flex flex-col items-center gap-1.5 text-primary">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                  <span className="text-[10px] font-bold tracking-widest uppercase">Gerando Pix...</span>
                </div>
              </div>
            </div>
            {/* Imagem real baseada na URI do MP (quando integrado) */}
            {pixData.qr_code_base64 && (
              <img
                src={`data:image/png;base64,${pixData.qr_code_base64}`}
                alt="QR Code Pix"
                className="h-full w-full object-contain rounded-2xl z-10"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
          </div>

          <div className="w-full max-w-sm space-y-3 bg-muted/30 border border-muted p-4 rounded-2xl">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" /> Tempo restante:
              </span>
              <span className="font-mono text-primary">{formatTime(timeLeft)}</span>
            </div>
            <Progress value={progress} className="h-1.5 bg-muted" />
          </div>

          <div className="w-full max-w-sm space-y-4">
            <div className="flex justify-between items-center py-2 px-3 border border-dashed rounded-xl bg-card">
              <span className="text-sm text-muted-foreground">Valor total:</span>
              <span className="text-lg font-bold text-foreground">{brl(amount)}</span>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleCopy}
                className="w-full h-12 rounded-xl text-base font-semibold shadow-sm flex gap-2 items-center justify-center transition-all"
              >
                {copied ? <CopyCheck className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                {copied ? "Copiado!" : "Copiar código Pix"}
              </Button>

              <Button
                variant="ghost"
                onClick={onCancel}
                className="w-full h-11 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Cancelar e escolher outro método
              </Button>
            </div>
          </div>
        </>
      )}

      {status === "approved" && (
        <div className="py-8 space-y-4 animate-scale-in">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-12 w-12 animate-bounce" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              Pagamento Aprovado!
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Seu Pix foi recebido. Estamos preparando e direcionando seu pedido agora mesmo.
            </p>
          </div>
        </div>
      )}

      {status === "expired" && (
        <div className="py-8 space-y-5 animate-scale-in">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight text-destructive">
              QR Code Expirado
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              O tempo limite de 15 minutos para efetuar o pagamento do Pix acabou.
            </p>
          </div>
          <Button onClick={onCancel} className="w-full max-w-xs h-11 rounded-xl">
            Tentar Novamente
          </Button>
        </div>
      )}
    </div>
  );
}
