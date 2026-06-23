// Pure helpers para status efetivo de uma assinatura.
// Reutilizado em UI e server.

export type SubscriptionStatus =
  | "ativa"
  | "pendente"
  | "vencida"
  | "tolerancia"
  | "bloqueada"
  | "cancelada"
  | "teste"
  | "cortesia";

export interface SubscriptionLike {
  status: SubscriptionStatus;
  due_date: string | null;
  grace_days: number;
  auto_block_enabled: boolean;
}

export interface ComputedStatus {
  effective: SubscriptionStatus;
  expiringSoon: boolean;
  daysRemaining: number | null;
  /** true = bloquear acesso (storefront e admin avançado) */
  blocked: boolean;
}

const DAY_MS = 86400000;

function toDate(d: string | null): Date | null {
  if (!d) return null;
  const t = new Date(`${d}T00:00:00Z`);
  return isNaN(t.getTime()) ? null : t;
}

export function computeSubscriptionStatus(
  sub: SubscriptionLike | null | undefined,
  now: Date = new Date(),
): ComputedStatus {
  if (!sub) {
    // Fallback: sem assinatura = liberado em cortesia.
    return { effective: "cortesia", expiringSoon: false, daysRemaining: null, blocked: false };
  }
  if (sub.status === "cortesia" || sub.status === "teste") {
    return { effective: sub.status, expiringSoon: false, daysRemaining: null, blocked: false };
  }
  if (sub.status === "cancelada" || sub.status === "bloqueada") {
    return { effective: sub.status, expiringSoon: false, daysRemaining: null, blocked: true };
  }
  const due = toDate(sub.due_date);
  if (!due) {
    return {
      effective: sub.status,
      expiringSoon: false,
      daysRemaining: null,
      blocked: sub.status === "vencida",
    };
  }
  const diffMs = due.getTime() - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.ceil(diffMs / DAY_MS);

  if (days >= 0) {
    return {
      effective: "ativa",
      expiringSoon: days <= 5,
      daysRemaining: days,
      blocked: false,
    };
  }
  const overdueDays = -days;
  if (overdueDays <= sub.grace_days) {
    return {
      effective: "tolerancia",
      expiringSoon: true,
      daysRemaining: days,
      blocked: false,
    };
  }
  return {
    effective: sub.auto_block_enabled ? "bloqueada" : "vencida",
    expiringSoon: true,
    daysRemaining: days,
    blocked: sub.auto_block_enabled,
  };
}

export function nextDueDate(
  from: Date,
  period: "mensal" | "trimestral" | "semestral" | "anual" | "personalizado",
): Date {
  const d = new Date(from);
  const months: Record<string, number> = { mensal: 1, trimestral: 3, semestral: 6, anual: 12, personalizado: 1 };
  d.setUTCMonth(d.getUTCMonth() + (months[period] ?? 1));
  return d;
}

export const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  ativa: "Ativa",
  pendente: "Pendente",
  vencida: "Vencida",
  tolerancia: "Em tolerância",
  bloqueada: "Bloqueada",
  cancelada: "Cancelada",
  teste: "Período de teste",
  cortesia: "Cortesia",
};
