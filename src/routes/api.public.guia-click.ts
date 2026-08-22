import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Limitador best-effort por processo: evita inflar métricas de destaque com
// cliques repetidos do mesmo IP no mesmo produto em janela curta.
const WINDOW_MS = 30_000;
const MAX_ENTRIES = 5_000;
const recent = new Map<string, number>();

function isThrottled(key: string): boolean {
  const now = Date.now();
  const last = recent.get(key);
  if (last && now - last < WINDOW_MS) return true;
  if (recent.size > MAX_ENTRIES) {
    for (const [k, t] of recent) {
      if (now - t > WINDOW_MS) recent.delete(k);
    }
    if (recent.size > MAX_ENTRIES) recent.clear();
  }
  recent.set(key, now);
  return false;
}

export const Route = createFileRoute("/api/public/guia-click")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const productId = typeof body?.product_id === "string" ? body.product_id : null;
          const destination =
            body?.destination === "whatsapp" || body?.destination === "storefront"
              ? body.destination
              : null;
          if (!productId || !UUID_RE.test(productId) || !destination) {
            return new Response(null, { status: 204, headers: CORS });
          }

          const ip =
            request.headers.get("cf-connecting-ip") ||
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            "anon";
          if (isThrottled(`${ip}:${productId}:${destination}`)) {
            return new Response(null, { status: 204, headers: CORS });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: item } = await supabaseAdmin
            .from("directory_public")
            .select("tenant_id, neighborhood, category")
            .eq("product_id", productId)
            .maybeSingle();
          if (item) {
            const it = item as { tenant_id: string; neighborhood: string | null; category: string | null };
            const ua = request.headers.get("user-agent")?.slice(0, 300) ?? null;
            await supabaseAdmin.from("directory_clicks").insert({
              product_id: productId,
              tenant_id: it.tenant_id,
              neighborhood: it.neighborhood,
              category: it.category,
              destination,
              user_agent: ua,
            });
          }
        } catch {
          // fire-and-forget
        }
        return new Response(null, { status: 204, headers: CORS });
      },
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
    },
  },
});
