import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SlugSchema = z.string().min(2).max(60).regex(/^[a-z0-9-]+$/);

const ClaimInput = z.object({
  slug: SlugSchema,
  name: z.string().min(2).max(120),
  whatsapp: z.string().min(8).max(20),
  city: z.string().min(2).max(80),
});

/**
 * Cria uma nova loja e vincula o usuário autenticado como owner.
 * Usado no onboarding pós-signup quando o usuário ainda não tem tenant.
 */
export const claimNewTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ClaimInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // garante que o usuário ainda não tem tenant
    const { data: existing } = await supabaseAdmin
      .from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
    if (existing?.tenant_id) {
      return { tenant_id: existing.tenant_id, alreadyClaimed: true };
    }

    // checa slug livre
    const { data: taken } = await supabaseAdmin
      .from("tenants").select("id").eq("slug", data.slug).maybeSingle();
    if (taken) throw new Error("Esse endereço já está em uso. Escolha outro.");

    const { data: tenant, error: tErr } = await supabaseAdmin
      .from("tenants")
      .insert({
        slug: data.slug,
        name: data.name,
        whatsapp: data.whatsapp,
        city: data.city,
        logo_letter: data.name.charAt(0).toUpperCase(),
        plan: "start",
        status: "teste",
      })
      .select("id").single();
    if (tErr || !tenant) throw new Error(tErr?.message || "Falha ao criar loja");

    await supabaseAdmin.from("profiles").update({ tenant_id: tenant.id }).eq("id", userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, tenant_id: tenant.id, role: "owner" });

    return { tenant_id: tenant.id, alreadyClaimed: false };
  });

export const getMyTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
    if (!profile?.tenant_id) return { tenant: null };
    const { data: tenant } = await supabase
      .from("tenants").select("*").eq("id", profile.tenant_id).maybeSingle();
    return { tenant };
  });

const CheckSlugInput = z.object({ slug: SlugSchema });
export const isSlugAvailable = createServerFn({ method: "POST" })
  .inputValidator((d) => CheckSlugInput.parse(d))
  .handler(async ({ data }) => {
    const { data: taken } = await supabaseAdmin
      .from("tenants").select("id").eq("slug", data.slug).maybeSingle();
    return { available: !taken };
  });
