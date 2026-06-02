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
  owner_user_id: z.string().uuid().nullable().optional(),
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
        plan: "start",
        status: "ativa",
      }).select("id").single();
    if (error || !tenant) throw new Error(error?.message || "Falha ao criar loja");

    if (data.owner_user_id) {
      await supabaseAdmin.from("user_roles").insert({
        user_id: data.owner_user_id,
        tenant_id: tenant.id,
        role: "owner",
      });
      await supabaseAdmin.from("profiles").update({ tenant_id: tenant.id }).eq("id", data.owner_user_id);
    }

    return { tenant_id: tenant.id as string };
  });

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
  plan: z.enum(["start", "pro", "max"]).optional(),
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
