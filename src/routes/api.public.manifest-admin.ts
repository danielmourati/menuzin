import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/manifest-admin")({
  server: {
    handlers: {
      GET: async () => {
        const manifest = {
          name: "Menuzin Painel da Loja",
          short_name: "Menuzin Painel",
          description: "Painel do lojista Menuzin: pedidos, cardápio e configurações.",
          id: "/admin",
          start_url: "/admin/login",
          scope: "/admin",
          display: "standalone",
          lang: "pt-BR",
          theme_color: "#EA5B1E",
          background_color: "#EA5B1E",
          icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
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
