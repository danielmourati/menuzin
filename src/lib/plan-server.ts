// Server-side plan helpers. Use inside createServerFn handlers AFTER you have
// resolved the effective tenantId.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ServerTenantPlan = "start" | "pro";

function normalize(raw: string | null | undefined): ServerTenantPlan {
  return raw === "pro" ? "pro" : "start";
}

export async function getTenantPlan(tenantId: string): Promise<ServerTenantPlan> {
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
