// Helpers puros de agrupamento para Caixa e lista de Finalizados (fuso fixo São Paulo, UTC-3).
const SP_OFFSET_MS = 3 * 60 * 60 * 1000;
const r2 = (n: number) => Math.round(n * 100) / 100;

export const spDayKey = (iso: string) => new Date(new Date(iso).getTime() - SP_OFFSET_MS).toISOString().slice(0, 10);
export const spMonthKey = (iso: string) => spDayKey(iso).slice(0, 7);

export type MethodTotal = { label: string; count: number; total: number };

/** Soma por forma de pagamento; cancelados ficam de fora. */
export function summarizeByMethod(orders: { status: string; total: number | null; payment_label: string | null }[]) {
  const map = new Map<string, MethodTotal>();
  let total = 0;
  for (const o of orders) {
    if (o.status === "cancelado") continue;
    const label = (o.payment_label || "Não informado").trim() || "Não informado";
    const cur = map.get(label) ?? { label, count: 0, total: 0 };
    cur.count += 1;
    cur.total = r2(cur.total + Number(o.total ?? 0));
    map.set(label, cur);
    total = r2(total + Number(o.total ?? 0));
  }
  return { total, methods: [...map.values()].sort((a, b) => b.total - a.total) };
}

export function groupBy<T>(items: T[], key: (t: T) => string) {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const arr = map.get(k);
    if (arr) arr.push(it); else map.set(k, [it]);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([k, list]) => ({ key: k, items: list }));
}

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const monthLabel = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;

export function dayLabel(key: string, now = new Date()) {
  const today = spDayKey(now.toISOString());
  const yesterday = spDayKey(new Date(now.getTime() - 86400000).toISOString());
  if (key === today) return "Hoje";
  if (key === yesterday) return "Ontem";
  return key.split("-").reverse().join("/");
}

/** Situação do fechamento pela diferença contado − esperado. */
export function diffKind(diff: number): "sobra" | "falta" | "ok" {
  if (Math.abs(diff) < 0.005) return "ok";
  return diff > 0 ? "sobra" : "falta";
}
