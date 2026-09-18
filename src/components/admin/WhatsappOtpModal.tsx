import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, MessageSquare, Loader2, ArrowRight, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatErrorMessage } from "@/lib/error-translator";
import { sendWhatsappOtp, verifyWhatsappOtp } from "@/lib/otp.functions";

interface WhatsappOtpModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  whatsappNumber?: string;
  mandatory?: boolean;
}

export function WhatsappOtpModal({
  isOpen,
  onClose,
  onSuccess,
  whatsappNumber = "",
  mandatory = false,
}: WhatsappOtpModalProps) {
  const [code, setCode] = useState("");
  const [resendSeconds, setResendSeconds] = useState(60);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);

  const sendOtpMutation = useMutation({
    mutationFn: () => sendWhatsappOtp({ data: { whatsapp: whatsappNumber || undefined } }),
    onSuccess: (res) => {
      toast.success("Código de verificação gerado!");
      setResendSeconds(60);
      if (res.whatsappLink) {
        setWhatsappLink(res.whatsappLink);
      }
    },
    onError: (err: Error) => {
      toast.error(formatErrorMessage(err, "Erro ao enviar código de verificação."));
    },
  });

  // Timer de reenviar código (60s) e auto-envio ao abrir
  useEffect(() => {
    if (!isOpen) return;
    if (!whatsappLink && !sendOtpMutation.isPending && !sendOtpMutation.isSuccess) {
      sendOtpMutation.mutate();
    }
    setResendSeconds(60);
    const interval = setInterval(() => {
      setResendSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const verifyOtpMutation = useMutation({
    mutationFn: () => verifyWhatsappOtp({ data: { whatsapp: whatsappNumber || undefined, code } }),
    onSuccess: () => {
      toast.success("WhatsApp verificado com sucesso!");
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    },
    onError: (err: Error) => {
      toast.error(formatErrorMessage(err, "Código incorreto ou expirado."));
    },
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      return toast.error("Digite o código de 6 dígitos.");
    }
    verifyOtpMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !mandatory && onClose?.()}>
      <DialogContent className={cn("sm:max-w-md p-0 overflow-hidden", mandatory && "[&>button]:hidden")}>
        {/* Banner do Modal */}
        <DialogHeader className="p-6 bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-background border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Verificar Número de WhatsApp</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Para garantir a segurança da sua conta e barrar cadastros automatizados, confirme seu número de WhatsApp.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
          {whatsappNumber && (
            <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30 text-xs">
              <span className="text-muted-foreground">Número de WhatsApp:</span>
              <Badge variant="outline" className="font-bold border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                <MessageSquare className="mr-1 h-3 w-3" /> {whatsappNumber}
              </Badge>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="otp-code" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Código de 6 dígitos *
            </Label>
            <Input
              id="otp-code"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="h-12 text-center text-2xl font-bold tracking-[0.5em] rounded-xl border-input bg-card font-mono"
              autoFocus
              required
            />
            <p className="text-[11px] text-muted-foreground text-center">
              Informe o código de 6 dígitos enviado para seu WhatsApp.
            </p>
          </div>

          {whatsappLink && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
              <span>Receber código direto no aplicativo:</span>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline flex items-center gap-1 shrink-0"
              >
                Abrir WhatsApp <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={resendSeconds > 0 || sendOtpMutation.isPending}
              onClick={() => sendOtpMutation.mutate()}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {sendOtpMutation.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              )}
              {resendSeconds > 0 ? `Reenviar código em ${resendSeconds}s` : "Reenviar código"}
            </Button>
          </div>

          <div className="pt-3 border-t flex items-center justify-between gap-3">
            {!mandatory && onClose && (
              <Button type="button" variant="outline" onClick={onClose} disabled={verifyOtpMutation.isPending}>
                Validar depois
              </Button>
            )}
            <Button
              type="submit"
              disabled={code.length !== 6 || verifyOtpMutation.isPending}
              className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
            >
              {verifyOtpMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Confirmar e Liberar Acesso
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
