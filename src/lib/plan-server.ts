// Server-side plan helpers. Use inside createServerFn handlers AFTER you have
// resolved the effective tenantId.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizePlan, type TenantPlan } from "@/lib/plan-features";

export async function getTenantPlan(tenantId: string): Promise<TenantPlan> {
  const { data } = await supabaseAdmin
    .from("tenants")
    .select("plan")
    .eq("id", tenantId)
    .maybeSingle();
  return normalizePlan((data as { plan?: string } | null)?.plan);
}

export async function requireProPlan(tenantId: string): Promise<void> {
  const plan = await getTenantPlan(tenantId);
  if (plan !== "pro") {
    throw new Error("Este recurso está disponível no Plano Pro.");
  }
}
