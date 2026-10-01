import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_ICONS = [
  { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
];

export const Route = createFileRoute("/api/public/manifest/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slug = String(params.slug || "").toLowerCase();
        if (!/^[a-z0-9-]{1,80}$/.test(slug)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("tenants")
          .select("name, description, logo_url, theme_from, active")
          .eq("slug", slug)
          .maybeSingle();
        if (!data || !data.active) return new Response("Not found", { status: 404 });
        const icons = data.logo_url
          ? [
              { src: data.logo_url, sizes: "192x192", type: "image/png", purpose: "any" },
              { src: data.logo_url, sizes: "512x512", type: "image/png", purpose: "any" },
              ...DEFAULT_ICONS.slice(2),
            ]
          : DEFAULT_ICONS;
        const color = data.theme_from || "#EA5B1E";
        const manifest = {
          name: data.name,
          short_name: data.name.length > 12 ? data.name.slice(0, 12).trim() : data.name,
          description: data.description || `Cardápio digital de ${data.name}`,
          id: `/${slug}`,
          start_url: `/${slug}`,
          scope: `/${slug}`,
          display: "standalone",
          orientation: "portrait",
          lang: "pt-BR",
          theme_color: color,
          background_color: color,
          icons,
        };
        return new Response(JSON.stringify(manifest), {
          headers: {
            "Content-Type": "application/manifest+json; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
