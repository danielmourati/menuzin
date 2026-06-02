import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveEffectiveTenantId } from "@/lib/active-tenant.server";
import type { Database } from "@/integrations/supabase/types";
import type {
  DbCategory, DbProduct, DbAddon,
  DbProductSize, DbProductFlavor, DbAddonGroup, DbAddonOption, DbAddonGroupTarget,
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
  prep_time: z.string().max(40).optional().nullable(),
  sort_order: z.number().int().min(0).max(99999).default(0),
  type: z.enum(["standard", "pizza"]).default("standard"),
  max_flavors: z.number().int().min(1).max(6).nullable().optional(),
  allow_observations: z.boolean().default(true),
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
      prep_time: data.prep_time ?? null,
      sort_order: data.sort_order,
      type: data.type,
      max_flavors: data.type === "pizza" ? (data.max_flavors ?? 1) : null,
      allow_observations: data.allow_observations,
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
      }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await sb.from("product_sizes").insert({
      product_id: data.product_id, name: data.name, price: data.price, sort_order: data.sort_order,
    }).select("id").single();
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
        name: data.name, kind: data.kind, required: data.required,
        min_select: data.min_select, max_select: data.max_select,
        active: data.active, sort_order: data.sort_order,
      }).eq("id", data.id).eq("tenant_id", tenantId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await sb.from("addon_groups").insert({
      tenant_id: tenantId, name: data.name, kind: data.kind, required: data.required,
      min_select: data.min_select, max_select: data.max_select,
      active: data.active, sort_order: data.sort_order,
    }).select("id").single();
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
