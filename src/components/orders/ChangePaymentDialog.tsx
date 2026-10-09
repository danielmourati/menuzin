import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateOrderPaymentMethod } from "@/lib/orders.functions";
import { CashChangePicker, cashChangeError, type CashChangeValue } from "@/components/payment/CashChangePicker";

type Method = "dinheiro" | "credito" | "debito" | "pix_manual";
const OPTIONS: { v: Method; label: string }[] = [
  { v: "dinheiro", label: "Dinheiro" },
  { v: "credito", label: "Maquininha · Crédito" },
  { v: "debito", label: "Maquininha · Débito" },
  { v: "pix_manual", label: "Pix manual" },
];

export function ChangePaymentDialog({
  open, onOpenChange, orderId, total, rules,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  total: number;
  rules: { accepts100: boolean; accepts200: boolean };
}) {
  const qc = useQueryClient();
  const [method, setMethod] = useState<Method>("dinheiro");
  const [cash, setCash] = useState<CashChangeValue>({ noChange: false, paid: null });
  const m = useMutation({
    mutationFn: () =>
      updateOrderPaymentMethod({
        data: {
          order_id: orderId, method,
          change_for: method === "dinheiro" && !cash.noChange ? cash.paid : null,
          no_change: method === "dinheiro" ? cash.noChange : false,
        },
      }),
    onSuccess: () => {
      toast.success("Forma de pagamento alterada.");
      qc.invalidateQueries();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const err = method === "dinheiro" ? cashChangeError(total, cash, rules) : null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Alterar forma de pagamento</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {OPTIONS.map((o) => (
            <Button key={o.v} type="button" variant={method === o.v ? "default" : "outline"} onClick={() => setMethod(o.v)}>
              {o.label}
            </Button>
          ))}
        </div>
        {method === "dinheiro" && (
          <div className="pt-2">
            <CashChangePicker total={total} value={cash} onChange={setCash} rules={rules} compact />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={m.isPending || !!err} onClick={() => m.mutate()}>
            {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
