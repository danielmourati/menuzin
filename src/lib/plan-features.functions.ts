// Server fn que retorna o plano efetivo do tenant do usuário autenticado.
// Fonte da verdade = tenant_subscriptions.plan.slug (fallback tenants.plan).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tryResolveEffectiveTenantId } from "@/lib/active-tenant.server";

export type EffectivePlan = "presenca" | "start" | "pro";

export const getMyEffectivePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ plan: EffectivePlan | null }> => {
    const resolved = await tryResolveEffectiveTenantId(context.supabase, context.userId);
    if (!resolved?.tenantId) return { plan: null };
    const { getTenantPlan } = await import("@/lib/plan-server");
    const plan = await getTenantPlan(resolved.tenantId);
    return { plan };
  });
