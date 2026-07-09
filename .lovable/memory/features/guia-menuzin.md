---
name: Guia Menuzin — public directory layer
description: Public discovery layer (/guia) on top of multi-tenant storefronts. Opt-in per tenant, view directory_public as the single anon surface, click analytics via public route, highlight via Pro plan.
type: feature
---

Public discovery layer sitting above the existing multi-tenant storefronts. Reveals products from tenants that explicitly opt-in; no checkout, no split — the CTA sends the customer to wa.me or to `/$slug`.

## Data model

- `tenants` adds: `neighborhood`, `cep`, `directory_opt_in` (default false).
- `products` adds: `directory_visible` (default false), `directory_category` (string from fixed list), `directory_featured_until` (timestamptz null = no highlight).
- New table `directory_clicks` (anonymous telemetry). INSERT policy `WITH CHECK (true)` for anon+authenticated (fire-and-forget from server route); SELECT restricted to the owning tenant or platform admin.
- View `public.directory_public` (owner postgres, `security_invoker=off`) — the **only** anon-visible surface. Whitelisted columns only. Never add sensitive fields (emails, orders, payments).

## Categories (fixed, code-owned)

`DIRECTORY_CATEGORIES` in `src/lib/directory.functions.ts`:
`quentinha, pizza, churrasco, hamburguer, lanches, marmitex, acai, doces`.

## Server API

- `src/lib/directory.functions.ts` — public reads (`listCategories`, `listFeatured`, `listByCategory`, `listNeighborhoods`, `getDirectoryProduct`) and authenticated `getTenantMetrics`.
- `src/lib/directory-admin.functions.ts` — opt-in toggle, product publish/category, featured 7-day highlight (Pro only).
- `src/routes/api.public.guia-click.ts` — POST fire-and-forget click ping; responds 204 even on failure; resolves tenant_id / neighborhood / category from `directory_public` (never trusts client for those).

## Public routes

- `/guia` — categories grid + featured carousel.
- `/guia/$categoria` — grid + neighborhood filter; JSON-LD ItemList.
- `/guia/produto/$id` — detail + sticky "Pedir agora" button; JSON-LD Product; sends beacon → wa.me or `/$slug`.

## Admin

- `/admin/diretorio` (link in AdminLayout under Vendas): opt-in section (requires `neighborhood`; CEP validation), products table (switch + category select), highlight (Pro-only), 30-day click chart + top-10 by product.

## Decisions

- Opt-in defaults **off** — nothing appears in the Guide without the tenant explicitly opting in.
- Listing is **always free**; highlight is a Pro-plan feature, **no per-highlight billing** in this phase.
- Click analytics is anonymous — only user-agent (truncated) is stored, no IPs, no identity.
- View `directory_public` is the single anon surface; adding new columns to `tenants`/`products` does NOT expose them in the Guide unless explicitly added to the view (review required).
- Fixed category list in code (redeploy required to change). Deliberate: keeps SEO URLs stable and the feed curated.
- CEP validation `^\d{5}-?\d{3}$` at admin dialog only.

## Out of scope (do NOT re-propose)

- In-app payment, split, logistics, customer reviews.
- Push notifications, customer login on Guide.
- Paid one-off highlights outside the Pro plan.
- TWA/app store publication (deferred until feed validated).
- WhatsApp order-status notifications (separate feature, still open).
