import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { changeShortcuts, bigBillProblem, changeDue, type BillRules } from "@/lib/cash-change";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type CashChangeValue = { noChange: boolean; paid: number | null };

/** Returns an error message or null when the cash input is valid. */
export function cashChangeError(total: number, v: CashChangeValue, rules: BillRules): string | null {
  if (v.noChange) return null;
  if (v.paid == null || !(v.paid > 0)) return "Informe para quanto precisa de troco ou marque \"Não preciso de troco\".";
  if (v.paid + 0.001 < total) return "O valor precisa ser maior ou igual ao total.";
  const big = bigBillProblem(total, v.paid, rules);
  if (big) return `Esta loja não aceita notas de R$ ${big} para troco.`;
  return null;
}

export function CashChangePicker({
  total, value, onChange, rules, compact,
}: {
  total: number;
  value: CashChangeValue;
  onChange: (v: CashChangeValue) => void;
  rules: BillRules;
  compact?: boolean;
}) {
  const shortcuts = useMemo(() => changeShortcuts(total, rules), [total, rules]);
  const err = value.paid != null ? cashChangeError(total, value, rules) : null;
  const due = changeDue(total, value.paid);

  return (
    <div className={compact ? "space-y-2" : "space-y-4 rounded-2xl border bg-card p-4"}>
      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
        <Checkbox
          checked={value.noChange}
          onCheckedChange={(c) => onChange({ noChange: !!c, paid: c ? null : value.paid })}
        />
        Não preciso de troco (valor exato)
      </label>

      {!value.noChange && (
        <>
          <div>
            <p className="text-sm font-semibold mb-2">Precisa de troco para quanto?</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {shortcuts.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange({ noChange: false, paid: s })}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    value.paid === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  {brl(s)}
                </button>
              ))}
            </div>
            <Input
              inputMode="decimal"
              placeholder="Outro valor (ex: 70,00)"
              value={value.paid != null && !shortcuts.includes(value.paid) ? String(value.paid).replace(".", ",") : ""}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d,.]/g, "").replace(",", ".");
                const n = raw === "" ? null : Number(raw);
                onChange({ noChange: false, paid: n != null && Number.isFinite(n) ? n : null });
              }}
              className="h-11"
            />
          </div>
          {err ? (
            <p className="text-xs text-destructive">{err}</p>
          ) : due > 0 ? (
            <p className="rounded-xl bg-primary/10 px-3 py-2 text-sm font-bold text-primary">
              Troco a devolver: {brl(due)}
            </p>
          ) : null}
          {(!rules.accepts100 || !rules.accepts200) && (
            <p className="text-xs text-muted-foreground">
              Esta loja não aceita notas de {!rules.accepts100 ? "R$ 100 e R$ 200" : "R$ 200"} para troco.
            </p>
          )}
        </>
      )}
    </div>
  );
}
