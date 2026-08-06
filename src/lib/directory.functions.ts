import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveEffectiveTenantId } from "@/lib/active-tenant.server";

export type DirectoryItem = {
  product_id: string;
  name: string;
  description: string | null;
  price: number;
  promo_price: number | null;
  image_url: string | null;
  category: string | null;
  featured_until: string | null;
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
  tenant_logo: string | null;
  neighborhood: string | null;
  city: string | null;
  whatsapp: string | null;
  plan?: string | null;
};

export const DIRECTORY_CATEGORIES: { slug: string; label: string; emoji: string }[] = [
  { slug: "quentinha", label: "Quentinhas", emoji: "🍱" },
  { slug: "pizza", label: "Pizza", emoji: "🍕" },
  { slug: "churrasco", label: "Churrasco", emoji: "🥩" },
  { slug: "espetinhos", label: "Espetinhos", emoji: "🍢" },
  { slug: "hamburguer", label: "Hambúrguer", emoji: "🍔" },
  { slug: "lanches", label: "Lanches", emoji: "🥪" },
  { slug: "marmitex", label: "Marmitex", emoji: "🍛" },
  { slug: "acai", label: "Açaí", emoji: "🍨" },
  { slug: "doces", label: "Doces", emoji: "🍰" },
];

const nowIso = () => new Date().toISOString();

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("directory_public")
    .select("category");
  if (error) throw new Error(error.message);
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const key = (row as { category: string | null }).category;
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return {
    categories: DIRECTORY_CATEGORIES.map((c) => ({ ...c, count: counts.get(c.slug) ?? 0 })),
  };
});

export const listFeatured = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("directory_public")
    .select("*")
    .gt("featured_until", nowIso())
    .order("featured_until", { ascending: false })
    .limit(24);
  if (error) throw new Error(error.message);
  return { items: (data ?? []) as unknown as DirectoryItem[] };
});

export type DirectoryStore = {
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
  tenant_logo: string | null;
  neighborhood: string | null;
  city: string | null;
  whatsapp: string | null;
  categories: string[];
  product_count: number;
  has_featured: boolean;
  vertical: GuiaVertical;
};

export type GuiaVertical = "restaurantes" | "mercados" | "conveniencias";

/** Maps the tenant business types into one of the Guia top-level verticals. */
export function verticalOf(types: string[] | null | undefined): GuiaVertical {
  const t = (types ?? []).map((x) => String(x).toLowerCase());
  if (t.some((x) => /mercado|mercearia|hortifruti|supermerc/.test(x))) return "mercados";
  if (t.some((x) => /conveniencia|adega|tabacaria|bebida/.test(x))) return "conveniencias";
  return "restaurantes";
}

export const listAllStores = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("directory_public")
    .select("tenant_id, tenant_slug, tenant_name, tenant_logo, neighborhood, city, whatsapp, category, featured_until")
    .limit(2000);
  if (error) throw new Error(error.message);
  const now = Date.now();
  const map = new Map<string, DirectoryStore>();
  for (const raw of (data ?? []) as Array<{
    tenant_id: string;
    tenant_slug: string;
    tenant_name: string;
    tenant_logo: string | null;
    neighborhood: string | null;
    city: string | null;
    whatsapp: string | null;
    category: string | null;
    featured_until: string | null;
  }>) {
    const existing = map.get(raw.tenant_id);
    const isFeat = !!raw.featured_until && new Date(raw.featured_until).getTime() > now;
    if (existing) {
      if (raw.category && !existing.categories.includes(raw.category)) existing.categories.push(raw.category);
      existing.product_count += 1;
      if (isFeat) existing.has_featured = true;
    } else {
      map.set(raw.tenant_id, {
        tenant_id: raw.tenant_id,
        tenant_slug: raw.tenant_slug,
        tenant_name: raw.tenant_name,
        tenant_logo: raw.tenant_logo,
        neighborhood: raw.neighborhood,
        city: raw.city,
        whatsapp: raw.whatsapp,
        categories: raw.category ? [raw.category] : [],
        product_count: 1,
        has_featured: isFeat,
        vertical: "restaurantes",
      });
    }
  }
  const ids = Array.from(map.keys());
  if (ids.length) {
    const { data: tRows } = await supabaseAdmin
      .from("tenants")
      .select("id, business_types")
      .in("id", ids);
    for (const t of (tRows ?? []) as { id: string; business_types: string[] | null }[]) {
      const store = map.get(t.id);
      if (store) store.vertical = verticalOf(t.business_types);
    }
  }

  const stores = Array.from(map.values()).sort((a, b) => {
    if (a.has_featured !== b.has_featured) return a.has_featured ? -1 : 1;
    if (a.product_count !== b.product_count) return b.product_count - a.product_count;
    return a.tenant_name.localeCompare(b.tenant_name);
  });
  return { stores };
});

export const listNeighborhoods = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("directory_public")
    .select("neighborhood");
  if (error) throw new Error(error.message);
  const set = new Set<string>();
  for (const row of data ?? []) {
    const n = (row as { neighborhood: string | null }).neighborhood;
    if (n) set.add(n);
  }
  return { neighborhoods: Array.from(set).sort() };
});

const ByCategoryInput = z.object({
  category: z.string().min(1).max(40),
  neighborhood: z.string().min(1).max(80).optional(),
});

export const listByCategory = createServerFn({ method: "POST" })
  .inputValidator((d) => ByCategoryInput.parse(d))
  .handler(async ({ data }) => {
    let query = supabaseAdmin
      .from("directory_public")
      .select("*")
      .eq("category", data.category);
    if (data.neighborhood) query = query.eq("neighborhood", data.neighborhood);
    const { data: rows, error } = await query.limit(200);
    if (error) throw new Error(error.message);

    const now = Date.now();
    const items = ((rows ?? []) as unknown as DirectoryItem[]).slice();
    // featured first (until timestamp in future), then random-ish
    items.sort((a, b) => {
      const af = a.featured_until && new Date(a.featured_until).getTime() > now ? 1 : 0;
      const bf = b.featured_until && new Date(b.featured_until).getTime() > now ? 1 : 0;
      if (af !== bf) return bf - af;
      return (a.product_id > b.product_id ? 1 : -1);
    });
    return { items };
  });

const ProductInput = z.object({ productId: z.string().uuid() });
export const getDirectoryProduct = createServerFn({ method: "POST" })
  .inputValidator((d) => ProductInput.parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("directory_public")
      .select("*")
      .eq("product_id", data.productId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { item: (row as unknown as DirectoryItem | null) };
  });

const MetricsInput = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const getTenantMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => MetricsInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { tenantId } = await resolveEffectiveTenantId(supabase, userId);
    const to = data.to ? new Date(data.to) : new Date();
    const from = data.from ? new Date(data.from) : new Date(to.getTime() - 30 * 24 * 3600 * 1000);

    const { data: rows, error } = await supabaseAdmin
      .from("directory_clicks")
      .select("product_id, destination, created_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .limit(5000);
    if (error) throw new Error(error.message);

    const byDay = new Map<string, number>();
    const byProduct = new Map<string, number>();
    let totalWhatsapp = 0;
    let totalStorefront = 0;
    for (const r of rows ?? []) {
      const rr = r as { product_id: string | null; destination: string; created_at: string };
      const day = rr.created_at.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
      if (rr.product_id) byProduct.set(rr.product_id, (byProduct.get(rr.product_id) ?? 0) + 1);
      if (rr.destination === "whatsapp") totalWhatsapp++;
      else totalStorefront++;
    }

    // resolve product names
    const productIds = Array.from(byProduct.keys());
    const namesById = new Map<string, string>();
    if (productIds.length) {
      const { data: prodRows } = await supabaseAdmin
        .from("products").select("id, name").in("id", productIds);
      for (const p of (prodRows ?? []) as { id: string; name: string }[]) namesById.set(p.id, p.name);
    }

    const top = Array.from(byProduct.entries())
      .map(([id, count]) => ({ product_id: id, name: namesById.get(id) ?? "Produto", count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const days: { date: string; count: number }[] = [];
    const cursor = new Date(from);
    cursor.setUTCHours(0, 0, 0, 0);
    while (cursor <= to) {
      const key = cursor.toISOString().slice(0, 10);
      days.push({ date: key, count: byDay.get(key) ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return {
      total: (rows ?? []).length,
      totalWhatsapp,
      totalStorefront,
      days,
      top,
    };
  });

const SearchInput = z.object({ term: z.string().min(1).max(60) });

export type GuiaSearchResult = {
  stores: { tenant_id: string; tenant_slug: string; tenant_name: string; tenant_logo: string | null; neighborhood: string | null }[];
  products: { product_id: string; name: string; price: number; promo_price: number | null; image_url: string | null; tenant_name: string }[];
};

/** Free-text search across stores and dishes published in the Guia. */
export const searchGuia = createServerFn({ method: "POST" })
  .inputValidator((d) => SearchInput.parse(d))
  .handler(async ({ data }): Promise<GuiaSearchResult> => {
    const term = data.term.trim().replace(/[%,]/g, " ");
    if (term.length < 2) return { stores: [], products: [] };
    const like = `%${term}%`;

    const { data: rows, error } = await supabaseAdmin
      .from("directory_public")
      .select("product_id, name, price, promo_price, image_url, tenant_id, tenant_slug, tenant_name, tenant_logo, neighborhood")
      .or(`name.ilike.${like},tenant_name.ilike.${like}`)
      .limit(60);
    if (error) throw new Error(error.message);

    const list = (rows ?? []) as unknown as Array<{
      product_id: string; name: string; price: number; promo_price: number | null;
      image_url: string | null; tenant_id: string; tenant_slug: string; tenant_name: string;
      tenant_logo: string | null; neighborhood: string | null;
    }>;

    const storeMap = new Map<string, GuiaSearchResult["stores"][number]>();
    const products: GuiaSearchResult["products"] = [];
    const lowered = term.toLowerCase();
    for (const r of list) {
      if (!storeMap.has(r.tenant_id)) {
        storeMap.set(r.tenant_id, {
          tenant_id: r.tenant_id,
          tenant_slug: r.tenant_slug,
          tenant_name: r.tenant_name,
          tenant_logo: r.tenant_logo,
          neighborhood: r.neighborhood,
        });
      }
      if (r.name.toLowerCase().includes(lowered) && products.length < 20) {
        products.push({
          product_id: r.product_id,
          name: r.name,
          price: Number(r.price),
          promo_price: r.promo_price == null ? null : Number(r.promo_price),
          image_url: r.image_url,
          tenant_name: r.tenant_name,
        });
      }
    }

    const stores = Array.from(storeMap.values())
      .sort((a, b) => {
        const am = a.tenant_name.toLowerCase().includes(lowered) ? 0 : 1;
        const bm = b.tenant_name.toLowerCase().includes(lowered) ? 0 : 1;
        return am - bm || a.tenant_name.localeCompare(b.tenant_name);
      })
      .slice(0, 12);

    return { stores, products };
  });
