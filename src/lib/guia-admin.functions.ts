// Superadmin CRUD for the Guia Menuzin content + tenant highlight requests.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveEffectiveTenantId } from "@/lib/active-tenant.server";
import { mapCategory, mapSlot } from "@/lib/guia.functions";
import {
  DEFAULT_SECTION_ORDER,
  type GuiaCategory,
  type GuiaPromoRequest,
  type GuiaSectionId,
  type GuiaSlot,
} from "@/lib/guia-types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const slotKind = z.enum(["hero", "featured", "top_stores", "banner", "collection", "flash_offer"]);

const slotInput = z.object({
  kind: slotKind,
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  emoji: z.string().nullable().optional(),
  gradient: z.string().nullable().optional(),
  tenantId: z.string().uuid().nullable().optional(),
  productId: z.string().uuid().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  imageFit: z.enum(["cover", "contain"]).optional(),
  href: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  promoPrice: z.number().nullable().optional(),
  discountPct: z.number().nullable().optional(),
  rating: z.number().nullable().optional(),
  deliveryFee: z.number().nullable().optional(),
  storeName: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

const toSlotRow = (p: z.infer<typeof slotInput> | Partial<z.infer<typeof slotInput>>) => {
  const row: Record<string, unknown> = {};
  const set = (k: string, v: unknown) => {
    if (v !== undefined) row[k] = v === "" ? null : v;
  };
  set("kind", p.kind);
  set("title", p.title);
  set("subtitle", p.subtitle);
  set("emoji", p.emoji);
  set("gradient", p.gradient);
  set("image_url", p.imageUrl);
  set("image_fit", p.imageFit);
  set("tenant_id", p.tenantId);
  set("product_id", p.productId);
  set("href", p.href);
  set("price", p.price);
  set("promo_price", p.promoPrice);
  set("discount_pct", p.discountPct);
  set("rating", p.rating);
  set("delivery_fee", p.deliveryFee);
  set("store_name", p.storeName);
  set("city", p.city);
  set("ends_at", p.endsAt);
  set("active", p.active);
  return row;
};

/* ----------------------------- product resolver ---------------------------- */

export type ResolvedProductRef = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  productId: string | null;
  productSlug: string | null;
  productName: string | null;
  imageUrl: string | null;
  price: number | null;
  promoPrice: number | null;
  href: string;
};

export const adminResolveProductRef = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ref: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }): Promise<ResolvedProductRef> => {
    const raw = data.ref.trim();
    const uuid = raw.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    )?.[0];

    const productSelect =
      "id, name, slug, image_url, price, promo_price, tenant_id, tenants(slug, name)";
    const toResolved = (prod: any): ResolvedProductRef => {
      const t = Array.isArray(prod.tenants) ? prod.tenants[0] : prod.tenants;
      if (!t) throw new Error("Loja do produto não encontrada.");
      return {
        tenantId: prod.tenant_id,
        tenantSlug: t.slug,
        tenantName: t.name,
        productId: prod.id,
        productSlug: prod.slug ?? null,
        productName: prod.name,
        imageUrl: prod.image_url ?? null,
        price: prod.price == null ? null : Number(prod.price),
        promoPrice: prod.promo_price == null ? null : Number(prod.promo_price),
        href: `/guia/produto/${prod.slug ?? prod.id}`,
      };
    };

    if (uuid) {
      const { data: prod, error } = await context.supabase
        .from("products")
        .select(productSelect)
        .eq("id", uuid)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!prod) throw new Error("Produto não encontrado.");
      return toResolved(prod);
    }

    // Sem uuid: aceita URL, `loja/slug-do-produto`, `?produto=<slug>` ou slug da loja.
    let path = raw;
    let query = "";
    try {
      if (/^https?:\/\//i.test(raw)) {
        const u = new URL(raw);
        path = u.pathname;
        query = u.searchParams.get("produto") ?? "";
      }
    } catch {
      /* keep raw */
    }
    if (!query) {
      const m = path.match(/[?&]produto=([^&#]+)/);
      if (m) query = decodeURIComponent(m[1]!);
    }
    const parts = path
      .split("?")[0]!
      .split("#")[0]!
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean);

    // /guia/produto/<slug|id>
    if (parts[0] === "guia" && parts[1] === "produto" && parts[2]) {
      const { data: prod } = await context.supabase
        .from("products")
        .select(productSelect)
        .eq("slug", parts[2].toLowerCase())
        .limit(1)
        .maybeSingle();
      if (prod) return toResolved(prod);
    }

    const tenantSlug = parts[0] ?? "";
    const productSlug = (query || (parts.length > 1 ? parts[1]! : "")).toLowerCase();
    if (!tenantSlug) throw new Error("Informe o link ou slug do produto/loja.");

    const { data: tenant, error: tErr } = await context.supabase
      .from("tenants")
      .select("id, slug, name")
      .eq("slug", tenantSlug)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!tenant) throw new Error("Loja não encontrada para este link.");
    const t = tenant as any;

    if (productSlug) {
      const { data: prod } = await context.supabase
        .from("products")
        .select(productSelect)
        .eq("tenant_id", t.id)
        .eq("slug", productSlug)
        .maybeSingle();
      if (!prod) throw new Error("Produto não encontrado nesta loja.");
      return toResolved(prod);
    }

    return {
      tenantId: t.id,
      tenantSlug: t.slug,
      tenantName: t.name,
      productId: null,
      productSlug: null,
      productName: null,
      imageUrl: null,
      price: null,
      promoPrice: null,
      href: `/${t.slug}`,
    };
  });

/* ---------------------------------- slots --------------------------------- */

export const adminListSlots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GuiaSlot[]> => {
    const { data, error } = await context.supabase
      .from("guia_slots")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapSlot);
  });

export const adminCreateSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => slotInput.parse(d))
  .handler(async ({ data, context }): Promise<GuiaSlot> => {
    const { data: maxRow } = await context.supabase
      .from("guia_slots")
      .select("sort_order")
      .eq("kind", data.kind)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const next = ((maxRow as any)?.sort_order ?? 0) + 1;
    const { data: row, error } = await context.supabase
      .from("guia_slots")
      .insert({ ...(toSlotRow(data) as any), sort_order: next })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapSlot(row);
  });

export const adminUpdateSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), patch: slotInput.partial() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("guia_slots")
      .update(toSlotRow(data.patch) as any)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("guia_slots").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDuplicateSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("guia_slots")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { id, created_at, updated_at, sort_order, title, ...rest } = row as any;
    const { error: insErr } = await context.supabase
      .from("guia_slots")
      .insert({ ...rest, title: `${title} (cópia)`, sort_order: (sort_order ?? 0) + 1 });
    if (insErr) throw new Error(insErr.message);
    return { ok: true };
  });

export const adminMoveSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), dir: z.number() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: current, error } = await context.supabase
      .from("guia_slots")
      .select("id, kind, sort_order")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: siblings, error: sibErr } = await context.supabase
      .from("guia_slots")
      .select("id, sort_order")
      .eq("kind", (current as any).kind)
      .order("sort_order", { ascending: true });
    if (sibErr) throw new Error(sibErr.message);
    const list = (siblings ?? []) as any[];
    const i = list.findIndex((s) => s.id === data.id);
    const j = i + (data.dir < 0 ? -1 : 1);
    if (i < 0 || j < 0 || j >= list.length) return { ok: true };
    const a = list[i];
    const b = list[j];
    await context.supabase.from("guia_slots").update({ sort_order: b.sort_order }).eq("id", a.id);
    await context.supabase.from("guia_slots").update({ sort_order: a.sort_order }).eq("id", b.id);
    return { ok: true };
  });

/* -------------------------------- categories ------------------------------ */

const categoryInput = z.object({
  label: z.string().min(1),
  slug: z.string().min(1),
  emoji: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  imageFit: z.enum(["cover", "contain"]).optional(),
  city: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

const toCategoryRow = (p: Partial<z.infer<typeof categoryInput>>) => {
  const row: Record<string, unknown> = {};
  if (p.label !== undefined) row['label'] = p.label;
  if (p.slug !== undefined) row['slug'] = p.slug;
  if (p.emoji !== undefined) row['emoji'] = p.emoji;
  if (p.imageUrl !== undefined) row['image_url'] = p.imageUrl || null;
  if (p.imageFit !== undefined) row['image_fit'] = p.imageFit;
  if (p.city !== undefined) row['city'] = p.city || null;
  if (p.active !== undefined) row['active'] = p.active;
  return row;
};

export const adminListCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GuiaCategory[]> => {
    const { data, error } = await context.supabase
      .from("guia_categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapCategory);
  });

export const adminCreateCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => categoryInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: maxRow } = await context.supabase
      .from("guia_categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const next = ((maxRow as any)?.sort_order ?? 0) + 1;
    const { error } = await context.supabase
      .from("guia_categories")
      .insert({ ...(toCategoryRow(data) as any), sort_order: next });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), patch: categoryInput.partial() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("guia_categories")
      .update(toCategoryRow(data.patch) as any)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("guia_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminMoveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), dir: z.number() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: list, error } = await context.supabase
      .from("guia_categories")
      .select("id, sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = (list ?? []) as any[];
    const i = rows.findIndex((r) => r.id === data.id);
    const j = i + (data.dir < 0 ? -1 : 1);
    if (i < 0 || j < 0 || j >= rows.length) return { ok: true };
    await context.supabase
      .from("guia_categories")
      .update({ sort_order: rows[j].sort_order })
      .eq("id", rows[i].id);
    await context.supabase
      .from("guia_categories")
      .update({ sort_order: rows[i].sort_order })
      .eq("id", rows[j].id);
    return { ok: true };
  });

/* --------------------------------- sections -------------------------------- */

export type GuiaSectionRow = { id: GuiaSectionId; active: boolean; sortOrder: number };

export const adminListSections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GuiaSectionRow[]> => {
    const { data, error } = await context.supabase
      .from("guia_sections")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as any[];
    const known = rows
      .filter((r) => DEFAULT_SECTION_ORDER.includes(r.id))
      .map((r) => ({ id: r.id as GuiaSectionId, active: !!r.active, sortOrder: r.sort_order }));
    const missing = DEFAULT_SECTION_ORDER.filter((id) => !known.some((k) => k.id === id));
    return [
      ...known,
      ...missing.map((id, i) => ({ id, active: true, sortOrder: known.length + i + 1 })),
    ];
  });

export const adminSetSectionOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ order: z.array(z.string()) }).parse(d))
  .handler(async ({ data, context }) => {
    const rows = data.order.map((id, i) => ({ id, sort_order: i + 1 }));
    const { error } = await context.supabase
      .from("guia_sections")
      .upsert(rows as any, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetSectionActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("guia_sections")
      .upsert({ id: data.id, active: data.active } as any, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminResetSections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const rows = DEFAULT_SECTION_ORDER.map((id, i) => ({ id, sort_order: i + 1, active: true }));
    const { error } = await context.supabase
      .from("guia_sections")
      .upsert(rows as any, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------- requests -------------------------------- */

const mapRequest = (r: any): GuiaPromoRequest => ({
  id: r.id,
  tenantId: r.tenant_id ?? null,
  tenantName: r.tenant_name,
  slotKind: r.slot_kind,
  durationDays: r.duration_days,
  amount: Number(r.amount),
  status: r.status,
  pixCode: r.pix_code ?? undefined,
  productId: r.product_id ?? null,
  note: r.note ?? undefined,
  createdAt: r.created_at,
});

export const listPromoRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GuiaPromoRequest[]> => {
    const { data, error } = await context.supabase
      .from("guia_promo_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRequest);
  });

export const createPromoRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        slotKind,
        durationDays: z.number(),
        amount: z.number(),
        note: z.string().optional(),
        productId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<GuiaPromoRequest> => {
    const { tenantId } = await resolveEffectiveTenantId(context.supabase, context.userId);
    const { data: tenant } = await context.supabase
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .maybeSingle();
    const pixCode = `00020126MENUZIN-GUIA-${Math.random().toString(36).slice(2, 10).toUpperCase()}5204000053039865802BR`;
    const { data: row, error } = await context.supabase
      .from("guia_promo_requests")
      .insert({
        tenant_id: tenantId,
        tenant_name: (tenant as any)?.name ?? "Loja",
        slot_kind: data.slotKind,
        duration_days: data.durationDays,
        amount: data.amount,
        status: "pending_payment",
        pix_code: pixCode,
        product_id: data.productId ?? null,
        note: data.note ?? null,
      } as any)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapRequest(row);
  });

export const markRequestPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: req, error } = await context.supabase
      .from("guia_promo_requests")
      .update({ status: "paid" } as any)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const r = req as any;
    const endsAt = new Date(Date.now() + r.duration_days * 86400000).toISOString();
    if (r.product_id) {
      // Destaque de produto pago: publica o item na seção "Em destaque agora".
      const { error: prodErr } = await context.supabase
        .from("products")
        .update({ directory_featured_until: endsAt, directory_visible: true } as any)
        .eq("id", r.product_id);
      if (prodErr) throw new Error(prodErr.message);
      return { ok: true };
    }
    const { error: slotErr } = await context.supabase.from("guia_slots").insert({
      kind: r.slot_kind,
      title: r.tenant_name,
      subtitle: r.note ?? "Destaque patrocinado",
      store_name: r.tenant_name,
      tenant_id: r.tenant_id,
      ends_at: endsAt,
      active: true,
      sort_order: 1,
    } as any);
    if (slotErr) throw new Error(slotErr.message);
    return { ok: true };
  });

export const rejectRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("guia_promo_requests")
      .update({ status: "rejected" } as any)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePromoRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("guia_promo_requests")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
