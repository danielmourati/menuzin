import { getRequestHeader } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ResolvedTenant = {
  tenantId: string;
  isPlatformAdmin: boolean;
  isImpersonating: boolean;
};

/**
 * Resolve o tenant efetivo para a chamada atual.
 *
 * - Se o usuário tem role `platform_admin` E enviou header `X-Active-Tenant`
 *   com um UUID de tenant existente → usa esse tenant (impersonação).
 * - Caso contrário → cai para `profiles.tenant_id` do próprio usuário.
 * - Lança se nenhum tenant puder ser resolvido.
 */
export async function resolveEffectiveTenantId(
  sb: SB,
  userId: string,
): Promise<ResolvedTenant> {
  const { data: padminRow } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "platform_admin")
    .maybeSingle();
  const isPlatformAdmin = !!padminRow;

  const headerTenant = (getRequestHeader("x-active-tenant") ?? "").trim();
  if (isPlatformAdmin && headerTenant && UUID_RE.test(headerTenant)) {
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("id", headerTenant)
      .maybeSingle();
    if (tenant) {
      return { tenantId: tenant.id as string, isPlatformAdmin, isImpersonating: true };
    }
  }

  const { data: profile } = await sb
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle();
  const tenantId = profile?.tenant_id as string | null | undefined;
  if (!tenantId) throw new Error("Usuário sem loja vinculada.");
  return { tenantId, isPlatformAdmin, isImpersonating: false };
}

/** Versão que retorna null em vez de lançar quando não há tenant. */
export async function tryResolveEffectiveTenantId(
  sb: SB,
  userId: string,
): Promise<ResolvedTenant | null> {
  try {
    return await resolveEffectiveTenantId(sb, userId);
  } catch {
    return null;
  }
}
