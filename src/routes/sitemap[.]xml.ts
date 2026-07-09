import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { listActiveTenants } from "@/lib/catalog.functions";

const BASE_URL = "https://menuzin.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/guia", changefreq: "daily", priority: "0.9" },
          { path: "/guia/quentinha", changefreq: "daily", priority: "0.7" },
          { path: "/guia/pizza", changefreq: "daily", priority: "0.7" },
          { path: "/guia/churrasco", changefreq: "daily", priority: "0.7" },
          { path: "/guia/hamburguer", changefreq: "daily", priority: "0.7" },
          { path: "/guia/lanches", changefreq: "daily", priority: "0.7" },
          { path: "/guia/marmitex", changefreq: "daily", priority: "0.7" },
          { path: "/guia/acai", changefreq: "daily", priority: "0.7" },
          { path: "/guia/doces", changefreq: "daily", priority: "0.7" },
        ];

        try {
          const { tenants } = await listActiveTenants();
          for (const t of tenants ?? []) {
            if (t?.slug) {
              entries.push({ path: `/${t.slug}`, changefreq: "daily", priority: "0.8" });
            }
          }
        } catch {
          // sitemap should not fail the response if dynamic fetch breaks
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
