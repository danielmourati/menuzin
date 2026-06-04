## Goal
Make the "Novo bairro" autocomplete prioritize **neighborhood** matches, while still supporting city/UF/CEP. Selecting a result autofills Bairro + CEP range.

## 1. Database — add `neighborhood` to `cep_ranges`

Migration:
- `ALTER TABLE public.cep_ranges ADD COLUMN neighborhood text NULL;`
- Index: `CREATE INDEX cep_ranges_neighborhood_lower_idx ON public.cep_ranges (lower(neighborhood));`
- No data backfill — existing ~5.7k rows stay `neighborhood = null` (city-level ranges).
- Future imports with neighborhood data populate the column; logic auto-prefers non-null rows.

No tenant-table changes. The existing `delivery_zones` already stores `neighborhood`, `cep_start`, `cep_end`, `fee`, `min_order_total`, `estimated_minutes`, `active`. (City/UF are not persisted today — out of scope unless requested; selection just fills the form fields the table supports.)

## 2. Server — rewrite `searchCepRanges` (`src/lib/cep-ranges.functions.ts`)

Input: `{ q: string }`. Normalize (lowercase, strip accents, trim).

Run up to 4 small queries in parallel (each limit ~15) and merge by rank:

1. **Neighborhood exact** — `neighborhood ilike q` (accent-insensitive narrow in JS).
2. **Neighborhood partial** — `neighborhood ilike %q%` (excluding rank-1 ids).
3. **City exact / partial** — `city ilike` matches.
4. **CEP** — when `q` has ≥5 digits: zero-pad to 8, `cep_start <= padded <= cep_end`.

Optional 2-letter UF token detection (start or end of query) filters all of the above with `eq('uf', UF)`.

Return shape (extend `CepRangeResult`):
```ts
{ id, uf, city, neighborhood: string | null, cep_start, cep_end, rank: 1|2|3|4|5 }
```
Dedupe by `id`, sort by `rank` then `city`, cap at 20.

## 3. UI — `src/routes/admin.taxas-entrega.tsx`

**Label/placeholder:**
- Label: `Buscar bairro, cidade ou CEP`
- Placeholder: `Digite o bairro, cidade ou CEP`

**Result rendering** in `CepRangeSearch`:
- Neighborhood row → `**{neighborhood}** — {city}/{uf} — {cep_start} até {cep_end}`
- City row → `**{city}/{uf}** — Faixa geral da cidade — {cep_start} até {cep_end}`

**onSelect:**
- Always fill `cep_start` / `cep_end` via `maskCep`.
- If `r.neighborhood` is non-null AND current `editing.neighborhood` is empty → also fill `neighborhood`. (Never overwrite a value the admin already typed.)

**Helper text after selection:**
- Neighborhood selected: `Bairro {neighborhood} aplicado. Você pode ajustar os CEPs abaixo.`
- City-only selected: `Faixa de {city}/{uf} aplicada. Informe o nome do bairro ou área de entrega.`

**Empty state:** `Nenhum bairro encontrado. Você pode preencher os dados manualmente.`

Bairro field stays required; manual entry of all fields remains fully supported.

## 4. Checkout
No changes. `resolveDeliveryFee` already does CEP-range match + bairro fallback and never uses a hardcoded fee.

## Files touched
- `supabase/migrations/<new>.sql` — add `neighborhood` column + index
- `src/lib/cep-ranges.functions.ts` — multi-query ranked search, return `neighborhood` + `rank`
- `src/routes/admin.taxas-entrega.tsx` — label, placeholder, result rendering, autofill rules, helper messages, empty state

## Out of scope (flag for follow-up)
- Importing a neighborhood-level CSV (current `ceps.csv` has none). The schema is ready; once you provide neighborhood data, it'll surface automatically.
- Persisting `city`/`uf` on `delivery_zones` (would require a separate migration + UI fields).