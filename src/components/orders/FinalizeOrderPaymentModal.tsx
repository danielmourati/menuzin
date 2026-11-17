import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CashChangeBadge } from "@/components/orders/CashChangeBadge";
import { brl } from "@/lib/format";
import type { Order } from "@/lib/domain-types";
import type { OrderPaymentConfirmation } from "@/hooks/useOrdersRealtime";
import {
  Banknote,
  Check,
  CheckCircle2,
  CreditCard,
  Loader2,
  QrCode,
  RefreshCw,
  Wallet,
} from "lucide-react";

type AlternateMethod = "dinheiro" | "credito" | "debito" | "pix_manual";

const PAYMENT_OPTIONS: {
  value: AlternateMethod;
  label: string;
  icon: typeof Banknote;
}[] = [
  { value: "dinheiro", label: "Dinheiro em Espécie", icon: Banknote },
  { value: "credito", label: "Cartão · Crédito", icon: CreditCard },
  { value: "debito", label: "Cartão · Débito", icon: CreditCard },
  { value: "pix_manual", label: "Pix", icon: QrCode },
];

function inferAlternateDefault(paymentLabel?: string | null): AlternateMethod {
  const lower = (paymentLabel ?? "").toLowerCase();
  if (lower.includes("dinheiro")) return "pix_manual";
  if (lower.includes("pix")) return "dinheiro";
  return "dinheiro";
}

interface FinalizeOrderPaymentModalProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending?: boolean;
  onConfirm: (confirmation: OrderPaymentConfirmation) => void | Promise<void>;
}

/**
 * Modal exibido ao finalizar pedidos cujo pagamento ainda está pendente,
 * confirmando se foi recebido conforme solicitado ou por outro método.
 */
export function FinalizeOrderPaymentModal({
  order,
  open,
  onOpenChange,
  isPending = false,
  onConfirm,
}: FinalizeOrderPaymentModalProps) {
  const [mode, setMode] = useState<"same" | "changed">("same");
  const [newMethod, setNewMethod] = useState<AlternateMethod>("dinheiro");

  useEffect(() => {
    if (open && order) {
      setMode("same");
      setNewMethod(inferAlternateDefault(order.payment));
    }
  }, [open, order?.id, order?.payment]);

  if (!order) return null;

  const requestedLabel = order.payment?.trim() || "Forma original do pedido";

  const handleConfirm = () => {
    void onConfirm({
      changed: mode === "changed",
      new_method: mode === "changed" ? newMethod : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-600" />
            Confirmar pagamento — Pedido #{order.number}
          </DialogTitle>
          <DialogDescription>
            Informe como o pagamento foi recebido para finalizar o pedido.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo do pedido */}
          <div className="rounded-xl border bg-muted/30 p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Cliente</p>
                <p className="font-semibold text-sm text-foreground truncate">
                  {order.customerName || "Sem nome"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-extrabold text-lg text-foreground leading-tight">
                  {brl(order.total)}
                </p>
              </div>
            </div>
            <div className="border-t border-border/60 pt-2 flex flex-wrap items-center justify-between gap-1.5 text-xs">
              <span className="text-muted-foreground">Solicitado pelo cliente:</span>
              <span className="font-semibold text-foreground">{requestedLabel}</span>
            </div>
            <CashChangeBadge order={order} compact />
          </div>

          {/* Seleção: como solicitado vs alteração */}
          <div className="space-y-2.5">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setMode("same")}
              className={`w-full rounded-xl border p-3.5 text-left transition-all flex items-start gap-3 ${
                mode === "same"
                  ? "border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                  : "border-border hover:bg-muted/40"
              }`}
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  mode === "same"
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-muted-foreground/40"
                }`}
              >
                {mode === "same" && <Check className="h-3 w-3" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  Recebido como o cliente solicitou
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {requestedLabel}
                </span>
              </span>
              <CheckCircle2
                className={`h-4 w-4 shrink-0 mt-0.5 ${
                  mode === "same" ? "text-emerald-600" : "text-muted-foreground/40"
                }`}
              />
            </button>

            <div
              className={`rounded-xl border transition-all ${
                mode === "changed"
                  ? "border-amber-500 ring-1 ring-amber-500 bg-amber-50/30 dark:bg-amber-950/15"
                  : "border-border"
              }`}
            >
              <button
                type="button"
                disabled={isPending}
                onClick={() => setMode("changed")}
                className="w-full p-3.5 text-left flex items-start gap-3"
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    mode === "changed"
                      ? "border-amber-600 bg-amber-600 text-white"
                      : "border-muted-foreground/40"
                  }`}
                >
                  {mode === "changed" && <Check className="h-3 w-3" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    Houve alteração na forma de pagamento
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    O cliente pagou com outro método no momento da entrega/retirada
                  </span>
                </span>
                <RefreshCw
                  className={`h-4 w-4 shrink-0 mt-0.5 ${
                    mode === "changed" ? "text-amber-600" : "text-muted-foreground/40"
                  }`}
                />
              </button>

              {mode === "changed" && (
                <div className="px-3.5 pb-3.5 pt-1">
                  <p className="text-[11px] font-medium text-muted-foreground mb-2">
                    Selecione como o pagamento foi recebido:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const selected = newMethod === opt.value;
                      return (
                        <Button
                          key={opt.value}
                          type="button"
                          size="sm"
                          disabled={isPending}
                          variant={selected ? "default" : "outline"}
                          onClick={() => setNewMethod(opt.value)}
                          className={`h-auto py-2.5 px-3 justify-start text-xs font-medium gap-2 whitespace-normal text-left ${
                            selected ? "shadow-xs" : "bg-background"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span>{opt.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={handleConfirm}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Confirmar e Finalizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

