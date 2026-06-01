import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { DbCategory, DbProduct, DbAddon } from "@/lib/db-types";

type SB = SupabaseClient<Database>;

/**
 * Resolve o tenant_id do usuário autenticado e garante que ele possua
 * role owner/admin/staff naquele tenant. Roda sob o client autenticado,
 * portanto RLS continua aplicada como defesa em profundidade.
 */
async function getAuthorizedTenantId(supabase: SB, userId: string): Promise<string> {
  const { data: profile, error: pErr } = await supabase
    .from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
  if (pErr) throw new Error(`Falha ao ler perfil: ${pErr.message}`);
  const tenantId = profile?.tenant_id as string | null | undefined;
  if (!tenantId) throw new Error("Usuário sem loja vinculada.");

  const { data: roles, error: rErr } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).eq("tenant_id", tenantId);
  if (rErr) throw new Error(`Falha ao verificar permissões: ${rErr.message}`);
  const allowed = new Set(["owner", "admin", "staff", "platform_admin"]);
  const ok = (roles ?? []).some((r) => allowed.has(r.role as string));
  if (!ok) throw new Error("Sem permissão para gerenciar este catálogo.");

  return tenantId;
}

// ===== Categories =====

export const listMyCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);
    const { data, error } = await sb
      .from("categories").select("*").eq("tenant_id", tenantId).order("sort_order");
    if (error) throw new Error(error.message);
    return { categories: (data ?? []) as DbCategory[] };
  });

const CategoryInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().default(""),
  sort_order: z.number().int().min(0).max(9999).default(0),
  active: z.boolean().default(true),
});

export const saveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CategoryInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);
    if (data.id) {
      const { error } = await sb.from("categories").update({
        name: data.name, description: data.description ?? "",
        sort_order: data.sort_order, active: data.active,
      }).eq("id", data.id).eq("tenant_id", tenantId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await sb.from("categories").insert({
      tenant_id: tenantId, name: data.name, description: data.description ?? "",
      sort_order: data.sort_order, active: data.active,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);
    const { error } = await sb.from("categories")
      .delete().eq("id", data.id).eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Products =====

export const listMyProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);
    const { data: products, error: pErr } = await sb
      .from("products").select("*").eq("tenant_id", tenantId).order("sort_order");
    if (pErr) throw new Error(pErr.message);
    const productIds = (products ?? []).map((p) => p.id);
    let addons: DbAddon[] = [];
    if (productIds.length) {
      const { data: ad, error: aErr } = await sb
        .from("product_addons").select("*").in("product_id", productIds).order("sort_order");
      if (aErr) throw new Error(aErr.message);
      addons = (ad ?? []) as DbAddon[];
    }
    const byProduct = new Map<string, DbAddon[]>();
    for (const a of addons) {
      const arr = byProduct.get(a.product_id) ?? [];
      arr.push(a); byProduct.set(a.product_id, arr);
    }
    const list: DbProduct[] = ((products ?? []) as unknown as DbProduct[]).map((p) => ({
      ...p, addons: byProduct.get(p.id) ?? [],
    }));
    return { products: list };
  });

const ProductInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional().default(""),
  category_id: z.string().uuid().nullable().optional(),
  price: z.number().min(0).max(99999),
  promo_price: z.number().min(0).max(99999).nullable().optional(),
  image_url: z.string().max(1000).optional().nullable(),
  available: z.boolean().default(true),
  featured: z.boolean().default(false),
  prep_time: z.string().max(40).optional().nullable(),
  sort_order: z.number().int().min(0).max(99999).default(0),
});

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ProductInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);

    // Se uma categoria foi informada, garanta que pertence ao mesmo tenant.
    if (data.category_id) {
      const { data: cat, error: cErr } = await sb
        .from("categories").select("id").eq("id", data.category_id)
        .eq("tenant_id", tenantId).maybeSingle();
      if (cErr) throw new Error(cErr.message);
      if (!cat) throw new Error("Categoria inválida para este tenant.");
    }

    const payload = {
      name: data.name,
      description: data.description ?? "",
      category_id: data.category_id ?? null,
      price: data.price,
      promo_price: data.promo_price ?? null,
      image_url: data.image_url ?? null,
      available: data.available,
      featured: data.featured,
      prep_time: data.prep_time ?? null,
      sort_order: data.sort_order,
    };
    if (data.id) {
      const { error } = await sb.from("products")
        .update(payload).eq("id", data.id).eq("tenant_id", tenantId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await sb.from("products")
      .insert({ ...payload, tenant_id: tenantId }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);
    const { error } = await sb.from("products")
      .delete().eq("id", data.id).eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleProductAvailable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), available: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);
    const { error } = await sb.from("products")
      .update({ available: data.available }).eq("id", data.id).eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
