## Goal
Make the "Novo bairro" modal on `/taxas-entrega` use ViaCEP as the primary source for filling Bairro, Cidade, UF, CEP inicial and CEP final. Keep manual entry and existing CSV `cep_ranges` as fallback. Storage shape stays the tenant-scoped `delivery_zones` table; the checkout resolver does not change.

## Scope (frontend-first; minimal backend)

### 1. ViaCEP client helper (browser fetch)
New file `src/lib/viacep.ts`:
- `lookupByCep(cep)` → `GET https://viacep.com.br/ws/{cep}/json/` (8 digits only).
- `searchByAddress({ uf, city, street })` → `GET https://viacep.com.br/ws/{UF}/{city}/{street}/json/` (city & street ≥ 3 chars; strip accents, encode URI).
- Return normalized `ViaCepResult[]` with `{ cep, logradouro, bairro, localidade, uf }`.
- Surface `{ status: 'ok' | 'empty' | 'invalid' | 'error', results }` so the UI can render proper empty/error states.
- No server function needed — called directly from the modal (CORS-friendly public API).

### 2. Modal rewrite (`src/routes/admin.taxas-entrega.tsx`)
Replace the `CepRangeSearch` block with a new `ViaCepSearch` component. Keep the existing modal frame (overflow fix stays).

Fields, in order:
1. Search input — "Buscar bairro, cidade, rua ou CEP" (helper text per spec).
2. Bairro * (existing).
3. Cidade — new in `Editing` state.
4. UF — new (2-char uppercase).
5. CEP inicial / CEP final (existing).
6. Taxa, Pedido mínimo, Tempo estimado (existing).
7. Ativo (existing).

Search behavior:
- Debounce 500ms.
- If input digits length === 8 → `lookupByCep`. Auto-fill Bairro (if returned), Cidade, UF, CEP inicial = CEP final = returned CEP. Helper: "O ViaCEP retornou um CEP específico. Se a área de entrega cobre uma faixa maior, ajuste o CEP inicial e final."
- Else if text length ≥ 3:
  - Determine UF/City context: prefer values already in the form; fallback to tenant's `city`/`state` (loaded via existing `getMyTenant`).
  - If UF + City available → `searchByAddress({ uf, city, street: term })`.
  - If UF/City missing → render inline message: "Informe a cidade e UF para buscar bairros e endereços pelo ViaCEP." and disable the search call.
- Rank results: exact bairro match → partial bairro → exact logradouro → partial logradouro. Limit to 10.
- Result card: `[Bairro|"Bairro não informado"] — [Logradouro] — [Cidade/UF] — [CEP]`.
- States: loading, empty ("Nenhum resultado encontrado no ViaCEP. Você pode preencher os dados manualmente."), error ("Não foi possível consultar o ViaCEP agora. Preencha manualmente ou tente novamente.").
- On select → fill Bairro, Cidade, UF, CEP inicial, CEP final (same CEP for both); show inline helper about ranges.

Fallback to local `cep_ranges`:
- When ViaCEP returns `empty` or `error`, call existing `searchCepRanges` and render those results under a "Base local" badge. Selecting a local result fills the CEP range it carries (which can be a real range) plus city/uf/neighborhood.

### 3. State + persistence
Extend the modal's `Editing` type with `city` and `uf`. Persist by adding optional `city`/`uf` to `upsertDeliveryZone` input and to the `delivery_zones` table.

Backend changes (single migration):
- `ALTER TABLE public.delivery_zones ADD COLUMN city text, ADD COLUMN uf text` (nullable; no GRANT changes needed — table already exists with grants/RLS).
- Update `src/lib/delivery-zones.functions.ts` (`UpsertInput`, `DeliveryZoneRow`, payload, `listPublicDeliveryZones` select) to include `city` and `uf`. No checkout-resolver logic change — it still matches by CEP/name.

Optional `source`/`source_cep`/`source_street` columns from the spec are **not** added in this pass to keep the migration minimal; can be a follow-up.

### 4. Validation (client-side, before save)
- Bairro required.
- Taxa ≥ 0 (existing).
- CEPs: 8 digits each when present; `cep_start ≤ cep_end` (existing).
- UF: exactly 2 letters (uppercased) when filled.
- City: ≥ 3 chars when used in ViaCEP search.

### 5. Tenant defaults (small admin nicety)
Existing tenant settings already expose `city`/`state` (see `updateMyTenant`). No new settings UI in this pass; we just consume `tenantData.city` / `tenantData.state` as ViaCEP defaults. If both empty, the search UI prompts the admin to fill UF/City inline in the modal.

## Out of scope
- Checkout calculation changes (CEP→fee logic stays).
- Importing ViaCEP responses into `cep_ranges`.
- New tenant-settings screen for default city/UF (already editable elsewhere).
- `source`/`source_cep`/`source_street` audit columns.

## Files touched
- New: `src/lib/viacep.ts`.
- Edit: `src/routes/admin.taxas-entrega.tsx` (modal + new `ViaCepSearch` component, extended `Editing`).
- Edit: `src/lib/delivery-zones.functions.ts` (add `city`/`uf` to schema, row, selects).
- New migration: add `city`, `uf` columns to `public.delivery_zones`.
