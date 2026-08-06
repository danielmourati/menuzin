// Admin do lojista para o Guia Menuzin.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveEffectiveTenantId } from "@/lib/active-tenant.server";

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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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
      .from("tenants").update(payload as never).eq("id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyDirectoryProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { tenantId } = await resolveEffectiveTenantId(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { inferGuiaCategory } = await import("@/lib/guia-category-infer");

    const [{ data: t }, { data: prods, error }, { data: cats, error: catsErr }, { data: menuCats }] = await Promise.all([
      supabaseAdmin
        .from("tenants")
        .select("id, name, neighborhood, cep, directory_opt_in, plan, business_types")
        .eq("id", tenantId).maybeSingle(),
      supabaseAdmin
        .from("products")
        .select("id, name, image_url, price, promo_price, available, directory_visible, directory_category, directory_featured_until, category_id")
        .eq("tenant_id", tenantId)
        .order("name"),
      supabaseAdmin
        .from("guia_categories")
        .select("slug, label, emoji")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("categories")
        .select("id, name")
        .eq("tenant_id", tenantId),
    ]);
    if (error) throw new Error(error.message);
    if (catsErr) throw new Error(catsErr.message);

    const tenant = (t ?? null) as {
      id: string; name: string; neighborhood: string | null; cep: string | null;
      directory_opt_in: boolean; plan: string; business_types: string[] | null;
    } | null;
    const catName = new Map(
      ((menuCats ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]),
    );
    const activeSlugs = new Set(((cats ?? []) as { slug: string }[]).map((c) => c.slug));

    const products = ((prods ?? []) as {
      id: string; name: string; image_url: string | null; price: number; promo_price: number | null;
      available: boolean; directory_visible: boolean;
      directory_category: string | null; directory_featured_until: string | null; category_id: string | null;
    }[]).map((p) => {
      const suggested = inferGuiaCategory({
        menuCategoryName: p.category_id ? (catName.get(p.category_id) ?? null) : null,
        productName: p.name,
        businessTypes: tenant?.business_types ?? [],
      });
      return {
        ...p,
        menu_category_name: p.category_id ? (catName.get(p.category_id) ?? null) : null,
        suggested_category: suggested && activeSlugs.has(suggested) ? suggested : null,
      };
    });

    const { paidProductIds } = await import("@/lib/directory-spotlight.server");
    const paidIds = await paidProductIds(supabaseAdmin, tenantId);

    return {
      tenant,
      products,
      paidFeaturedIds: paidIds,
      guiaCategories: (cats ?? []) as { slug: string; label: string; emoji: string }[],
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: activeCats } = await supabaseAdmin
      .from("guia_categories")
      .select("slug")
      .eq("active", true);
    const validSlugs = new Set((activeCats ?? []).map((c) => (c as { slug: string }).slug));

    if (data.directory_category && !validSlugs.has(data.directory_category)) {
      throw new Error("Categoria inválida ou desativada.");
    }
    if (data.directory_visible === true) {
      const { data: p } = await supabaseAdmin
        .from("products").select("directory_category, name, category_id").eq("id", data.product_id).maybeSingle();
      const row = p as { directory_category: string | null; name: string; category_id: string | null } | null;
      let cat = data.directory_category ?? row?.directory_category ?? null;
      if (!cat && row) {
        // Herda a categoria sugerida pelo cardápio quando o lojista não escolheu nenhuma.
        const { inferGuiaCategory } = await import("@/lib/guia-category-infer");
        const [{ data: mc }, { data: tn }] = await Promise.all([
          row.category_id
            ? supabaseAdmin.from("categories").select("name").eq("id", row.category_id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabaseAdmin.from("tenants").select("business_types").eq("id", tenantId).maybeSingle(),
        ]);
        const suggested = inferGuiaCategory({
          menuCategoryName: (mc as { name?: string } | null)?.name ?? null,
          productName: row.name,
          businessTypes: (tn as { business_types?: string[] | null } | null)?.business_types ?? [],
        });
        if (suggested && validSlugs.has(suggested)) {
          cat = suggested;
          data.directory_category = suggested;
        }
      }
      if (!cat || !validSlugs.has(cat)) throw new Error("Escolha uma categoria ativa antes de publicar.");
    }

    const payload: Record<string, unknown> = {};
    if (data.directory_visible !== undefined) payload.directory_visible = data.directory_visible;
    if (data.directory_category !== undefined) payload.directory_category = data.directory_category;


    const { error } = await supabaseAdmin
      .from("products").update(payload as never).eq("id", data.product_id).eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Destaque gratuito: cada loja pode manter 1 produto na seção "Em destaque agora".
 * Destaques adicionais são solicitados via PIX (guia_promo_requests).
 */
export const setFreeSpotlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ product_id: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { tenantId } = await resolveEffectiveTenantId(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { paidProductIds, FAR_FUTURE_ISO } = await import("@/lib/directory-spotlight.server");
    const paidIds = await paidProductIds(supabaseAdmin, tenantId);

    // limpa o destaque gratuito anterior (mantém os pagos)
    const { data: current } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("tenant_id", tenantId)
      .not("directory_featured_until", "is", null);
    const toClear = ((current ?? []) as { id: string }[])
      .map((p) => p.id)
      .filter((id) => !paidIds.includes(id) && id !== data.product_id);
    if (toClear.length) {
      await supabaseAdmin
        .from("products")
        .update({ directory_featured_until: null })
        .in("id", toClear)
        .eq("tenant_id", tenantId);
    }

    if (data.product_id) {
      const { error } = await supabaseAdmin
        .from("products")
        .update({ directory_featured_until: FAR_FUTURE_ISO, directory_visible: true })
        .eq("id", data.product_id)
        .eq("tenant_id", tenantId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });


export const clearDirectoryFeature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ product_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { tenantId } = await resolveEffectiveTenantId(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("products")
      .update({ directory_featured_until: null })
      .eq("id", data.product_id)
      .eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
