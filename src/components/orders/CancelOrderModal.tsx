import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import type { Order } from "@/lib/mock-data";

interface CancelOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, note?: string) => void;
}

const CANCEL_REASONS = [
  "Item fora de estoque / esgotado",
  "Endereço fora da área de entrega",
  "Estabelecimento muito sobrecarregado",
  "Cliente solicitou cancelamento",
  "Dificuldade de contato com o cliente",
  "Outro motivo",
];

export function CancelOrderModal({ order, isOpen, onClose, onConfirm }: CancelOrderModalProps) {
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [note, setNote] = useState("");

  if (!order) return null;

  const isOnlinePaymentApproved = order.paymentStatus === "approved" && order.payment.toLowerCase().includes("online");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(reason, reason === "Outro motivo" ? note : undefined);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar Pedido #{order.number}</DialogTitle>
          <DialogDescription>
            Escolha o motivo do cancelamento. Esta ação não poderá ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {isOnlinePaymentApproved && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="font-bold">Atenção: Pagamento Online Aprovado</AlertTitle>
              <AlertDescription className="text-xs mt-1">
                Este pedido foi pago online via Mercado Pago. O cancelamento na plataforma não estorna o valor automaticamente. Lembre-se de realizar o estorno manual no painel do Mercado Pago.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Motivo do Cancelamento</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="grid gap-2">
              {CANCEL_REASONS.map((r) => (
                <div key={r} className="flex items-center space-x-2 rounded-md border p-2 hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value={r} id={r} />
                  <Label htmlFor={r} className="flex-1 cursor-pointer font-medium text-sm">
                    {r}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {reason === "Outro motivo" && (
            <div className="space-y-2">
              <Label htmlFor="cancel-note">Detalhes do cancelamento</Label>
              <Textarea
                id="cancel-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Explique o motivo do cancelamento..."
                required
                className="min-h-[80px]"
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Voltar
            </Button>
            <Button type="submit" variant="destructive">
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
