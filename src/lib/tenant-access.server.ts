// Server-only helper: bloqueia operações de tenant quando a assinatura está bloqueada.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { computeSubscriptionStatus } from "@/lib/subscription-status";

export async function isTenantBlocked(tenantId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("tenant_subscriptions")
    .select("status, due_date, grace_days, auto_block_enabled")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!data) return false; // fallback: sem assinatura = liberado (cortesia implícita)
  const c = computeSubscriptionStatus(data as never);
  return c.blocked;
}
