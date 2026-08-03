// Public reads for the Guia Menuzin (content managed by the platform superadmin).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  DEFAULT_SECTION_ORDER,
  type GuiaCategory,
  type GuiaSectionId,
  type GuiaSlot,
  type GuiaSlotKind,
} from "@/lib/guia-types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const mapSlot = (r: any): GuiaSlot => ({
  id: r.id,
  kind: r.kind as GuiaSlotKind,
  title: r.title,
  subtitle: r.subtitle ?? undefined,
  emoji: r.emoji ?? undefined,
  gradient: r.gradient ?? undefined,
  imageUrl: r.image_url ?? undefined,
  imageFit: (r.image_fit ?? "cover") as "cover" | "contain",
  href: r.href ?? undefined,
  price: r.price == null ? undefined : Number(r.price),
  promoPrice: r.promo_price == null ? undefined : Number(r.promo_price),
  discountPct: r.discount_pct == null ? undefined : Number(r.discount_pct),
  rating: r.rating == null ? undefined : Number(r.rating),
  deliveryFee: r.delivery_fee == null ? undefined : Number(r.delivery_fee),
  storeName: r.store_name ?? undefined,
  endsAt: r.ends_at ?? undefined,
  tenantId: r.tenant_id ?? undefined,
  productId: r.product_id ?? undefined,
  city: r.city ?? undefined,
  active: !!r.active,
  sortOrder: r.sort_order ?? 0,
  createdAt: r.created_at,
});

export const mapCategory = (r: any): GuiaCategory => ({
  id: r.id,
  slug: r.slug,
  label: r.label,
  emoji: r.emoji ?? "",
  imageUrl: r.image_url ?? undefined,
  imageFit: (r.image_fit ?? "cover") as "cover" | "contain",
  city: r.city ?? undefined,
  active: !!r.active,
  sortOrder: r.sort_order ?? 0,
});

export type GuiaHome = {
  slots: GuiaSlot[];
  categories: GuiaCategory[];
  sectionOrder: GuiaSectionId[];
  sectionActive: Record<string, boolean>;
};

const normalizeCity = (c?: string | null) =>
  (c ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const getGuiaHome = createServerFn({ method: "GET" })
  .inputValidator((d: { city?: string | null } | undefined) =>
    z.object({ city: z.string().nullable().optional() }).optional().parse(d),
  )
  .handler(async ({ data }): Promise<GuiaHome> => {
    const city = normalizeCity(data?.city ?? null);
    const nowIso = new Date().toISOString();

    const [slotsRes, catsRes, secRes] = await Promise.all([
      supabaseAdmin
        .from("guia_slots")
        .select("*")
        .eq("active", true)
        .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("guia_categories")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabaseAdmin.from("guia_sections").select("*").order("sort_order", { ascending: true }),
    ]);

    if (slotsRes.error) throw new Error(slotsRes.error.message);
    if (catsRes.error) throw new Error(catsRes.error.message);
    if (secRes.error) throw new Error(secRes.error.message);

    const cityMatch = (rowCity: string | null | undefined) =>
      !rowCity || !city || normalizeCity(rowCity) === city;

    const slots = (slotsRes.data ?? []).map(mapSlot).filter((s) => cityMatch(s.city));
    const categories = (catsRes.data ?? []).map(mapCategory).filter((c) => cityMatch(c.city));

    const rows = secRes.data ?? [];
    const sectionOrder = rows.length
      ? (rows.map((r: any) => r.id as GuiaSectionId).filter((id) =>
          DEFAULT_SECTION_ORDER.includes(id),
        ) as GuiaSectionId[])
      : DEFAULT_SECTION_ORDER;
    const missing = DEFAULT_SECTION_ORDER.filter((id) => !sectionOrder.includes(id));
    const sectionActive: Record<string, boolean> = {};
    for (const r of rows) sectionActive[(r as any).id] = !!(r as any).active;

    return {
      slots,
      categories,
      sectionOrder: [...sectionOrder, ...missing],
      sectionActive,
    };
  });
