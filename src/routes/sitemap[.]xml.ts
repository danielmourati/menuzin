import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { listActiveTenants } from "@/lib/catalog.functions";
import { DIRECTORY_CATEGORIES } from "@/lib/directory.functions";

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
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/comece-agora", changefreq: "weekly", priority: "0.9" },
          { path: "/contato", changefreq: "monthly", priority: "0.4" },
          { path: "/privacidade", changefreq: "yearly", priority: "0.2" },
          { path: "/termos", changefreq: "yearly", priority: "0.2" },
        ];

        for (const c of DIRECTORY_CATEGORIES) {
          entries.push({ path: `/guia/${c.slug}`, changefreq: "daily", priority: "0.7" });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const seen = new Set<string>();
          for (let from = 0; from < 20000; from += 1000) {
            const { data, error } = await supabaseAdmin
              .from("directory_public")
              .select("product_id")
              .range(from, from + 999);
            if (error) throw error;
            for (const r of (data ?? []) as { product_id: string | null }[]) {
              if (r.product_id && !seen.has(r.product_id)) {
                seen.add(r.product_id);
                entries.push({ path: `/guia/produto/${r.product_id}`, changefreq: "weekly", priority: "0.6" });
              }
            }
            if (!data || data.length < 1000) break;
          }
        } catch (err) {
          console.error("[sitemap] produtos", err);
        }

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
