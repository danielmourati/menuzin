import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { RESERVED_SLUGS } from "@/lib/reserved-slugs";

/**
 * Garante que o usuário autenticado é platform_admin antes de qualquer
 * operação privilegiada. Lança em caso contrário.
 */
async function ensurePlatformAdmin(userId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "platform_admin");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Acesso restrito ao admin da plataforma.");
}

export type PlatformStoreRow = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  status: string;
  plan: string;
  active: boolean;
  created_at: string;
  orders_month: number;
  revenue_month: number;
};

export const listPlatformStores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ stores: PlatformStoreRow[] }> => {
    await ensurePlatformAdmin(context.userId);

    const { data: tenants, error: tErr } = await supabaseAdmin
      .from("tenants").select("id, name, slug, city, state, status, plan, active, created_at")
      .order("created_at", { ascending: false });
    if (tErr) throw new Error(tErr.message);

    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data: orders, error: oErr } = await supabaseAdmin
      .from("orders").select("tenant_id, total, status, created_at").gte("created_at", since);
    if (oErr) throw new Error(oErr.message);

    const aggByTenant = new Map<string, { count: number; revenue: number }>();
    for (const o of orders ?? []) {
      const cur = aggByTenant.get(o.tenant_id as string) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      if (o.status === "finalizado") cur.revenue += Number(o.total ?? 0);
      aggByTenant.set(o.tenant_id as string, cur);
    }

    const stores: PlatformStoreRow[] = (tenants ?? []).map((t) => {
      const agg = aggByTenant.get(t.id as string) ?? { count: 0, revenue: 0 };
      return {
        id: t.id as string,
        name: t.name as string,
        slug: t.slug as string,
        city: t.city as string,
        state: t.state as string,
        status: t.status as string,
        plan: t.plan as string,
        active: t.active as boolean,
        created_at: t.created_at as string,
        orders_month: agg.count,
        revenue_month: agg.revenue,
      };
    });

    return { stores };
  });

export type PlatformGrowthPoint = { mes: string; lojas: number };

export const getPlatformGrowth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ points: PlatformGrowthPoint[] }> => {
    await ensurePlatformAdmin(context.userId);

    // pega últimos 6 meses
    const now = new Date();
    const buckets: { key: string; label: string; date: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: monthLabels[d.getMonth()],
        date: d,
      });
    }

    const startISO = buckets[0].date.toISOString();
    const { data: tenants, error } = await supabaseAdmin
      .from("tenants").select("created_at").gte("created_at", startISO);
    if (error) throw new Error(error.message);

    const counts = new Map<string, number>(buckets.map((b) => [b.key, 0]));
    for (const t of tenants ?? []) {
      const d = new Date(t.created_at as string);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }

    // acumulado
    let running = 0;
    const points = buckets.map((b) => {
      running += counts.get(b.key) ?? 0;
      return { mes: b.label, lojas: running };
    });

    return { points };
  });

// ===== Criar tenant (apenas platform_admin) =====

const SlugSchema = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9-]+$/)
  .refine((s) => !RESERVED_SLUGS.has(s), { message: "Esse endereço é reservado pelo sistema." });

import { BUSINESS_TYPES } from "@/lib/business-types";

const CreateTenantInput = z.object({
  slug: SlugSchema,
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional().default(""),
  whatsapp: z.string().min(8).max(20),
  city: z.string().max(80).optional().default(""),
  address: z.string().max(240).optional().default(""),
  theme_from: z.string().max(40).optional().default("#FF6A1F"),
  theme_to: z.string().max(40).optional().default("#FF9A3C"),
  active: z.boolean().default(true),
  plan: z.enum(["start", "pro"]).default("start"),
  business_types: z.array(z.enum(BUSINESS_TYPES)).optional().default([]),
  owner_user_id: z.string().uuid().nullable().optional(),
  owner_email: z.string().email().max(160).optional().nullable(),
  owner_password: z.string().min(8).max(72).optional().nullable(),
  owner_name: z.string().max(120).optional().nullable(),
  clone_from_slug: z.string().max(60).optional().nullable(),
  seed_business_categories: z.boolean().optional().default(false),
  seed_template_defaults: z.boolean().optional().default(false),
  seed_demo_data: z.boolean().optional().default(false),
});


export const adminCreateTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CreateTenantInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensurePlatformAdmin(context.userId);

    const { data: taken } = await supabaseAdmin
      .from("tenants").select("id").eq("slug", data.slug).maybeSingle();
    if (taken) throw new Error("Esse endereço (slug) já está em uso.");

    const { data: tenant, error } = await supabaseAdmin
      .from("tenants").insert({
        slug: data.slug,
        name: data.name,
        description: data.description,
        whatsapp: data.whatsapp,
        city: data.city,
        address: data.address,
        logo_letter: data.name.charAt(0).toUpperCase(),
        theme_from: data.theme_from,
        theme_to: data.theme_to,
        active: data.active,
        plan: data.plan,
        status: "ativa",
        business_types: data.business_types ?? [],
      } as never).select("id").single();
    if (error || !tenant) throw new Error(error?.message || "Falha ao criar loja");

    // 1) Dono já existente (id informado)
    let ownerId: string | null = data.owner_user_id ?? null;

    // 2) Criar usuário dono a partir de email/senha (super-admin define credenciais iniciais)
    if (!ownerId && data.owner_email && data.owner_password) {
      const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.owner_email,
        password: data.owner_password,
        email_confirm: true,
        user_metadata: { full_name: data.owner_name ?? data.name },
      });
      if (cErr || !created.user) {
        // rollback do tenant para não deixar órfão
        await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
        throw new Error(cErr?.message || "Falha ao criar usuário do dono.");
      }
      ownerId = created.user.id;
      // garante profile (o trigger handle_new_user também faz, mas idempotente)
      await supabaseAdmin.from("profiles").upsert({
        id: ownerId,
        email: data.owner_email,
        full_name: data.owner_name ?? data.name,
      }, { onConflict: "id" });
    }

    if (ownerId) {
      await supabaseAdmin.from("user_roles").insert({
        user_id: ownerId,
        tenant_id: tenant.id,
        role: "owner",
      });
      await supabaseAdmin.from("profiles").update({
        tenant_id: tenant.id,
        must_change_password: true,
      }).eq("id", ownerId);
    }

    // === Clone de catálogo apenas se explicitamente solicitado ===
    const sourceSlug = data.clone_from_slug && data.clone_from_slug.trim().length > 0
      ? data.clone_from_slug.trim()
      : null;
    if (sourceSlug && data.seed_demo_data) {
      const { data: src } = await supabaseAdmin
        .from("tenants").select("id").eq("slug", sourceSlug).maybeSingle();
      if (src?.id) {
        await cloneCatalog(src.id as string, tenant.id as string);
      }
    }

    // Seed de categorias por tipo de negócio — somente quando solicitado pelo super-admin
    if (!sourceSlug && data.seed_business_categories && (data.business_types?.length ?? 0) > 0) {
      await seedCategoriesForBusinessTypes(tenant.id as string, data.business_types as string[]);
    }

    // Aplicação do template (merge não-destrutivo) — somente quando solicitado.
    // Por padrão o novo tenant nasce vazio, sem herdar nada de outras lojas.
    if (data.seed_template_defaults) {
      try {
        const { applyTenantTemplate } = await import("@/lib/tenant-template.server");
        await applyTenantTemplate(tenant.id as string);
      } catch {
        // não falhar a criação se o merge der erro
      }
    }

    return { tenant_id: tenant.id as string, owner_user_id: ownerId };
  });


// ===== Padronização de tenants (aplicar template burgerprime/vilaboemia) =====

export const adminApplyTenantTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tenant_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensurePlatformAdmin(context.userId);
    const { applyTenantTemplate } = await import("@/lib/tenant-template.server");
    return await applyTenantTemplate(data.tenant_id);
  });

export const adminApplyTemplateToAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensurePlatformAdmin(context.userId);
    const { applyTenantTemplate } = await import("@/lib/tenant-template.server");
    const { data: tenants } = await supabaseAdmin
      .from("tenants").select("id, slug");
    const results: { slug: string; ok: boolean; error?: string; updated?: number; created?: number }[] = [];
    for (const t of (tenants ?? [])) {
      try {
        const r = await applyTenantTemplate(t.id as string);
        results.push({
          slug: t.slug as string,
          ok: true,
          updated: r.updated_fields.length,
          created: r.created.length,
        });
      } catch (e) {
        results.push({ slug: t.slug as string, ok: false, error: (e as Error).message });
      }
    }
    return { results };
  });

const BUSINESS_TYPE_CATEGORIES: Record<string, { name: string; kind: "standard" | "pizza" }[]> = {
  pizzaria: [{ name: "Pizza", kind: "pizza" }, { name: "Bebidas", kind: "standard" }],
  hamburgueria: [{ name: "Hambúrgueres", kind: "standard" }, { name: "Combos", kind: "standard" }, { name: "Bebidas", kind: "standard" }],
  churrascaria: [{ name: "Espetos", kind: "standard" }, { name: "Porções", kind: "standard" }, { name: "Bebidas", kind: "standard" }, { name: "Combos", kind: "standard" }],
  espetaria: [{ name: "Espetos", kind: "standard" }, { name: "Porções", kind: "standard" }, { name: "Bebidas", kind: "standard" }],
  restaurante: [{ name: "Pratos executivos", kind: "standard" }, { name: "Porções", kind: "standard" }, { name: "Bebidas", kind: "standard" }],
  acaiteria: [{ name: "Açaí", kind: "standard" }, { name: "Acompanhamentos", kind: "standard" }, { name: "Bebidas", kind: "standard" }],
  sorveteria: [{ name: "Sorvetes", kind: "standard" }, { name: "Sundaes", kind: "standard" }, { name: "Bebidas", kind: "standard" }],
  cafeteria: [{ name: "Cafés", kind: "standard" }, { name: "Salgados", kind: "standard" }, { name: "Doces", kind: "standard" }],
  padaria: [{ name: "Pães", kind: "standard" }, { name: "Salgados", kind: "standard" }, { name: "Doces", kind: "standard" }, { name: "Bebidas", kind: "standard" }],
  lanchonete: [{ name: "Lanches", kind: "standard" }, { name: "Salgados", kind: "standard" }, { name: "Bebidas", kind: "standard" }],
  marmitaria: [{ name: "Marmitas", kind: "standard" }, { name: "Bebidas", kind: "standard" }],
  sushi: [{ name: "Sushis", kind: "standard" }, { name: "Combinados", kind: "standard" }, { name: "Hot", kind: "standard" }, { name: "Bebidas", kind: "standard" }],
  pastelaria: [{ name: "Pastéis", kind: "standard" }, { name: "Caldo de Cana", kind: "standard" }, { name: "Bebidas", kind: "standard" }],
  food_truck: [{ name: "Especialidades", kind: "standard" }, { name: "Bebidas", kind: "standard" }],
  bar: [{ name: "Petiscos", kind: "standard" }, { name: "Drinks", kind: "standard" }, { name: "Cervejas", kind: "standard" }],
  conveniencia: [{ name: "Bebidas", kind: "standard" }, { name: "Lanches", kind: "standard" }, { name: "Doces", kind: "standard" }],
};

async function seedCategoriesForBusinessTypes(tenantId: string, types: string[]): Promise<void> {
  // junta nomes deduplicados respeitando o primeiro kind encontrado
  const wanted = new Map<string, "standard" | "pizza">();
  for (const t of types) {
    for (const c of (BUSINESS_TYPE_CATEGORIES[t] ?? [])) {
      const k = c.name.toLowerCase();
      if (!wanted.has(k)) wanted.set(k, c.kind);
    }
  }
  if (wanted.size === 0) return;
  let order = 1;
  for (const [keyLower, kind] of wanted) {
    // Restaura caps originais a partir do mapeamento (uso primeiro hit)
    const display = capitalize(keyLower);
    await supabaseAdmin.from("categories").insert({
      tenant_id: tenantId,
      name: display,
      description: "",
      sort_order: order++,
      active: true,
      kind,
    } as never);
  }
}

function capitalize(s: string): string {
  return s.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/**
 * Clona categorias, produtos (com tamanhos/sabores) e grupos de complementos
 * de um tenant fonte para o destino, preservando relações.
 */
async function cloneCatalog(fromTenantId: string, toTenantId: string): Promise<void> {
  // 1) Categorias
  const { data: cats } = await supabaseAdmin
    .from("categories").select("*").eq("tenant_id", fromTenantId);
  const catIdMap = new Map<string, string>();
  for (const c of cats ?? []) {
    const { data: row } = await supabaseAdmin.from("categories").insert({
      tenant_id: toTenantId,
      name: c.name as string,
      description: (c.description as string) ?? "",
      sort_order: c.sort_order as number,
      active: c.active as boolean,
    }).select("id").single();
    if (row) catIdMap.set(c.id as string, row.id as string);
  }

  // 2) Produtos
  const { data: prods } = await supabaseAdmin
    .from("products").select("*").eq("tenant_id", fromTenantId);
  const prodIdMap = new Map<string, string>();
  for (const p of prods ?? []) {
    const newCat = p.category_id ? catIdMap.get(p.category_id as string) ?? null : null;
    const { data: row } = await supabaseAdmin.from("products").insert({
      tenant_id: toTenantId,
      category_id: newCat,
      name: p.name as string,
      description: (p.description as string) ?? "",
      price: p.price as number,
      promo_price: p.promo_price as number | null,
      image_url: p.image_url as string | null,
      available: p.available as boolean,
      featured: p.featured as boolean,
      prep_time: p.prep_time as string | null,
      sort_order: p.sort_order as number,
      type: (p.type as string) ?? "standard",
      max_flavors: p.max_flavors as number | null,
      allow_observations: p.allow_observations as boolean,
    }).select("id").single();
    if (row) prodIdMap.set(p.id as string, row.id as string);
  }

  if (prodIdMap.size) {
    const oldIds = Array.from(prodIdMap.keys());

    const { data: sizes } = await supabaseAdmin
      .from("product_sizes").select("*").in("product_id", oldIds);
    for (const s of sizes ?? []) {
      const np = prodIdMap.get(s.product_id as string);
      if (!np) continue;
      await supabaseAdmin.from("product_sizes").insert({
        product_id: np, name: s.name as string, price: s.price as number, sort_order: s.sort_order as number,
      });
    }

    const { data: flavors } = await supabaseAdmin
      .from("product_flavors").select("*").in("product_id", oldIds);
    for (const f of flavors ?? []) {
      const np = prodIdMap.get(f.product_id as string);
      if (!np) continue;
      await supabaseAdmin.from("product_flavors").insert({
        product_id: np, name: f.name as string, description: (f.description as string) ?? "",
        price_delta: f.price_delta as number, available: f.available as boolean, sort_order: f.sort_order as number,
      });
    }

    const { data: addons } = await supabaseAdmin
      .from("product_addons").select("*").in("product_id", oldIds);
    for (const a of addons ?? []) {
      const np = prodIdMap.get(a.product_id as string);
      if (!np) continue;
      await supabaseAdmin.from("product_addons").insert({
        product_id: np, name: a.name as string, price: a.price as number, sort_order: a.sort_order as number,
      });
    }
  }

  // 3) Grupos de adicionais + opções + alvos
  const { data: groups } = await supabaseAdmin
    .from("addon_groups").select("*").eq("tenant_id", fromTenantId);
  const groupIdMap = new Map<string, string>();
  for (const g of groups ?? []) {
    const { data: row } = await supabaseAdmin.from("addon_groups").insert({
      tenant_id: toTenantId,
      name: g.name as string,
      kind: ((g as { kind?: string }).kind ?? "adicional") as string,
      required: g.required as boolean,
      min_select: g.min_select as number,
      max_select: g.max_select as number,
      active: g.active as boolean,
      sort_order: g.sort_order as number,
    }).select("id").single();
    if (row) groupIdMap.set(g.id as string, row.id as string);
  }
  if (groupIdMap.size) {
    const oldGroupIds = Array.from(groupIdMap.keys());
    const { data: opts } = await supabaseAdmin
      .from("addon_options").select("*").in("group_id", oldGroupIds);
    for (const o of opts ?? []) {
      const ng = groupIdMap.get(o.group_id as string);
      if (!ng) continue;
      await supabaseAdmin.from("addon_options").insert({
        group_id: ng, name: o.name as string, price: o.price as number,
        active: o.active as boolean, sort_order: o.sort_order as number,
      });
    }
    const { data: targets } = await supabaseAdmin
      .from("addon_group_targets").select("*").in("group_id", oldGroupIds);
    for (const t of targets ?? []) {
      const ng = groupIdMap.get(t.group_id as string);
      if (!ng) continue;
      const newCat = t.category_id ? catIdMap.get(t.category_id as string) ?? null : null;
      const newProd = t.product_id ? prodIdMap.get(t.product_id as string) ?? null : null;
      if (!newCat && !newProd) continue;
      await supabaseAdmin.from("addon_group_targets").insert({
        group_id: ng, category_id: newCat, product_id: newProd,
      });
    }
  }
}


// ===== Update / Delete / Status (apenas platform_admin) =====

const UpdateTenantInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(120).optional(),
  slug: SlugSchema.optional(),
  description: z.string().max(2000).optional(),
  whatsapp: z.string().min(8).max(20).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(40).optional(),
  address: z.string().max(240).optional(),
  plan: z.enum(["presenca", "start", "pro"]).optional(),
  status: z.enum(["ativa", "teste", "suspensa"]).optional(),
  active: z.boolean().optional(),
  theme_from: z.string().max(40).optional(),
  theme_to: z.string().max(40).optional(),
});

export const adminUpdateTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpdateTenantInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensurePlatformAdmin(context.userId);
    const { id, ...patch } = data;

    if (patch.slug) {
      const { data: taken } = await supabaseAdmin
        .from("tenants").select("id").eq("slug", patch.slug).neq("id", id).maybeSingle();
      if (taken) throw new Error("Esse endereço (slug) já está em uso.");
    }

    const { error } = await supabaseAdmin
      .from("tenants").update(patch as never).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensurePlatformAdmin(context.userId);

    // Limpa dependências em cascata (sem FKs configuradas)
    const { data: products } = await supabaseAdmin
      .from("products").select("id").eq("tenant_id", data.id);
    const productIds = (products ?? []).map((p) => p.id as string);
    if (productIds.length) {
      await supabaseAdmin.from("product_addons").delete().in("product_id", productIds);
      await supabaseAdmin.from("product_sizes").delete().in("product_id", productIds);
      await supabaseAdmin.from("product_flavors").delete().in("product_id", productIds);
    }
    const { data: groups } = await supabaseAdmin
      .from("addon_groups").select("id").eq("tenant_id", data.id);
    const groupIds = (groups ?? []).map((g) => g.id as string);
    if (groupIds.length) {
      await supabaseAdmin.from("addon_options").delete().in("group_id", groupIds);
      await supabaseAdmin.from("addon_group_targets").delete().in("group_id", groupIds);
    }
    const { data: orders } = await supabaseAdmin
      .from("orders").select("id").eq("tenant_id", data.id);
    const orderIds = (orders ?? []).map((o) => o.id as string);
    if (orderIds.length) {
      await supabaseAdmin.from("order_items").delete().in("order_id", orderIds);
      await supabaseAdmin.from("order_status_history").delete().in("order_id", orderIds);
    }
    await supabaseAdmin.from("orders").delete().eq("tenant_id", data.id);
    await supabaseAdmin.from("products").delete().eq("tenant_id", data.id);
    await supabaseAdmin.from("categories").delete().eq("tenant_id", data.id);
    await supabaseAdmin.from("addon_groups").delete().eq("tenant_id", data.id);
    await supabaseAdmin.from("store_payment_settings").delete().eq("tenant_id", data.id);
    await supabaseAdmin.from("user_roles").delete().eq("tenant_id", data.id);
    await supabaseAdmin.from("profiles").update({ tenant_id: null }).eq("tenant_id", data.id);

    const { error } = await supabaseAdmin.from("tenants").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Dados do admin/dono da loja (apenas platform_admin) =====

export type TenantOwner = {
  user_id: string | null;
  email: string;
  full_name: string;
};

export const adminGetTenantOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tenant_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<TenantOwner> => {
    await ensurePlatformAdmin(context.userId);
    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("user_id, role")
      .eq("tenant_id", data.tenant_id)
      .in("role", ["owner", "admin"]);
    const owner = (roles ?? []).find((r) => r.role === "owner") ?? (roles ?? [])[0];
    if (!owner) return { user_id: null, email: "", full_name: "" };
    const { data: prof } = await supabaseAdmin
      .from("profiles").select("email, full_name")
      .eq("id", owner.user_id as string).maybeSingle();
    return {
      user_id: owner.user_id as string,
      email: prof?.email ?? "",
      full_name: prof?.full_name ?? "",
    };
  });

const StrongPasswordAdmin = z
  .string()
  .min(8, "Mínimo de 8 caracteres.")
  .max(72)
  .regex(/[A-Z]/, "Inclua maiúscula.")
  .regex(/[a-z]/, "Inclua minúscula.")
  .regex(/[0-9]/, "Inclua número.")
  .regex(/[^A-Za-z0-9]/, "Inclua caractere especial.");

const UpdateOwnerInput = z.object({
  tenant_id: z.string().uuid(),
  full_name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(160).optional(),
  new_password: StrongPasswordAdmin.optional(),
  create_if_missing: z.boolean().optional().default(false),
});

export const adminUpdateTenantOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpdateOwnerInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensurePlatformAdmin(context.userId);
    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("user_id, role")
      .eq("tenant_id", data.tenant_id)
      .in("role", ["owner", "admin"]);
    let ownerId = (roles ?? []).find((r) => r.role === "owner")?.user_id as string | undefined
      ?? (roles ?? [])[0]?.user_id as string | undefined;

    if (!ownerId) {
      if (!data.create_if_missing || !data.email || !data.new_password) {
        throw new Error("Esta loja não possui administrador. Informe e-mail e senha para criar.");
      }
      const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.new_password,
        email_confirm: true,
        user_metadata: { full_name: data.full_name ?? "" },
      });
      if (cErr || !created.user) throw new Error(cErr?.message || "Falha ao criar administrador.");
      ownerId = created.user.id;
      await supabaseAdmin.from("profiles").upsert({
        id: ownerId, email: data.email, full_name: data.full_name ?? "", tenant_id: data.tenant_id,
      }, { onConflict: "id" });
      await supabaseAdmin.from("user_roles").insert({
        user_id: ownerId, tenant_id: data.tenant_id, role: "owner",
      });
      return { ok: true, created: true };
    }

    const authPatch: { email?: string; password?: string } = {};
    if (data.email) authPatch.email = data.email;
    if (data.new_password) authPatch.password = data.new_password;
    if (Object.keys(authPatch).length) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(ownerId, {
        ...authPatch,
        email_confirm: !!data.email || undefined,
      } as never);
      if (error) throw new Error(error.message);
    }
    const profPatch: { full_name?: string; email?: string } = {};
    if (data.full_name) profPatch.full_name = data.full_name;
    if (data.email) profPatch.email = data.email;
    if (Object.keys(profPatch).length) {
      await supabaseAdmin.from("profiles").update(profPatch).eq("id", ownerId);
    }
    return { ok: true, created: false };
  });
