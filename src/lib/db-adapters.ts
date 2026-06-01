// Conversores entre os tipos do banco (DbProduct/DbTenant) e os tipos de UI
// pré-existentes (Product/Tenant em domain-types.ts) para minimizar refactor.
import type { DbProduct, DbTenant } from "./db-types";
import type { Product, ProductAddon, Tenant, Category } from "./domain-types";

export function dbProductToUi(p: DbProduct, categoryName: string): Product {
  return {
    id: p.id,
    name: p.name,
    category: categoryName,
    description: p.description ?? "",
    price: Number(p.price),
    promoPrice: p.promo_price != null ? Number(p.promo_price) : undefined,
    image: p.image_url ?? "",
    available: p.available,
    featured: p.featured,
    prepTime: p.prep_time ?? undefined,
    addons: p.addons.map<ProductAddon>((a) => ({
      id: a.id, name: a.name, price: Number(a.price),
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
    prepTime: t.prep_time ?? "",
    minOrder: Number(t.min_order),
    deliveryFee: Number(t.delivery_fee),
    hours: t.hours ?? "",
    logoLetter: t.logo_letter ?? (t.name.charAt(0).toUpperCase()),
    logoUrl: t.logo_url ?? undefined,
    themeFrom: t.theme_from,
    themeTo: t.theme_to,
    active: t.active,
    social: (t.social as { instagram?: string; facebook?: string }) ?? {},
  };
}

export function dbCategoriesToUi(rows: { id: string; name: string; sort_order: number; active: boolean }[]): Category[] {
  return rows.map((c) => ({
    id: c.id, name: c.name, order: c.sort_order, active: c.active,
  }));
}
