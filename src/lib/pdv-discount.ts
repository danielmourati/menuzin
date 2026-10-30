/** Desconto manual do PDV: R$ ou %; nunca negativo nem maior que o subtotal. */
export function computePdvDiscount(subtotal: number, value: number, kind: "brl" | "pct"): number {
  const v = Number.isFinite(value) && value > 0 ? value : 0;
  const raw = kind === "pct" ? (subtotal * Math.min(v, 100)) / 100 : v;
  return Math.round(Math.min(Math.max(raw, 0), Math.max(subtotal, 0)) * 100) / 100;
}
