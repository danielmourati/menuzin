// Regras puras de taxa de entrega (testadas em scripts/delivery-fee-tests.mjs)
export type KmRounding = "ceil" | "half" | "exact";

/** Taxa por KM: base + km extras × valor/km, com arredondamento configurável. */
export function computeKmFee(km: number, o: { base: number; baseKm: number; perKm: number; rounding: KmRounding; freeKm?: number }) {
  const freeKm = Number(o.freeKm ?? 0);
  if (freeKm > 0 && km <= freeKm + 1e-9) return 0;
  const threshold = freeKm > 0 ? freeKm : o.baseKm;
  const raw = Math.max(0, km - threshold);
  const extra = o.rounding === "ceil" ? Math.ceil(raw - 1e-9) : o.rounding === "half" ? Math.ceil(raw * 2 - 1e-9) / 2 : raw;
  return Math.round((o.base + extra * o.perKm) * 100) / 100;
}

/** Divide a taxa entre cliente (customerPct%) e loja. */
export function splitDeliveryFee(full: number, customerPct: number) {
  const pct = Math.min(100, Math.max(0, Number.isFinite(customerPct) ? customerPct : 100));
  const customer = Math.round(full * pct) / 100;
  return { customer, store: Math.round((full - customer) * 100) / 100 };
}

