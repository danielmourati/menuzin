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
};

export const DIRECTORY_CATEGORIES: { slug: string; label: string; emoji: string }[] = [
  { slug: "quentinha", label: "Quentinhas", emoji: "🍱" },
  { slug: "pizza", label: "Pizza", emoji: "🍕" },
  { slug: "churrasco", label: "Churrasco", emoji: "🥩" },
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
