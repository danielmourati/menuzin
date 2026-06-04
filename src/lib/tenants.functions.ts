import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveEffectiveTenantId, tryResolveEffectiveTenantId } from "@/lib/active-tenant.server";
import { RESERVED_SLUGS } from "@/lib/reserved-slugs";

const SlugSchema = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9-]+$/)
  .refine((s) => !RESERVED_SLUGS.has(s), { message: "Esse endereço é reservado pelo sistema." });

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
  .inputValidator((d: unknown) => d)
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) return { tenant: null };
    // Usa admin para garantir leitura mesmo quando platform_admin
    // está impersonando uma loja sem registro em user_roles.
    const { data: tenant } = await supabaseAdmin
      .from("tenants").select("*").eq("id", resolved.tenantId).maybeSingle();
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

// ===== Update do tenant pelo dono/admin =====

const UpdateTenantInput = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).optional(),
  whatsapp: z.string().min(8).max(20).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(40).optional(),
  address: z.string().max(240).optional(),
  prep_time: z.string().max(80).optional(),
  min_order: z.number().min(0).max(99999).optional(),
  delivery_fee: z.number().min(0).max(9999).optional(),
  hours: z.string().max(200).optional(),
  hours_schedule: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        enabled: z.boolean(),
        open: z.string().regex(/^\d{2}:\d{2}$/),
        close: z.string().regex(/^\d{2}:\d{2}$/),
      }),
    )
    .max(7)
    .optional(),
  open_mode: z.enum(["auto", "open", "closed"]).optional(),
  open: z.boolean().optional(),
  logo_url: z.string().max(1000).nullable().optional(),
  logo_letter: z.string().max(2).optional(),
  theme_from: z.string().max(40).optional(),
  theme_to: z.string().max(40).optional(),
  social: z.record(z.string().max(40), z.string().max(200)).optional(),
  pos_paper_width: z.enum(["55mm", "80mm"]).optional(),
  accepts_delivery: z.boolean().optional(),
  accepts_takeout: z.boolean().optional(),
  accepts_dinein: z.boolean().optional(),
  delivery_mode: z.enum(["none", "single", "neighborhood"]).optional(),
});


export const updateMyTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpdateTenantInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { tenantId, isPlatformAdmin } = await resolveEffectiveTenantId(supabase, userId);

    if (!isPlatformAdmin) {
      const { data: roles } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", userId).eq("tenant_id", tenantId);
      const allowed = new Set(["owner", "admin"]);
      if (!(roles ?? []).some((r) => allowed.has(r.role as string))) {
        throw new Error("Sem permissão para editar esta loja.");
      }
    }

    const client = isPlatformAdmin ? supabaseAdmin : supabase;
    const { error } = await client
      .from("tenants").update(data as never).eq("id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

