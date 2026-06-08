// Plan-based feature flags. Pure helpers — no React, safe in server & client.

export type TenantPlan = "start" | "pro";

export type PlanFeature =
  | "reports"
  | "whatsappOrders"
  | "dashboard"
  | "orderStatus"
  | "mercadoPago"
  | "multiplePrinters"
  | "kitchenPrinter"
  | "prioritySupport";

export const PLAN_FEATURES: Record<TenantPlan, Record<PlanFeature, boolean>> = {
  start: {
    reports: true,
    whatsappOrders: true,
    dashboard: true,
    orderStatus: true,
    mercadoPago: false,
    multiplePrinters: false,
    kitchenPrinter: false,
    prioritySupport: false,
  },
  pro: {
    reports: true,
    whatsappOrders: true,
    dashboard: true,
    orderStatus: true,
    mercadoPago: true,
    multiplePrinters: true,
    kitchenPrinter: true,
    prioritySupport: true,
  },
};

/** Normaliza qualquer valor vindo do banco para um plano suportado. Fallback = "start". */
export function normalizePlan(raw: string | null | undefined): TenantPlan {
  return raw === "pro" ? "pro" : "start";
}

export function canUse(plan: TenantPlan | null | undefined, feature: PlanFeature): boolean {
  return PLAN_FEATURES[normalizePlan(plan)][feature];
}

export const PLAN_LABEL: Record<TenantPlan, string> = {
  start: "Start",
  pro: "Pro",
};
