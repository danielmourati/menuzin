import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveEffectiveTenantId } from "@/lib/active-tenant.server";
import { DIRECTORY_CATEGORIES } from "@/lib/directory.functions";

const VALID_CATEGORIES = new Set(DIRECTORY_CATEGORIES.map((c) => c.slug));
const CepRe = /^\d{5}-?\d{3}$/;

const OptInInput = z.object({
  opt_in: z.boolean(),
  neighborhood: z.string().min(2).max(80).optional(),
  cep: z.string().regex(CepRe).optional(),
});

export const setDirectoryOptIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => OptInInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { tenantId } = await resolveEffectiveTenantId(supabase, userId);

    const payload: Record<string, unknown> = { directory_opt_in: data.opt_in };
    if (data.neighborhood !== undefined) payload.neighborhood = data.neighborhood;
    if (data.cep !== undefined) payload.cep = data.cep;

    if (data.opt_in) {
      const { data: t } = await supabaseAdmin
        .from("tenants").select("neighborhood").eq("id", tenantId).maybeSingle();
      const finalNeighborhood = (data.neighborhood ?? (t as { neighborhood: string | null } | null)?.neighborhood) ?? null;
      if (!finalNeighborhood) throw new Error("Preencha o bairro antes de ativar o Guia.");
    }

    const { error } = await supabaseAdmin
      .from("tenants").update(payload).eq("id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyDirectoryProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { tenantId } = await resolveEffectiveTenantId(supabase, userId);
    const { data: t } = await supabaseAdmin
      .from("tenants")
      .select("id, name, neighborhood, cep, directory_opt_in, plan")
      .eq("id", tenantId).maybeSingle();
    const { data: prods, error } = await supabaseAdmin
      .from("products")
      .select("id, name, image_url, price, promo_price, available, directory_visible, directory_category, directory_featured_until")
      .eq("tenant_id", tenantId)
      .order("name");
    if (error) throw new Error(error.message);
    return {
      tenant: (t ?? null) as {
        id: string; name: string; neighborhood: string | null; cep: string | null;
        directory_opt_in: boolean; plan: string;
      } | null,
      products: (prods ?? []) as {
        id: string; name: string; image_url: string | null; price: number; promo_price: number | null;
        available: boolean; directory_visible: boolean;
        directory_category: string | null; directory_featured_until: string | null;
      }[],
    };
  });

const UpdateProductInput = z.object({
  product_id: z.string().uuid(),
  directory_visible: z.boolean().optional(),
  directory_category: z.string().nullable().optional(),
});
export const updateDirectoryProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpdateProductInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { tenantId } = await resolveEffectiveTenantId(supabase, userId);

    if (data.directory_category && !VALID_CATEGORIES.has(data.directory_category)) {
      throw new Error("Categoria inválida.");
    }
    if (data.directory_visible === true) {
      const { data: p } = await supabaseAdmin
        .from("products").select("directory_category").eq("id", data.product_id).maybeSingle();
      const cat = data.directory_category ?? (p as { directory_category: string | null } | null)?.directory_category;
      if (!cat) throw new Error("Escolha uma categoria antes de publicar.");
    }

    const payload: Record<string, unknown> = {};
    if (data.directory_visible !== undefined) payload.directory_visible = data.directory_visible;
    if (data.directory_category !== undefined) payload.directory_category = data.directory_category;

    const { error } = await supabaseAdmin
      .from("products").update(payload).eq("id", data.product_id).eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const FeatureInput = z.object({ product_id: z.string().uuid(), days: z.number().int().min(1).max(30).default(7) });
export const featureDirectoryProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => FeatureInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { tenantId } = await resolveEffectiveTenantId(supabase, userId);
    const { data: t } = await supabaseAdmin
      .from("tenants").select("plan").eq("id", tenantId).maybeSingle();
    const plan = (t as { plan: string } | null)?.plan ?? "start";
    if (plan !== "pro") throw new Error("Destaque disponível no plano Pro.");

    const until = new Date(Date.now() + data.days * 24 * 3600 * 1000).toISOString();
    const { error } = await supabaseAdmin
      .from("products")
      .update({ directory_featured_until: until })
      .eq("id", data.product_id)
      .eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return { until };
  });

export const clearDirectoryFeature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ product_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { tenantId } = await resolveEffectiveTenantId(supabase, userId);
    const { error } = await supabaseAdmin
      .from("products")
      .update({ directory_featured_until: null })
      .eq("id", data.product_id)
      .eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
