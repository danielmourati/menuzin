import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { DbTenant, DbCategory, DbProduct, DbAddon } from "@/lib/db-types";

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
    return { tenant: tenant as DbTenant | null };
  });

export const getCatalog = createServerFn({ method: "POST" })
  .inputValidator((d) => SlugInput.parse(d))
  .handler(async ({ data }) => {
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from("tenants").select("*").eq("slug", data.slug).eq("active", true).maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!tenant) return { tenant: null, categories: [], products: [] };

    const [{ data: categories }, { data: products }, { data: addons }] = await Promise.all([
      supabaseAdmin.from("categories").select("*").eq("tenant_id", tenant.id).eq("active", true).order("sort_order"),
      supabaseAdmin.from("products").select("*").eq("tenant_id", tenant.id).order("sort_order"),
      supabaseAdmin.from("product_addons").select("*").order("sort_order"),
    ]);

    const addonsByProduct = new Map<string, DbAddon[]>();
    for (const a of (addons ?? []) as DbAddon[]) {
      const arr = addonsByProduct.get(a.product_id) ?? [];
      arr.push(a);
      addonsByProduct.set(a.product_id, arr);
    }
    const cats = (categories ?? []) as DbCategory[];
    const catNameById = new Map(cats.map((c) => [c.id, c.name]));

    const prods: DbProduct[] = ((products ?? []) as unknown as DbProduct[]).map((p) => ({
      ...p,
      addons: addonsByProduct.get(p.id) ?? [],
      category: p.category_id ? catNameById.get(p.category_id) ?? "" : "",
    }));

    return {
      tenant: tenant as DbTenant,
      categories: cats,
      products: prods,
    };
  });

export const listActiveTenants = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("tenants").select("*").eq("active", true).order("name");
    if (error) throw new Error(error.message);
    return { tenants: (data ?? []) as DbTenant[] };
  });
