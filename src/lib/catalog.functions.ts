import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  DbTenant, DbCategory, DbProduct, DbAddon,
  DbProductSize, DbProductFlavor, DbAddonGroup, DbAddonOption, DbAddonGroupTarget,
  DbCategoryPizzaSize, DbCategoryPizzaDough, DbCategoryPizzaCrust,
} from "@/lib/db-types";

const SlugInput = z.object({ slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/) });

async function attachRatingToTenant(tenant: any) {
  if (!tenant) return tenant;
  const { data: rRows } = await supabaseAdmin
    .from("order_ratings")
    .select("stars")
    .eq("tenant_id", tenant.id);
  
  let rating_avg = null;
  let rating_count = 0;
  if (rRows && rRows.length > 0) {
    const sum = rRows.reduce((acc, r) => acc + (Number(r.stars) || 0), 0);
    rating_count = rRows.length;
    rating_avg = Math.round((sum / rating_count) * 10) / 10;
  }
  return { ...tenant, rating_avg, rating_count };
}

export const getTenantBySlug = createServerFn({ method: "POST" })
  .inputValidator((d) => SlugInput.parse(d))
  .handler(async ({ data }) => {
    const { data: tenantRow, error } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("slug", data.slug)
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!tenantRow) return { tenant: null as DbTenant | null };
    const { getTenantPlan } = await import("@/lib/plan-server");
    const [tenantWithRating, plan] = await Promise.all([
      attachRatingToTenant(tenantRow),
      getTenantPlan(tenantRow.id as string),
    ]);
    return { tenant: { ...tenantWithRating, plan } as DbTenant };
  });

export const getCatalog = createServerFn({ method: "POST" })
  .inputValidator((d) => SlugInput.parse(d))
  .handler(async ({ data }) => {
    // Batch 1: Tenant lookup by slug
    const { data: tenantRow, error: tErr } = await supabaseAdmin
      .from("tenants").select("*").eq("slug", data.slug).eq("active", true).maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!tenantRow) return { tenant: null, categories: [], products: [], pizzaSizes: [], pizzaDoughs: [], pizzaCrusts: [], blocked: false };

    const tenantId = tenantRow.id as string;

    // Batch 2: Fetch tenant plan, ratings, block status, categories, products, and addon_groups IN PARALLEL
    const { getTenantPlan } = await import("@/lib/plan-server");
    const { isTenantBlocked } = await import("@/lib/tenant-access.server");

    const [
      { data: rRows },
      plan,
      blocked,
      { data: categories },
      { data: products },
      { data: groupsRaw },
    ] = await Promise.all([
      supabaseAdmin.from("order_ratings").select("stars").eq("tenant_id", tenantId),
      getTenantPlan(tenantId),
      isTenantBlocked(tenantId),
      supabaseAdmin.from("categories").select("*").eq("tenant_id", tenantId).eq("active", true).order("sort_order"),
      supabaseAdmin.from("products").select("*").eq("tenant_id", tenantId).order("sort_order"),
      supabaseAdmin.from("addon_groups").select("*").eq("tenant_id", tenantId).eq("active", true).order("sort_order"),
    ]);

    let rating_avg = null;
    let rating_count = 0;
    if (rRows && rRows.length > 0) {
      const sum = rRows.reduce((acc, r) => acc + (Number(r.stars) || 0), 0);
      rating_count = rRows.length;
      rating_avg = Math.round((sum / rating_count) * 10) / 10;
    }
    const tenantWithEffectivePlan = { ...tenantRow, rating_avg, rating_count, plan } as DbTenant;

    if (blocked) {
      return { tenant: tenantWithEffectivePlan, categories: [], products: [], pizzaSizes: [], pizzaDoughs: [], pizzaCrusts: [], blocked: true };
    }

    const cats = (categories ?? []) as DbCategory[];
    const catNameById = new Map(cats.map((c) => [c.id, c.name]));
    const prodList = ((products ?? []) as unknown) as DbProduct[];
    const prodIds = prodList.map((p) => p.id);

    const groups = ((groupsRaw ?? []) as unknown) as DbAddonGroup[];
    const groupIds = groups.map((g) => g.id);

    const pizzaCats = cats.filter((c) => (c as DbCategory).kind === "pizza").map((c) => c.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sbAny = supabaseAdmin as unknown as { from: (t: string) => any };

    // Batch 3: Fetch all item-level details (sizes, flavors, addons, addon_options, targets, pizza configs) IN PARALLEL
    const [
      { data: sizes },
      { data: flavors },
      { data: addons },
      { data: opts },
      { data: targets },
      { data: pSizes },
      { data: pDoughs },
      { data: pCrusts },
    ] = await Promise.all([
      prodIds.length
        ? supabaseAdmin.from("product_sizes").select("*").in("product_id", prodIds).order("sort_order")
        : Promise.resolve({ data: [] }),
      prodIds.length
        ? supabaseAdmin.from("product_flavors").select("*").in("product_id", prodIds).eq("available", true).order("sort_order")
        : Promise.resolve({ data: [] }),
      prodIds.length
        ? supabaseAdmin.from("product_addons").select("*").in("product_id", prodIds).order("sort_order")
        : Promise.resolve({ data: [] }),
      groupIds.length
        ? supabaseAdmin.from("addon_options").select("*").in("group_id", groupIds).eq("active", true).order("sort_order")
        : Promise.resolve({ data: [] }),
      groupIds.length
        ? supabaseAdmin.from("addon_group_targets").select("*").in("group_id", groupIds)
        : Promise.resolve({ data: [] }),
      pizzaCats.length
        ? sbAny.from("category_pizza_sizes").select("*").in("category_id", pizzaCats).eq("active", true).order("sort_order")
        : Promise.resolve({ data: [] }),
      pizzaCats.length
        ? sbAny.from("category_pizza_doughs").select("*").in("category_id", pizzaCats).eq("active", true).order("sort_order")
        : Promise.resolve({ data: [] }),
      pizzaCats.length
        ? sbAny.from("category_pizza_crusts").select("*").in("category_id", pizzaCats).eq("active", true).order("sort_order")
        : Promise.resolve({ data: [] }),
    ]);

    const optionsByGroup = new Map<string, DbAddonOption[]>();
    for (const o of (opts ?? []) as DbAddonOption[]) {
      const arr = optionsByGroup.get(o.group_id) ?? [];
      arr.push(o);
      optionsByGroup.set(o.group_id, arr);
    }
    const groupsById = new Map<string, DbAddonGroup>();
    for (const g of groups) {
      groupsById.set(g.id, { ...g, options: optionsByGroup.get(g.id) ?? [] });
    }

    // Resolve grupos por produto: targets diretos OU targets por categoria
    const groupsByProduct = new Map<string, DbAddonGroup[]>();
    const productsByCategory = new Map<string, string[]>();
    for (const p of prodList) {
      if (p.category_id) {
        const arr = productsByCategory.get(p.category_id) ?? [];
        arr.push(p.id);
        productsByCategory.set(p.category_id, arr);
      }
    }
    const addGroupToProduct = (pid: string, g: DbAddonGroup) => {
      const arr = groupsByProduct.get(pid) ?? [];
      if (!arr.some((x) => x.id === g.id)) arr.push(g);
      groupsByProduct.set(pid, arr);
    };
    for (const t of (targets ?? []) as DbAddonGroupTarget[]) {
      const g = groupsById.get(t.group_id);
      if (!g) continue;
      if (t.product_id) addGroupToProduct(t.product_id, g);
      if (t.category_id) {
        for (const pid of productsByCategory.get(t.category_id) ?? []) addGroupToProduct(pid, g);
      }
    }

    const addonsByProduct = new Map<string, DbAddon[]>();
    for (const a of (addons ?? []) as DbAddon[]) {
      const arr = addonsByProduct.get(a.product_id) ?? [];
      arr.push(a);
      addonsByProduct.set(a.product_id, arr);
    }
    const sizesByProduct = new Map<string, DbProductSize[]>();
    for (const s of (sizes ?? []) as DbProductSize[]) {
      const arr = sizesByProduct.get(s.product_id) ?? [];
      arr.push(s);
      sizesByProduct.set(s.product_id, arr);
    }
    const flavorsByProduct = new Map<string, DbProductFlavor[]>();
    for (const f of (flavors ?? []) as DbProductFlavor[]) {
      const arr = flavorsByProduct.get(f.product_id) ?? [];
      arr.push(f);
      flavorsByProduct.set(f.product_id, arr);
    }

    const prods: DbProduct[] = prodList.map((p) => ({
      ...p,
      addons: addonsByProduct.get(p.id) ?? [],
      sizes: sizesByProduct.get(p.id) ?? [],
      flavors: flavorsByProduct.get(p.id) ?? [],
      addonGroups: (groupsByProduct.get(p.id) ?? []).sort((a, b) => a.sort_order - b.sort_order),
      category: p.category_id ? catNameById.get(p.category_id) ?? "" : "",
    }));

    return {
      tenant: tenantWithEffectivePlan,
      categories: cats,
      products: prods,
      pizzaSizes: (pSizes ?? []) as unknown as DbCategoryPizzaSize[],
      pizzaDoughs: (pDoughs ?? []) as unknown as DbCategoryPizzaDough[],
      pizzaCrusts: (pCrusts ?? []) as unknown as DbCategoryPizzaCrust[],
      blocked: false,
    };
  });

export const listActiveTenants = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("tenants").select("*").eq("active", true).order("name");
    if (error) throw new Error(error.message);
    return { tenants: (data ?? []) as unknown as DbTenant[] };
  });
