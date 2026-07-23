// Conversores entre tipos do banco e tipos de UI.
import type { DbProduct, DbTenant } from "./db-types";
import type {
  Product, ProductAddon, Tenant, Category,
  ProductSize, ProductFlavor, AddonGroup, AddonOption,
} from "./domain-types";

export function dbProductToUi(p: DbProduct, categoryName: string, categoryKind: "standard" | "pizza" | "oferta" = "standard"): Product {
  return {
    id: p.id,
    name: p.name,
    category: categoryName,
    categoryId: p.category_id,
    categoryKind,
    description: p.description ?? "",
    price: Number(p.price),
    promoPrice: p.promo_price != null ? Number(p.promo_price) : undefined,
    image: p.image_url ?? "",
    available: p.available,
    featured: p.featured,
    bestseller: p.bestseller ?? false,
    prepTime: p.prep_time ?? undefined,
    type: (p.type ?? "standard") as "standard" | "pizza",
    maxFlavors: p.max_flavors ?? undefined,
    allowObservations: p.allow_observations ?? true,
    listedAsFlavor: p.listed_as_flavor ?? null,
    freeGiftKind: (p.free_gift_kind ?? null) as "crust" | "product" | null,
    freeGiftRefId: p.free_gift_ref_id ?? null,
    freeCrustMode: (p.free_crust_mode ?? "none") as "none" | "fixed" | "customer_choice",
    offerOriginalPrice: p.offer_original_price != null ? Number(p.offer_original_price) : null,
    offerFixedSizeId: p.offer_fixed_size_id ?? null,
    offerFixedCrustId: p.offer_fixed_crust_id ?? null,
    offerIncludedProductId: p.offer_included_product_id ?? null,
    offerFixedFlavorIds: p.offer_fixed_flavor_ids ?? [],
    offerPieces: p.offer_pieces ?? null,
    offerMaxFlavors: p.offer_max_flavors ?? null,
    addons: (p.addons ?? []).map<ProductAddon>((a) => ({
      id: a.id, name: a.name, price: Number(a.price),
    })),
    sizes: (p.sizes ?? []).map<ProductSize>((s) => ({
      id: s.id, name: s.name, price: Number(s.price), sortOrder: s.sort_order, categorySizeId: s.category_size_id ?? null,
      fractionPrices: (s.fraction_prices ?? null) as Record<string, number> | null,
    })),

    flavors: (p.flavors ?? []).map<ProductFlavor>((f) => ({
      id: f.id, name: f.name, description: f.description ?? "",
      priceDelta: Number(f.price_delta), available: f.available, sortOrder: f.sort_order,
    })),
    addonGroups: (p.addonGroups ?? []).map<AddonGroup>((g) => ({
      id: g.id, name: g.name,
      description: g.description ?? "",
      kind: (g.kind ?? "adicional"),
      required: g.required,
      minSelect: g.min_select, maxSelect: g.max_select, sortOrder: g.sort_order,
      options: (g.options ?? []).map<AddonOption>((o) => ({
        id: o.id, name: o.name, price: Number(o.price), sortOrder: o.sort_order,
      })),
    })),
  };
}

export function dbTenantToUi(t: DbTenant): Tenant {
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: t.description ?? "",
    whatsapp: t.whatsapp,
    city: t.city ?? "",
    state: t.state ?? "",
    address: t.address ?? "",
    open: t.open,
    openMode: (t.open_mode ?? "auto"),
    hoursSchedule: Array.isArray(t.hours_schedule) ? t.hours_schedule : [],
    deliveryMode: t.delivery_mode ?? "single",
    acceptsDelivery: t.accepts_delivery ?? true,
    acceptsTakeout: t.accepts_takeout ?? true,
    acceptsDinein: t.accepts_dinein ?? true,
    prepTime: t.prep_time ?? "",
    minOrder: Number(t.min_order),
    deliveryFee: Number(t.delivery_fee),
    hours: t.hours ?? "",
    logoLetter: t.logo_letter ?? (t.name.charAt(0).toUpperCase()),
    logoUrl: t.logo_url ?? undefined,
    themeFrom: t.theme_from,
    themeTo: t.theme_to,
    plan: t.plan,
    active: t.active,
    social: (t.social as { instagram?: string; facebook?: string }) ?? {},
  };
}


export function dbCategoriesToUi(rows: { id: string; name: string; sort_order: number; active: boolean; kind?: string | null }[]): Category[] {
  return rows.map((c) => ({
    id: c.id, name: c.name, order: c.sort_order, active: c.active,
    kind: (c.kind === "pizza" ? "pizza" : c.kind === "oferta" ? "oferta" : "standard") as "standard" | "pizza" | "oferta",
  }));
}
