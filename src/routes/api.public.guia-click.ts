import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/guia-click")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const productId = typeof body?.product_id === "string" ? body.product_id : null;
          const destination = body?.destination === "whatsapp" || body?.destination === "storefront"
            ? body.destination
            : null;
          if (!productId || !destination) {
            return new Response(null, { status: 204 });
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
        return new Response(null, { status: 204 });
      },
      OPTIONS: async () => new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }),
    },
  },
});
