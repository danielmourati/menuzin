// Shared pure helpers for cash change ("troco") — used by checkout, PDV and server validation.

export type BillRules = { accepts100: boolean; accepts200: boolean };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Smart shortcut amounts above the total (e.g. 38 → 40, 50, 100). */
export function changeShortcuts(total: number, rules: BillRules = { accepts100: true, accepts200: true }): number[] {
  const t = round2(total);
  if (!(t > 0)) return [];
  const out = new Set<number>();
  const next10 = Math.ceil(t / 10) * 10;
  if (next10 > t) out.add(next10);
  for (const b of [20, 50, 100, 150, 200]) if (b > t) out.add(b);
  const maxBill = rules.accepts200 ? 200 : rules.accepts100 ? 100 : 50;
  return [...out]
    .filter((v) => isPaymentAllowed(t, v, rules) && v - t <= maxBill)
    .sort((a, b) => a - b)
    .slice(0, 3);
}

/**
 * Whether paying `paid` for `total` would force the store to accept a
 * big bill it doesn't accept. Heuristic: the excess (paid − total) must be
 * smaller than the largest accepted bill, and paid must be reachable.
 */
export function bigBillProblem(total: number, paid: number, rules: BillRules): 100 | 200 | null {
  const change = round2(paid - total);
  if (change <= 0) return null;
  if (!rules.accepts200 && change >= 100) return 200;
  if (!rules.accepts100 && change >= 50) return 100;
  return null;
}

export function isPaymentAllowed(total: number, paid: number, rules: BillRules): boolean {
  return round2(paid) >= round2(total) && bigBillProblem(total, paid, rules) === null;
}

export function changeDue(total: number, paid: number | null | undefined): number {
  if (!paid || paid <= total) return 0;
  return round2(paid - total);
}

export function isCashLabel(label: string | null | undefined): boolean {
  return /dinheiro/i.test(label ?? "");
}

/** Plain-text block used by thermal tickets for cash orders (null when not cash). */
export function cashTicketBlock(
  o: { payment?: string; total: number; changeFor?: number; noChange?: boolean },
  cols: number,
): string[] | null {
  if (!isCashLabel(o.payment)) return null;
  const m = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const r = (l: string, v: string) => {
    const gap = cols - l.length - v.length;
    return gap >= 1 ? l + " ".repeat(gap) + v : `${l}\n${" ".repeat(Math.max(0, cols - v.length))}${v}`;
  };
  const sep = "=".repeat(cols);
  const out = [sep, "PAGAMENTO: DINHEIRO", r("TOTAL A COBRAR:", m(o.total))];
  if (o.noChange) out.push("SEM TROCO (VALOR EXATO)");
  else if (o.changeFor && o.changeFor > o.total) {
    out.push(r("PAGAMENTO EM:", m(o.changeFor)));
    out.push(r("LEVAR TROCO:", m(changeDue(o.total, o.changeFor))));
    out.push("*** SEPARAR TROCO ***");
  } else out.push("TROCO: NAO INFORMADO");
  out.push(sep);
  return out;
}
