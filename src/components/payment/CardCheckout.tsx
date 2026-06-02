import { useState, useEffect, useRef } from "react";
import { CreditCard, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import type { CardPaymentData, PaymentStatus } from "@/lib/payment-types";

interface CardCheckoutProps {
  amount: number;
  publicKey: string;
  onSubmit: (cardData: {
    cardNumber: string;
    cardholderName: string;
    expirationMonth: string;
    expirationYear: string;
    securityCode: string;
    installments: number;
    cardToken: string;
  }) => Promise<CardPaymentData>;
  onSuccess: () => void;
  onCancel: () => void;
}

// Minimal types for the Mercado Pago JS SDK v2 surface we use
interface MpSdkInstance {
  createCardToken: (input: {
    cardNumber: string;
    cardholderName: string;
    cardExpirationMonth: string;
    cardExpirationYear: string;
    securityCode: string;
    identificationType: string;
    identificationNumber: string;
  }) => Promise<{ id: string }>;
}
type MpConstructor = new (publicKey: string, options?: { locale?: string }) => MpSdkInstance;

declare global {
  interface Window {
    MercadoPago?: MpConstructor;
  }
}

const MP_SDK_URL = "https://sdk.mercadopago.com/js/v2";

function loadMpSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.MercadoPago) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${MP_SDK_URL}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar SDK MP")));
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = MP_SDK_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Falha ao carregar SDK MP"));
    document.head.appendChild(s);
  });
}

export function CardCheckout({ amount, publicKey, onSubmit, onCancel }: CardCheckoutProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expiration, setExpiration] = useState("");
  const [cvv, setCvv] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [installments, setInstallments] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<PaymentStatus | "form">("form");
  const [errorMsg, setErrorMsg] = useState("");
  const [sdkReady, setSdkReady] = useState(false);
  const mpRef = useRef<MpSdkInstance | null>(null);

  useEffect(() => {
    if (!publicKey) return;
    let cancelled = false;
    loadMpSdk()
      .then(() => {
        if (cancelled) return;
        if (!window.MercadoPago) throw new Error("SDK MP indisponível");
        mpRef.current = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        setSdkReady(true);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Não foi possível carregar o checkout do cartão. Tente novamente.");
      });
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\D/g, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardNumber(formatCardNumber(e.target.value));
  };

  const formatExpiration = (value: string) => {
    const v = value.replace(/\D/g, "");
    if (v.length >= 2) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
    }
    return v;
  };

  const handleExpirationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpiration(formatExpiration(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cardNumber || !cardholderName || !expiration || !cvv) {
      toast.error("Por favor, preencha todos os campos do cartão.");
      return;
    }

    const [month, year] = expiration.split("/");
    if (!month || !year || month.length !== 2 || year.length !== 2) {
      toast.error("Validade do cartão incorreta (MM/AA).");
      return;
    }
    if (!sdkReady || !mpRef.current) {
      toast.error("Checkout ainda carregando — tente novamente em instantes.");
      return;
    }
    const cpfDigits = docNumber.replace(/\D/g, "");
    if (cpfDigits.length < 11) {
      toast.error("Informe o CPF do titular (11 dígitos).");
      return;
    }

    setIsLoading(true);
    setStatus("processing");
    setErrorMsg("");

    try {
      // 1) Tokenize card with MP SDK (PCI-safe — raw PAN never touches our backend)
      const tokenResult = await mpRef.current.createCardToken({
        cardNumber: cardNumber.replace(/\s/g, ""),
        cardholderName,
        cardExpirationMonth: month,
        cardExpirationYear: `20${year}`,
        securityCode: cvv,
        identificationType: "CPF",
        identificationNumber: cpfDigits,
      });

      // 2) Submit token to backend
      const response = await onSubmit({
        cardNumber: cardNumber.replace(/\s/g, ""),
        cardholderName,
        expirationMonth: month,
        expirationYear: `20${year}`,
        securityCode: cvv,
        installments: parseInt(installments, 10),
        cardToken: tokenResult.id,
      });

      if (response.payment_status === "approved") {
        setStatus("approved");
        toast.success("Pagamento via Cartão aprovado!");
        setTimeout(() => {
          // onSuccess is invoked by parent after status set
        }, 1200);
      } else {
        setStatus("rejected");
        setErrorMsg(
          response.status_detail === "cc_rejected_bad_filled_other"
            ? "Os dados do cartão estão inválidos. Verifique e tente novamente."
            : response.status_detail === "cc_rejected_insufficient_amount"
            ? "Saldo insuficiente na conta do cartão."
            : response.status_detail
            ? `Pagamento recusado: ${response.status_detail}`
            : "Pagamento recusado pelo emissor do cartão."
        );
      }
    } catch (err: unknown) {
      console.error(err);
      setStatus("rejected");
      const msg = err instanceof Error ? err.message : "Ocorreu um erro no processamento do cartão.";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Obter bandeira do cartão baseada no primeiro número
  const getCardBrand = () => {
    const clean = cardNumber.replace(/\D/g, "");
    if (clean.startsWith("4")) return "visa";
    if (/^5[1-5]/.test(clean)) return "mastercard";
    if (clean.startsWith("3")) return "amex";
    if (clean.startsWith("6")) return "elo";
    return "unknown";
  };

  return (
    <div className="w-full max-w-sm mx-auto p-4 space-y-5 animate-fade-in">
      {status === "form" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 text-center">
            <h3 className="text-lg font-bold tracking-tight">Cartão de Crédito Online</h3>
            <p className="text-xs text-muted-foreground">
              Seus dados de pagamento são criptografados de ponta a ponta e nunca salvos.
            </p>
          </div>

          {/* Cartão de crédito visual mockado */}
          <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-md overflow-hidden aspect-[1.586/1] flex flex-col justify-between select-none">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <CreditCard className="h-40 w-40" />
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                PAGAMENTO ONLINE
              </span>
              {getCardBrand() === "visa" && <span className="text-xl font-bold italic text-blue-400">Visa</span>}
              {getCardBrand() === "mastercard" && <span className="text-xl font-bold italic text-amber-500">MasterCard</span>}
              {getCardBrand() === "amex" && <span className="text-xl font-bold italic text-cyan-400">Amex</span>}
              {getCardBrand() === "elo" && <span className="text-xl font-bold italic text-purple-400">Elo</span>}
              {getCardBrand() === "unknown" && <CreditCard className="h-6 w-6 text-slate-400" />}
            </div>

            <div className="space-y-3">
              <p className="font-mono text-lg tracking-wider sm:text-xl">
                {cardNumber || "•••• •••• •••• ••••"}
              </p>

              <div className="flex justify-between items-end">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase text-slate-400 tracking-wider">Titular</p>
                  <p className="font-medium text-sm truncate uppercase tracking-wide">
                    {cardholderName || "NOME DO TITULAR"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] uppercase text-slate-400 tracking-wider">Validade</p>
                  <p className="font-mono font-medium text-sm">
                    {expiration || "MM/AA"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <Label htmlFor="cardNumber">Número do cartão</Label>
              <Input
                id="cardNumber"
                value={cardNumber}
                onChange={handleCardNumberChange}
                maxLength={19}
                placeholder="0000 0000 0000 0000"
                className="mt-1 h-11 rounded-xl"
                required
              />
            </div>

            <div>
              <Label htmlFor="cardholderName">Nome completo no cartão</Label>
              <Input
                id="cardholderName"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="Como está gravado no cartão"
                className="mt-1 h-11 rounded-xl uppercase"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="expiration">Validade</Label>
                <Input
                  id="expiration"
                  value={expiration}
                  onChange={handleExpirationChange}
                  maxLength={5}
                  placeholder="MM/AA"
                  className="mt-1 h-11 rounded-xl"
                  required
                />
              </div>
              <div>
                <Label htmlFor="cvv">CVV (Código)</Label>
                <PasswordInput
                  id="cvv"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                  maxLength={4}
                  placeholder="123"
                  className="mt-1 h-11 rounded-xl"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="docNumber">CPF do titular</Label>
              <Input
                id="docNumber"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value.replace(/\D/g, ""))}
                maxLength={14}
                placeholder="000.000.000-00"
                inputMode="numeric"
                className="mt-1 h-11 rounded-xl"
                required
              />
            </div>


            <div>
              <Label htmlFor="installments">Parcelamento</Label>
              <Select value={installments} onValueChange={setInstallments}>
                <SelectTrigger id="installments" className="mt-1 h-11 rounded-xl">
                  <SelectValue placeholder="Selecione as parcelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1x de {brl(amount)} (Sem juros)</SelectItem>
                  <SelectItem value="2">2x de {brl(amount / 2)} (Sem juros)</SelectItem>
                  <SelectItem value="3">3x de {brl(amount / 3)} (Sem juros)</SelectItem>
                  <SelectItem value="4">4x de {brl((amount * 1.05) / 4)} (Com juros)</SelectItem>
                  <SelectItem value="6">6x de {brl((amount * 1.08) / 6)} (Com juros)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl text-base font-semibold shadow-sm flex items-center justify-center gap-1.5"
            >
              Confirmar Pagamento de {brl(amount)}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="w-full h-11 text-sm font-medium text-muted-foreground"
            >
              Escolher outro método
            </Button>
          </div>

          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Processado via Mercado Pago Checkout Transparente.
          </div>
        </form>
      )}

      {status === "processing" && (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
          <RefreshCw className="h-10 w-10 text-primary animate-spin" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold">Processando Pagamento</h3>
            <p className="text-sm text-muted-foreground">
              Aguarde enquanto validamos as credenciais e processamos seu cartão...
            </p>
          </div>
        </div>
      )}

      {status === "approved" && (
        <div className="py-10 flex flex-col items-center justify-center text-center space-y-4 animate-scale-in">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-10 w-10 animate-bounce" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-emerald-600">Pagamento Autorizado!</h3>
            <p className="text-sm text-muted-foreground">
              Seu pagamento foi confirmado com sucesso. Seu pedido está em processamento.
            </p>
          </div>
        </div>
      )}

      {status === "rejected" && (
        <div className="py-8 flex flex-col items-center justify-center text-center space-y-5 animate-scale-in">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-destructive">Pagamento Recusado</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {errorMsg || "Transação não autorizada. Verifique os dados ou tente outro cartão."}
            </p>
          </div>
          <div className="w-full space-y-2">
            <Button onClick={() => setStatus("form")} className="w-full h-11 rounded-xl">
              Tentar novamente
            </Button>
            <Button variant="outline" onClick={onCancel} className="w-full h-11 rounded-xl">
              Escolher outro método
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
