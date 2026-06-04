
## Scope
Frontend-only refactor of the public storefront. No DB/business-logic changes. Cart totals, order flow, tenant scoping, and receipt remain unchanged.

## Files to change

### 1. `src/components/storefront/ProductCard.tsx`
Rebuild as a vertical card with edge-to-edge hero image:
- Image on top, full width, `aspect-[4/3]` or `aspect-video`, `object-cover`, no internal padding, rounded matching card radius (top corners only).
- Content area below image: name, 2-line description, price + promo, "Destaque" badge if `featured`.
- Bottom-right floating "+" button overlapping image/content.
- "Indisponível" overlay if unavailable.
- Preserve existing props (`product`, `onClick`).

### 2. `src/components/storefront/ProductModal.tsx`
- Hero image edge-to-edge at top of modal (remove the `max-w-md` and `object-contain` framing; use `object-cover` filling full width, fixed aspect ratio e.g. `aspect-square` on mobile).
- Floating back button with soft shadow (kept).
- Improve spacing rhythm between sections (image → title/price → description → groups → bottom bar).
- Sticky bottom action bar (kept).
- **Dedupe adicionais/observações:** Currently the modal renders both `product.addonGroups` (looped) AND legacy `product.addons`. After the recent simplification, each addon item is its own single-option group. To avoid showing the same item twice:
  - Split `product.addonGroups` into `adicionalGroups` (kind !== "observacao") and `observacaoGroups` (kind === "observacao").
  - Render a single **"Adicionais"** section header, then a flat list of all options from adicional groups (checkbox rows with name + price right-aligned). Selecting still routes through `toggleGroupOption(g.id, o.id, g.maxSelect)` to preserve cart/order behavior.
  - Render a single **"Observações"** section header (only if any observation groups exist), flat list of options as checkboxes, no price, not required.
  - Hide the legacy "Adicionais" block (`product.addons`) entirely if `addonGroups` already covers it; keep as fallback only when `addonGroups` is empty.
  - Drop "Obrigatório" badges and min/max hints for these sections since simplified add-ons are always optional single-option groups.
- Keep size/flavor sections untouched.

### 3. `src/routes/$slug.tsx`
- **Search input:** force white background, stronger border, larger radius, better placeholder contrast (`bg-white text-foreground placeholder:text-muted-foreground border-input shadow-sm`).
- **Featured scroller:** Add a new section above the category tabs:
  - Title "Destaques" (only rendered if `products.some(p => p.featured && p.available)`).
  - Horizontal scroll container (`flex overflow-x-auto snap-x scrollbar-hide`) with larger cards (~260px wide) showing big image, name, short description, price, "Destaque" badge.
  - Clicking opens the same ProductModal.
  - Hidden when activeCat !== "Todos" or search is active (to avoid noise), or always visible — pick: keep visible only when `activeCat === "Todos"` and `!search`.
- Grid below stays the same.

### 4. New component `src/components/storefront/FeaturedScroller.tsx`
Encapsulates the horizontal scroller card UI for featured products. Receives `products` and `onSelect`.

## Behavior preserved
- `useCart().add(...)` still receives `groupOptions` derived from `groupSelections`, so totals and order details remain correct.
- `validateSelection` continues to govern the Add button.
- Receipt builder, order adapters, cart drawer unchanged.

## Acceptance
- Product card shows large edge-to-edge image, no padding around it.
- Modal hero image fills width; no `max-w-md` container around image.
- Adicionais appear once, under a single "Adicionais" header, with price right-aligned.
- Observações appear once (when present), under "Observações", checkboxes, no price, optional.
- Featured horizontal scroller appears at top when there are featured products and no filter/search active.
- Search input is white with modern styling.
- Cart totals and order details still reflect selected add-ons correctly.
- Mobile + desktop layouts both look clean.
