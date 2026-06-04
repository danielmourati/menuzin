## Goal
Replace the current "groups + options + min/max/required" UI in `admin/adicionais` with a simple, flat list where each row is **one item** — either a paid **Add-on** (with price) or a free **Observation** (no price) — assigned to one or many categories via checkboxes.

## Strategy: keep DB, simplify UI

The existing schema (`addon_groups` + `addon_options` + `addon_group_targets`) is already used by the storefront `ProductModal`, `CartDrawer`, order persistence, and the receipt builder. Rewriting it would force changes across the whole order pipeline.

Instead, we treat each visible "item" in the new UI as an **implicit single-option group**:
- Group: `name = <item name>`, `kind = adicional|observacao`, `required = false`, `min_select = 0`, `max_select = 1`, `active = <item status>`.
- Option: a single `addon_options` row mirroring name + price.
- Targets: `addon_group_targets` rows for the selected categories (product-level targeting removed from UI).

This preserves all downstream behavior (cart totals, customer/admin order details, printed receipt) with zero changes to storefront, orders, or receipts.

## Changes

### 1. `src/routes/admin.adicionais.tsx` — full rewrite of the UI
- **Header**: two buttons — `Novo adicional`, `Nova observação`.
- **Tabs**: `Todos` · `Adicionais` · `Observações`.
- **List rows (cards)** showing:
  - Name
  - Badge: `Adicional` or `Observação`
  - Price (only for add-ons), formatted BRL
  - Categories applied (comma-separated names; "Todas as categorias" if empty? → show "Sem categoria" badge instead, since empty means it won't appear)
  - Status badge (`Ativo`/`Inativo`)
  - Actions: edit, delete, toggle active (switch)
- **Create/edit dialog** (single form, no tabs):
  - Name (required)
  - Price (only for `adicional`) — uses existing `CurrencyInput`, ≥ 0
  - "Aplicar a categorias" — checkbox grid of tenant categories (multi-select)
  - Status switch (Ativo)
  - Save / Cancel
- **Remove from UI**: kind tabs inside dialog, min/max selection inputs, required toggle, "aplicar a produtos específicos", options sub-editor.

### 2. `src/lib/catalog-admin.functions.ts` — add simplified server functions
Add three new server fns (keep existing ones intact for backward compatibility):
- `listAddonItems()` — returns flat list: `[{ id (group_id), optionId, name, kind, price, active, categoryIds[] }]`. Internally queries `addon_groups` + first/only `addon_options` row + `addon_group_targets` filtered to `category_id IS NOT NULL`.
- `saveAddonItem({ id?, name, kind, price, active, categoryIds })`:
  - Upsert group (`required=false`, `min_select=0`, `max_select=1`).
  - Upsert the single option row (same name + price; active mirrors group).
  - Replace `addon_group_targets` rows scoped to categories only (delete existing category targets for that group, insert new).
- `deleteAddonItem({ id })` — wraps existing `deleteAddonGroup` (cascades options + targets).

Existing `saveAddonGroup` / `saveAddonOption` / `setAddonGroupTargets` remain for any legacy data and are not removed.

### 3. No DB migration needed
Existing rows still load through the storefront. Legacy multi-option groups created previously will not be editable from the new simplified UI but will keep functioning on the storefront. (Optional follow-up: a one-time normalization, out of scope here.)

### 4. No changes to:
- `src/components/storefront/ProductModal.tsx` (already renders `addonGroups` with options and prices)
- `src/components/storefront/CartDrawer.tsx` (already sums option prices into subtotal/total and lists `groupLabels`)
- `src/lib/receipt-builder.ts` and `order-adapters.ts` (already include addon lines with prices and zero-price observations)
- `orders.functions.ts` totals

Add-on prices already flow into subtotal/total and appear in customer area, admin area, and printed coupon — this refactor only simplifies the admin authoring UX.

## Acceptance checklist
- Admin can create/edit/delete/activate/deactivate add-ons and observations.
- Add-on requires a price ≥ 0 (BRL input); observation has no price field.
- Category assignment by checkbox, multi-select.
- Listing shows name, type, price (if add-on), categories, status, edit/delete.
- Tabs filter by `Todos / Adicionais / Observações`.
- Storefront product modal continues to show items under each linked category's products; customer can multi-select.
- Cart subtotal/total include add-on prices; observations don't change totals.
- Order details (customer + admin) and printed receipt continue to render add-ons with price and observations without price.
- All data scoped per tenant via existing RLS (no policy changes required).
