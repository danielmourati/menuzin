// Server-side plan helpers. Use inside createServerFn handlers AFTER you have
// resolved the effective tenantId.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ServerTenantPlan = "presenca" | "start" | "pro";

const RANK: Record<ServerTenantPlan, number> = { presenca: 0, start: 1, pro: 2 };

function normalize(raw: string | null | undefined): ServerTenantPlan {
  if (raw === "pro") return "pro";
  if (raw === "start") return "start";
  return "presenca";
}

export async function getTenantPlan(tenantId: string): Promise<ServerTenantPlan> {
  // Plano efetivo = slug do plano da assinatura (quando existe), senão tenants.plan.
  const { data: sub } = await supabaseAdmin
    .from("tenant_subscriptions")
    .select("plan:plans(slug)")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  const subSlug = (sub as { plan?: { slug?: string } | null } | null)?.plan?.slug ?? null;
  if (subSlug) return normalize(subSlug);
  const { data } = await supabaseAdmin
    .from("tenants")
    .select("plan")
    .eq("id", tenantId)
    .maybeSingle();
  return normalize((data as { plan?: string } | null)?.plan);
}

export async function requireProPlan(tenantId: string): Promise<void> {
  const plan = await getTenantPlan(tenantId);
  if (plan !== "pro") {
    throw new Error("Este recurso está disponível no Plano Pro.");
  }
}

export async function requirePlanAtLeast(
  tenantId: string,
  min: ServerTenantPlan,
): Promise<void> {
  const plan = await getTenantPlan(tenantId);
  if (RANK[plan] < RANK[min]) {
    throw new Error(
      `Este recurso está disponível a partir do Plano ${min === "start" ? "Start" : "Pro"}.`,
    );
  }
}

export interface ServerPlanLimits {
  max_products: number | null;
  max_categories: number | null;
  max_orders_per_month: number | null;
  max_users: number | null;
  features: Record<string, boolean>;
}

const DEFAULT_LIMITS: Record<ServerTenantPlan, ServerPlanLimits> = {
  presenca: {
    max_products: 20,
    max_categories: 4,
    max_orders_per_month: 0,
    max_users: 1,
    features: {},
  },
  start: {
    max_products: null,
    max_categories: null,
    max_orders_per_month: 400,
    max_users: 2,
    features: {},
  },
  pro: {
    max_products: null,
    max_categories: null,
    max_orders_per_month: null,
    max_users: null,
    features: {},
  },
};

export async function getTenantPlanLimits(tenantId: string): Promise<ServerPlanLimits> {
  const plan = await getTenantPlan(tenantId);
  const { data } = await supabaseAdmin
    .from("plans")
    .select("limits")
    .eq("slug", plan)
    .maybeSingle();
  const limits = (data as { limits?: ServerPlanLimits } | null)?.limits;
  return limits ?? DEFAULT_LIMITS[plan];
}
