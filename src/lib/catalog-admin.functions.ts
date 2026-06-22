import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveEffectiveTenantId } from "@/lib/active-tenant.server";
import type { Database } from "@/integrations/supabase/types";
import type {
  DbCategory, DbProduct, DbAddon,
  DbProductSize, DbProductFlavor, DbAddonGroup, DbAddonOption, DbAddonGroupTarget,
  DbCategoryPizzaSize, DbCategoryPizzaDough, DbCategoryPizzaCrust,
} from "@/lib/db-types";

type SB = SupabaseClient<Database>;

async function getAuthorizedTenantId(supabase: SB, userId: string): Promise<string> {
  const { tenantId, isPlatformAdmin } = await resolveEffectiveTenantId(supabase, userId);
  if (isPlatformAdmin) return tenantId;

  const { data: roles, error: rErr } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).eq("tenant_id", tenantId);
  if (rErr) throw new Error(`Falha ao verificar permissões: ${rErr.message}`);
  const allowed = new Set(["owner", "admin", "staff"]);
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
  kind: z.enum(["standard", "pizza", "oferta"]).default("standard"),
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
        kind: data.kind,
      } as never).eq("id", data.id).eq("tenant_id", tenantId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await sb.from("categories").insert({
      tenant_id: tenantId, name: data.name, description: data.description ?? "",
      sort_order: data.sort_order, active: data.active,
      kind: data.kind,
    } as never).select("id").single();
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

async function loadProductDetails(sb: SB, productIds: string[]) {
  if (productIds.length === 0) {
    return {
      addons: [] as DbAddon[],
      sizes: [] as DbProductSize[],
      flavors: [] as DbProductFlavor[],
    };
  }
  const [{ data: addons }, { data: sizes }, { data: flavors }] = await Promise.all([
    sb.from("product_addons").select("*").in("product_id", productIds).order("sort_order"),
    sb.from("product_sizes").select("*").in("product_id", productIds).order("sort_order"),
    sb.from("product_flavors").select("*").in("product_id", productIds).order("sort_order"),
  ]);
  return {
    addons: (addons ?? []) as DbAddon[],
    sizes: (sizes ?? []) as DbProductSize[],
    flavors: (flavors ?? []) as DbProductFlavor[],
  };
}

export const listMyProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);
    const { data: products, error: pErr } = await sb
      .from("products").select("*").eq("tenant_id", tenantId).order("sort_order");
    if (pErr) throw new Error(pErr.message);
    const productIds = (products ?? []).map((p) => p.id as string);
    const { addons, sizes, flavors } = await loadProductDetails(sb, productIds);

    const groupBy = <T extends { product_id: string }>(arr: T[]) => {
      const m = new Map<string, T[]>();
      for (const x of arr) {
        const a = m.get(x.product_id) ?? [];
        a.push(x);
        m.set(x.product_id, a);
      }
      return m;
    };
    const aByP = groupBy(addons);
    const sByP = groupBy(sizes);
    const fByP = groupBy(flavors);

    const list: DbProduct[] = ((products ?? []) as unknown as DbProduct[]).map((p) => ({
      ...p,
      addons: aByP.get(p.id) ?? [],
      sizes: sByP.get(p.id) ?? [],
      flavors: fByP.get(p.id) ?? [],
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
  bestseller: z.boolean().default(false),
  prep_time: z.string().max(40).optional().nullable(),
  sort_order: z.number().int().min(0).max(99999).default(0),
  type: z.enum(["standard", "pizza"]).default("standard"),
  max_flavors: z.number().int().min(1).max(6).nullable().optional(),
  allow_observations: z.boolean().default(true),
  free_gift_kind: z.enum(["crust", "product"]).nullable().optional(),
  free_gift_ref_id: z.string().uuid().nullable().optional(),
  free_crust_mode: z.enum(["none", "fixed", "customer_choice"]).default("none"),
  // Oferta do Dia
  offer_original_price: z.number().min(0).max(99999).nullable().optional(),
  offer_fixed_size_id: z.string().uuid().nullable().optional(),
  offer_fixed_crust_id: z.string().uuid().nullable().optional(),
  offer_included_product_id: z.string().uuid().nullable().optional(),
  offer_fixed_flavor_ids: z.array(z.string().uuid()).optional().default([]),
  offer_pieces: z.number().int().min(1).max(99).nullable().optional(),
  offer_max_flavors: z.number().int().min(1).max(6).nullable().optional(),
});

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ProductInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);

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
      bestseller: data.bestseller,
      prep_time: data.prep_time ?? null,
      sort_order: data.sort_order,
      type: data.type,
      max_flavors: data.type === "pizza" ? (data.max_flavors ?? 1) : null,
      allow_observations: data.allow_observations,
      free_gift_kind: data.free_gift_kind ?? null,
      free_gift_ref_id: data.free_gift_ref_id ?? null,
      free_crust_mode: data.free_crust_mode,
      offer_original_price: data.offer_original_price ?? null,
      offer_fixed_size_id: data.offer_fixed_size_id ?? null,
      offer_fixed_crust_id: data.offer_fixed_crust_id ?? null,
      offer_included_product_id: data.offer_included_product_id ?? null,
      offer_fixed_flavor_ids: data.offer_fixed_flavor_ids ?? [],
      offer_pieces: data.offer_pieces ?? null,
      offer_max_flavors: data.offer_max_flavors ?? null,
    };
    if (data.id) {
      const { error } = await sb.from("products")
        .update(payload as never).eq("id", data.id).eq("tenant_id", tenantId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await sb.from("products")
      .insert({ ...payload, tenant_id: tenantId } as never).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);
    await sb.from("product_addons").delete().eq("product_id", data.id);
    await sb.from("product_sizes").delete().eq("product_id", data.id);
    await sb.from("product_flavors").delete().eq("product_id", data.id);
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

// ===== Product Sizes =====

async function assertProductOwnership(sb: SB, tenantId: string, productId: string) {
  const { data, error } = await sb.from("products").select("id").eq("id", productId).eq("tenant_id", tenantId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Produto inválido para este tenant.");
}

const SizeInput = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  name: z.string().min(1).max(60),
  price: z.number().min(0).max(99999),
  sort_order: z.number().int().min(0).max(9999).default(0),
  category_size_id: z.string().uuid().nullable().optional(),
});

export const saveProductSize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SizeInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);
    await assertProductOwnership(sb, tenantId, data.product_id);
    if (data.id) {
      const { error } = await sb.from("product_sizes").update({
        name: data.name, price: data.price, sort_order: data.sort_order,
        category_size_id: data.category_size_id ?? null,
      } as never).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await sb.from("product_sizes").insert({
      product_id: data.product_id, name: data.name, price: data.price, sort_order: data.sort_order,
      category_size_id: data.category_size_id ?? null,
    } as never).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteProductSize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    await getAuthorizedTenantId(sb, context.userId);
    const { error } = await sb.from("product_sizes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Product Flavors =====

const FlavorInput = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().default(""),
  price_delta: z.number().min(0).max(99999).default(0),
  available: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const saveProductFlavor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => FlavorInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);
    await assertProductOwnership(sb, tenantId, data.product_id);
    if (data.id) {
      const { error } = await sb.from("product_flavors").update({
        name: data.name, description: data.description ?? "",
        price_delta: data.price_delta, available: data.available, sort_order: data.sort_order,
      }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await sb.from("product_flavors").insert({
      product_id: data.product_id, name: data.name, description: data.description ?? "",
      price_delta: data.price_delta, available: data.available, sort_order: data.sort_order,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteProductFlavor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    await getAuthorizedTenantId(sb, context.userId);
    const { error } = await sb.from("product_flavors").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Addon Groups =====

export const listAddonGroups = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);
    const { data: groups, error } = await sb
      .from("addon_groups").select("*").eq("tenant_id", tenantId).order("sort_order");
    if (error) throw new Error(error.message);
    const groupIds = (groups ?? []).map((g) => g.id as string);
    if (!groupIds.length) {
      return { groups: [] as (DbAddonGroup & { targets: DbAddonGroupTarget[] })[] };
    }
    const [{ data: opts }, { data: targets }] = await Promise.all([
      sb.from("addon_options").select("*").in("group_id", groupIds).order("sort_order"),
      sb.from("addon_group_targets").select("*").in("group_id", groupIds),
    ]);
    const optsByGroup = new Map<string, DbAddonOption[]>();
    for (const o of (opts ?? []) as DbAddonOption[]) {
      const arr = optsByGroup.get(o.group_id) ?? [];
      arr.push(o); optsByGroup.set(o.group_id, arr);
    }
    const targetsByGroup = new Map<string, DbAddonGroupTarget[]>();
    for (const t of (targets ?? []) as DbAddonGroupTarget[]) {
      const arr = targetsByGroup.get(t.group_id) ?? [];
      arr.push(t); targetsByGroup.set(t.group_id, arr);
    }
    const out = ((groups ?? []) as unknown as DbAddonGroup[]).map((g) => ({
      ...g,
      options: optsByGroup.get(g.id) ?? [],
      targets: targetsByGroup.get(g.id) ?? [],
    }));
    return { groups: out };
  });

const AddonGroupInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().default(""),
  kind: z.enum(["adicional", "observacao"]).default("adicional"),
  required: z.boolean().default(false),
  min_select: z.number().int().min(0).max(20).default(0),
  max_select: z.number().int().min(1).max(20).default(1),
  active: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const saveAddonGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => AddonGroupInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);
    if (data.id) {
      const { error } = await sb.from("addon_groups").update({
        name: data.name, description: data.description ?? "",
        kind: data.kind, required: data.required,
        min_select: data.min_select, max_select: data.max_select,
        active: data.active, sort_order: data.sort_order,
      } as never).eq("id", data.id).eq("tenant_id", tenantId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await sb.from("addon_groups").insert({
      tenant_id: tenantId, name: data.name, description: data.description ?? "",
      kind: data.kind, required: data.required,
      min_select: data.min_select, max_select: data.max_select,
      active: data.active, sort_order: data.sort_order,
    } as never).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });


export const deleteAddonGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);
    await sb.from("addon_options").delete().eq("group_id", data.id);
    await sb.from("addon_group_targets").delete().eq("group_id", data.id);
    const { error } = await sb.from("addon_groups").delete()
      .eq("id", data.id).eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const AddonOptionInput = z.object({
  id: z.string().uuid().optional(),
  group_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  price: z.number().min(0).max(99999).default(0),
  active: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const saveAddonOption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => AddonOptionInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    await getAuthorizedTenantId(sb, context.userId);
    if (data.id) {
      const { error } = await sb.from("addon_options").update({
        name: data.name, price: data.price,
        active: data.active, sort_order: data.sort_order,
      }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await sb.from("addon_options").insert({
      group_id: data.group_id, name: data.name, price: data.price,
      active: data.active, sort_order: data.sort_order,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteAddonOption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    await getAuthorizedTenantId(sb, context.userId);
    const { error } = await sb.from("addon_options").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const TargetsInput = z.object({
  group_id: z.string().uuid(),
  category_ids: z.array(z.string().uuid()).default([]),
  product_ids: z.array(z.string().uuid()).default([]),
});

export const setAddonGroupTargets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => TargetsInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);
    // garante que o grupo é do tenant
    const { data: g, error: gErr } = await sb.from("addon_groups")
      .select("id").eq("id", data.group_id).eq("tenant_id", tenantId).maybeSingle();
    if (gErr) throw new Error(gErr.message);
    if (!g) throw new Error("Grupo inválido para este tenant.");

    await sb.from("addon_group_targets").delete().eq("group_id", data.group_id);
    const rows: { group_id: string; category_id: string | null; product_id: string | null }[] = [
      ...data.category_ids.map((cid) => ({ group_id: data.group_id, category_id: cid, product_id: null })),
      ...data.product_ids.map((pid) => ({ group_id: data.group_id, category_id: null, product_id: pid })),
    ];
    if (rows.length) {
      const { error } = await sb.from("addon_group_targets").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ===== Simplified Addon Items (flat: 1 group = 1 option) =====

export type AddonItem = {
  id: string;            // group id
  optionId: string | null;
  name: string;
  kind: "adicional" | "observacao";
  price: number;
  active: boolean;
  categoryIds: string[];
  sortOrder: number;
};

export const listAddonItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);
    const { data: groups, error } = await sb
      .from("addon_groups").select("*").eq("tenant_id", tenantId).order("sort_order");
    if (error) throw new Error(error.message);
    const ids = (groups ?? []).map((g) => g.id as string);
    if (!ids.length) return { items: [] as AddonItem[] };
    const [{ data: opts }, { data: targets }] = await Promise.all([
      sb.from("addon_options").select("*").in("group_id", ids).order("sort_order"),
      sb.from("addon_group_targets").select("*").in("group_id", ids),
    ]);
    const firstOpt = new Map<string, DbAddonOption>();
    for (const o of (opts ?? []) as DbAddonOption[]) {
      if (!firstOpt.has(o.group_id)) firstOpt.set(o.group_id, o);
    }
    const catsByGroup = new Map<string, string[]>();
    for (const t of (targets ?? []) as DbAddonGroupTarget[]) {
      if (!t.category_id) continue;
      const arr = catsByGroup.get(t.group_id) ?? [];
      arr.push(t.category_id); catsByGroup.set(t.group_id, arr);
    }
    const items: AddonItem[] = ((groups ?? []) as unknown as DbAddonGroup[]).map((g) => {
      const o = firstOpt.get(g.id);
      return {
        id: g.id,
        optionId: o?.id ?? null,
        name: g.name,
        kind: (g.kind ?? "adicional") as "adicional" | "observacao",
        price: o ? Number(o.price) : 0,
        active: g.active,
        categoryIds: catsByGroup.get(g.id) ?? [],
        sortOrder: g.sort_order,
      };
    });
    return { items };
  });

const AddonItemInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  kind: z.enum(["adicional", "observacao"]),
  price: z.number().min(0).max(99999).default(0),
  active: z.boolean().default(true),
  categoryIds: z.array(z.string().uuid()).default([]),
});

export const saveAddonItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => AddonItemInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);
    const price = data.kind === "observacao" ? 0 : Number(data.price) || 0;
    let groupId = data.id;

    if (groupId) {
      const { error } = await sb.from("addon_groups").update({
        name: data.name, kind: data.kind, required: false,
        min_select: 0, max_select: 1, active: data.active,
      }).eq("id", groupId).eq("tenant_id", tenantId);
      if (error) throw new Error(error.message);
    } else {
      const { data: row, error } = await sb.from("addon_groups").insert({
        tenant_id: tenantId, name: data.name, kind: data.kind, required: false,
        min_select: 0, max_select: 1, active: data.active, sort_order: 0,
      }).select("id").single();
      if (error) throw new Error(error.message);
      groupId = row.id as string;
    }

    // Reset options to a single canonical row
    await sb.from("addon_options").delete().eq("group_id", groupId);
    const { error: oErr } = await sb.from("addon_options").insert({
      group_id: groupId, name: data.name, price, active: data.active, sort_order: 0,
    });
    if (oErr) throw new Error(oErr.message);

    // Replace category targets (drop any product-level targets too — simplified UI)
    await sb.from("addon_group_targets").delete().eq("group_id", groupId);
    if (data.categoryIds.length) {
      const rows = data.categoryIds.map((cid) => ({
        group_id: groupId!, category_id: cid, product_id: null,
      }));
      const { error: tErr } = await sb.from("addon_group_targets").insert(rows);
      if (tErr) throw new Error(tErr.message);
    }
    return { id: groupId };
  });

export const deleteAddonItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);
    await sb.from("addon_options").delete().eq("group_id", data.id);
    await sb.from("addon_group_targets").delete().eq("group_id", data.id);
    const { error } = await sb.from("addon_groups").delete()
      .eq("id", data.id).eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Category Pizza Config (sizes / doughs / crusts) =====

async function assertCategoryOwnership(sb: SB, tenantId: string, categoryId: string) {
  const { data, error } = await sb.from("categories")
    .select("id, kind").eq("id", categoryId).eq("tenant_id", tenantId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Categoria inválida para este tenant.");
  return data as { id: string; kind: string };
}

const sbAny = (sb: SB) => sb as unknown as {
  from: (t: string) => ReturnType<SB["from"]>;
};

export const listCategoryPizzaConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ category_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);
    await assertCategoryOwnership(sb, tenantId, data.category_id);
    const [sizes, doughs, crusts] = await Promise.all([
      sbAny(sb).from("category_pizza_sizes").select("*").eq("category_id", data.category_id).order("sort_order"),
      sbAny(sb).from("category_pizza_doughs").select("*").eq("category_id", data.category_id).order("sort_order"),
      sbAny(sb).from("category_pizza_crusts").select("*").eq("category_id", data.category_id).order("sort_order"),
    ]);
    if (sizes.error) throw new Error(sizes.error.message);
    if (doughs.error) throw new Error(doughs.error.message);
    if (crusts.error) throw new Error(crusts.error.message);
    return {
      sizes: (sizes.data ?? []) as unknown as DbCategoryPizzaSize[],
      doughs: (doughs.data ?? []) as unknown as DbCategoryPizzaDough[],
      crusts: (crusts.data ?? []) as unknown as DbCategoryPizzaCrust[],
    };
  });

const PizzaSizeInput = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid(),
  name: z.string().min(1).max(60),
  pieces: z.number().int().min(1).max(24).default(8),
  max_flavors: z.number().int().min(1).max(8).default(1),
  pdv_code: z.string().max(40).optional().default(""),
  active: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const saveCategoryPizzaSize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => PizzaSizeInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);
    await assertCategoryOwnership(sb, tenantId, data.category_id);
    const payload = {
      category_id: data.category_id, name: data.name, pieces: data.pieces,
      max_flavors: data.max_flavors, pdv_code: data.pdv_code ?? "",
      active: data.active, sort_order: data.sort_order,
    };
    if (data.id) {
      const { error } = await sbAny(sb).from("category_pizza_sizes").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await sbAny(sb).from("category_pizza_sizes").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id };
  });

export const deleteCategoryPizzaSize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    await getAuthorizedTenantId(sb, context.userId);
    const { error } = await sbAny(sb).from("category_pizza_sizes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const PizzaDoughInput = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid(),
  name: z.string().min(1).max(60),
  extra_price: z.number().min(0).max(99999).default(0),
  pdv_code: z.string().max(40).optional().default(""),
  active: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const saveCategoryPizzaDough = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => PizzaDoughInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);
    await assertCategoryOwnership(sb, tenantId, data.category_id);
    const payload = {
      category_id: data.category_id, name: data.name, extra_price: data.extra_price,
      pdv_code: data.pdv_code ?? "", active: data.active, sort_order: data.sort_order,
    };
    if (data.id) {
      const { error } = await sbAny(sb).from("category_pizza_doughs").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await sbAny(sb).from("category_pizza_doughs").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id };
  });

export const deleteCategoryPizzaDough = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    await getAuthorizedTenantId(sb, context.userId);
    const { error } = await sbAny(sb).from("category_pizza_doughs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const PizzaCrustInput = PizzaDoughInput;

export const saveCategoryPizzaCrust = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => PizzaCrustInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);
    await assertCategoryOwnership(sb, tenantId, data.category_id);
    const payload = {
      category_id: data.category_id, name: data.name, extra_price: data.extra_price,
      pdv_code: data.pdv_code ?? "", active: data.active, sort_order: data.sort_order,
    };
    if (data.id) {
      const { error } = await sbAny(sb).from("category_pizza_crusts").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await sbAny(sb).from("category_pizza_crusts").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id };
  });

export const deleteCategoryPizzaCrust = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    await getAuthorizedTenantId(sb, context.userId);
    const { error } = await sbAny(sb).from("category_pizza_crusts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Reordenação manual (move up/down por sort_order) =====

const ReorderInput = z.object({
  entity: z.enum(["category", "product", "addonGroup", "addonOption"]),
  id: z.string().uuid(),
  direction: z.enum(["up", "down"]),
});

type ReorderEntity = "category" | "product" | "addonGroup" | "addonOption";

const TABLE_BY_ENTITY: Record<ReorderEntity, string> = {
  category: "categories",
  product: "products",
  addonGroup: "addon_groups",
  addonOption: "addon_options",
};

export const reorderCatalogItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ReorderInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SB;
    const tenantId = await getAuthorizedTenantId(sb, context.userId);
    const table = TABLE_BY_ENTITY[data.entity];

    // Carrega item atual e valida ownership pelo escopo apropriado.
    let scopeFilter: { column: string; value: string };
    let currentSort: number;
    if (data.entity === "addonOption") {
      const { data: opt, error: oErr } = await sbAny(sb)
        .from("addon_options").select("id, group_id, sort_order").eq("id", data.id).maybeSingle();
      if (oErr || !opt) throw new Error("Item não encontrado.");
      // Verifica que o grupo pertence ao tenant.
      const { data: g, error: gErr } = await sb
        .from("addon_groups").select("id, tenant_id").eq("id", (opt as { group_id: string }).group_id).maybeSingle();
      if (gErr || !g || g.tenant_id !== tenantId) throw new Error("Sem permissão.");
      scopeFilter = { column: "group_id", value: (opt as { group_id: string }).group_id };
      currentSort = Number((opt as { sort_order: number }).sort_order ?? 0);
    } else {
      const { data: row, error } = await sbAny(sb)
        .from(table).select("id, tenant_id, sort_order").eq("id", data.id).maybeSingle();
      if (error || !row) throw new Error("Item não encontrado.");
      if ((row as { tenant_id: string }).tenant_id !== tenantId) throw new Error("Sem permissão.");
      scopeFilter = { column: "tenant_id", value: tenantId };
      currentSort = Number((row as { sort_order: number }).sort_order ?? 0);
    }

    // Busca o vizinho na direção desejada (próximo sort_order acima/abaixo).
    const neighborQuery = sbAny(sb)
      .from(table)
      .select("id, sort_order")
      .eq(scopeFilter.column, scopeFilter.value);
    const neighborRes = data.direction === "up"
      ? await neighborQuery.lt("sort_order", currentSort).order("sort_order", { ascending: false }).limit(1)
      : await neighborQuery.gt("sort_order", currentSort).order("sort_order", { ascending: true }).limit(1);
    if (neighborRes.error) throw new Error(neighborRes.error.message);
    const neighbor = (neighborRes.data ?? [])[0] as { id: string; sort_order: number } | undefined;
    if (!neighbor) return { ok: true, swapped: false };

    // Swap atômico — duas updates.
    const [u1, u2] = await Promise.all([
      sbAny(sb).from(table).update({ sort_order: neighbor.sort_order }).eq("id", data.id),
      sbAny(sb).from(table).update({ sort_order: currentSort }).eq("id", neighbor.id),
    ]);
    if (u1.error) throw new Error(u1.error.message);
    if (u2.error) throw new Error(u2.error.message);
    return { ok: true, swapped: true };
  });
