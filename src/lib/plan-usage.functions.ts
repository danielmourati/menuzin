import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tryResolveEffectiveTenantId } from "@/lib/active-tenant.server";

export interface PlanUsage {
  plan: "presenca" | "start" | "pro";
  monthly_orders_used: number;
  monthly_orders_limit: number | null; // null = ilimitado, 0 = não aceita pedidos
  products_used: number;
  products_limit: number | null;
  categories_used: number;
  categories_limit: number | null;
}

export const getMyPlanUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlanUsage | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getTenantPlan, getTenantPlanLimits } = await import("@/lib/plan-server");
    const resolved = await tryResolveEffectiveTenantId(context.supabase, context.userId);
    if (!resolved?.tenantId) return null;
    const tenantId = resolved.tenantId;

    const [plan, limits] = await Promise.all([
      getTenantPlan(tenantId),
      getTenantPlanLimits(tenantId),
    ]);

    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const [ordersRes, productsRes, categoriesRes] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("created_at", startOfMonth.toISOString()),
      supabaseAdmin
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
      supabaseAdmin
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
    ]);

    return {
      plan,
      monthly_orders_used: ordersRes.count ?? 0,
      monthly_orders_limit: limits.max_orders_per_month,
      products_used: productsRes.count ?? 0,
      products_limit: limits.max_products,
      categories_used: categoriesRes.count ?? 0,
      categories_limit: limits.max_categories,
    };
  });
