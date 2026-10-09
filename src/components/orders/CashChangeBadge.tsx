import { Banknote } from "lucide-react";
import { changeDue, isCashLabel } from "@/lib/cash-change";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Highlighted cash block for the order manager (dispatch: put the exact change in the bag). */
export function CashChangeBadge({
  order, compact,
}: {
  order: { payment?: string; total: number; changeFor?: number; noChange?: boolean };
  compact?: boolean;
}) {
  if (!isCashLabel(order.payment)) return null;
  const due = changeDue(order.total, order.changeFor);
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-bold text-accent-foreground">
        <Banknote className="h-3 w-3" />
        {order.noChange ? "Sem troco" : due > 0 ? `Troco ${brl(due)}` : "Dinheiro"}
      </span>
    );
  }
  return (
    <div className="rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 p-3 text-sm">
      <p className="flex items-center gap-1.5 font-bold uppercase text-primary"><Banknote className="h-4 w-4" /> Pagamento em dinheiro</p>
      <div className="mt-1 flex justify-between"><span>Total a cobrar</span><b>{brl(order.total)}</b></div>
      {order.noChange ? (
        <p className="mt-1 font-bold">SEM TROCO (valor exato)</p>
      ) : order.changeFor && due > 0 ? (
        <>
          <div className="flex justify-between"><span>Pagamento em</span><b>{brl(order.changeFor)}</b></div>
          <div className="mt-1 flex justify-between text-base font-extrabold text-primary">
            <span>LEVAR TROCO (SEPARAR)</span><span>{brl(due)}</span>
          </div>
        </>
      ) : (
        <p className="mt-1 text-muted-foreground">Troco não informado</p>
      )}
    </div>
  );
}
