import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  DbTenant, DbCategory, DbProduct, DbAddon,
  DbProductSize, DbProductFlavor, DbAddonGroup, DbAddonOption, DbAddonGroupTarget,
  DbCategoryPizzaSize, DbCategoryPizzaDough, DbCategoryPizzaCrust,
} from "@/lib/db-types";

const SlugInput = z.object({ slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/) });

export const getTenantBySlug = createServerFn({ method: "POST" })
  .inputValidator((d) => SlugInput.parse(d))
  .handler(async ({ data }) => {
    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("slug", data.slug)
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!tenant) return { tenant: null as DbTenant | null };
    const { getTenantPlan } = await import("@/lib/plan-server");
    return { tenant: { ...tenant, plan: await getTenantPlan(tenant.id as string) } as DbTenant };
  });

export const getCatalog = createServerFn({ method: "POST" })
  .inputValidator((d) => SlugInput.parse(d))
  .handler(async ({ data }) => {
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from("tenants").select("*").eq("slug", data.slug).eq("active", true).maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!tenant) return { tenant: null, categories: [], products: [], pizzaSizes: [], pizzaDoughs: [], pizzaCrusts: [], blocked: false };

    const tenantId = tenant.id as string;
    const { getTenantPlan } = await import("@/lib/plan-server");
    const tenantWithEffectivePlan = { ...tenant, plan: await getTenantPlan(tenantId) } as DbTenant;

    const { isTenantBlocked } = await import("@/lib/tenant-access.server");
    if (await isTenantBlocked(tenantId)) {
      return { tenant: tenantWithEffectivePlan, categories: [], products: [], pizzaSizes: [], pizzaDoughs: [], pizzaCrusts: [], blocked: true };
    }

    const [
      { data: categories },
      { data: products },
      { data: addons },
      { data: groupsRaw },
    ] = await Promise.all([
      supabaseAdmin.from("categories").select("*").eq("tenant_id", tenantId).eq("active", true).order("sort_order"),
      supabaseAdmin.from("products").select("*").eq("tenant_id", tenantId).order("sort_order"),
      supabaseAdmin.from("product_addons").select("*").order("sort_order"),
      supabaseAdmin.from("addon_groups").select("*").eq("tenant_id", tenantId).eq("active", true).order("sort_order"),
    ]);

    const cats = (categories ?? []) as DbCategory[];
    const catNameById = new Map(cats.map((c) => [c.id, c.name]));
    const prodList = ((products ?? []) as unknown) as DbProduct[];
    const prodIds = prodList.map((p) => p.id);

    // Sizes / flavors apenas dos produtos do tenant
    const [{ data: sizes }, { data: flavors }] = prodIds.length
      ? await Promise.all([
          supabaseAdmin.from("product_sizes").select("*").in("product_id", prodIds).order("sort_order"),
          supabaseAdmin.from("product_flavors").select("*").in("product_id", prodIds).eq("available", true).order("sort_order"),
        ])
      : [{ data: [] }, { data: [] }];

    // Addon options + targets dos grupos ativos
    const groups = ((groupsRaw ?? []) as unknown) as DbAddonGroup[];
    const groupIds = groups.map((g) => g.id);
    const [{ data: opts }, { data: targets }] = groupIds.length
      ? await Promise.all([
          supabaseAdmin.from("addon_options").select("*").in("group_id", groupIds).eq("active", true).order("sort_order"),
          supabaseAdmin.from("addon_group_targets").select("*").in("group_id", groupIds),
        ])
      : [{ data: [] }, { data: [] }];

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

    // Pizza config por categoria (somente categorias kind='pizza')
    const pizzaCats = cats.filter((c) => (c as DbCategory).kind === "pizza").map((c) => c.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sbAny = supabaseAdmin as unknown as { from: (t: string) => any };
    const [{ data: pSizes }, { data: pDoughs }, { data: pCrusts }] = pizzaCats.length
      ? await Promise.all([
          sbAny.from("category_pizza_sizes").select("*").in("category_id", pizzaCats).eq("active", true).order("sort_order"),
          sbAny.from("category_pizza_doughs").select("*").in("category_id", pizzaCats).eq("active", true).order("sort_order"),
          sbAny.from("category_pizza_crusts").select("*").in("category_id", pizzaCats).eq("active", true).order("sort_order"),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

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
    return { tenants: (data ?? []) as DbTenant[] };
  });
