import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { DbCategory, DbProduct, DbAddon } from "@/lib/db-types";

async function getMyTenantId(userId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
  if (!data?.tenant_id) throw new Error("Usuário sem loja vinculada.");
  return data.tenant_id as string;
}

// ===== Categories =====

export const listMyCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await getMyTenantId(context.userId);
    const { data, error } = await supabaseAdmin
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
    const tenantId = await getMyTenantId(context.userId);
    if (data.id) {
      const { error } = await supabaseAdmin.from("categories").update({
        name: data.name, description: data.description ?? "",
        sort_order: data.sort_order, active: data.active,
      }).eq("id", data.id).eq("tenant_id", tenantId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin.from("categories").insert({
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
    const tenantId = await getMyTenantId(context.userId);
    const { error } = await supabaseAdmin.from("categories")
      .delete().eq("id", data.id).eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Products =====

export const listMyProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await getMyTenantId(context.userId);
    const [{ data: products, error: pErr }, { data: addons }] = await Promise.all([
      supabaseAdmin.from("products").select("*").eq("tenant_id", tenantId).order("sort_order"),
      supabaseAdmin.from("product_addons").select("*").order("sort_order"),
    ]);
    if (pErr) throw new Error(pErr.message);
    const byProduct = new Map<string, DbAddon[]>();
    for (const a of (addons ?? []) as DbAddon[]) {
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
    const tenantId = await getMyTenantId(context.userId);
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
      const { error } = await supabaseAdmin.from("products")
        .update(payload).eq("id", data.id).eq("tenant_id", tenantId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin.from("products")
      .insert({ ...payload, tenant_id: tenantId }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await getMyTenantId(context.userId);
    const { error } = await supabaseAdmin.from("products")
      .delete().eq("id", data.id).eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleProductAvailable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), available: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await getMyTenantId(context.userId);
    const { error } = await supabaseAdmin.from("products")
      .update({ available: data.available }).eq("id", data.id).eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
