# Catálogo avançado — pizza por sabores + grupos de complementos

Implementação em 4 frentes coordenadas, todas usando as tabelas que já existem no banco (`product_sizes`, `product_flavors`, `addon_groups`, `addon_options`, `addon_group_targets`).

## 1. Tipos de domínio (`src/lib/domain-types.ts`)

Adicionar ao `Product`:

```text
type: "standard" | "pizza"
maxFlavors?: number
allowObservations: boolean
sizes?: { id; name; price; sortOrder }[]
flavors?: { id; name; description; priceDelta; available; sortOrder }[]
addonGroups?: {
  id; name; required; minSelect; maxSelect; sortOrder;
  options: { id; name; price; sortOrder }[];
}[]
```

`Category` ganha `addonGroups?` (grupos aplicados via `addon_group_targets`).

## 2. Server functions

### `src/lib/catalog.functions.ts` (público — storefront)
- `getCatalog` passa a carregar em paralelo: `product_sizes`, `product_flavors`, `addon_groups`+`addon_options`+`addon_group_targets`. Resolve grupos por produto (target product_id direto) e por categoria (target category_id → todos produtos da categoria).

### `src/lib/catalog-admin.functions.ts` (admin do tenant)
Novas server fns com `requireSupabaseAuth` + `getAuthorizedTenantId`:
- `saveProductSize` / `deleteProductSize`
- `saveProductFlavor` / `deleteProductFlavor`
- `listAddonGroups` / `saveAddonGroup` / `deleteAddonGroup`
- `saveAddonOption` / `deleteAddonOption`
- `setAddonGroupTargets({ groupId, categoryIds[], productIds[] })` — substitui o set

`ProductInput` é ampliado com `type`, `max_flavors`, `allow_observations`.

## 3. UI Admin

### `src/routes/admin.produtos.tsx`
Modal de edição vira `Tabs` quando o produto já existe:
- **Geral**: campos atuais + select `Tipo` (standard / pizza) + `Aceita observação` + `Máx. sabores` (se pizza).
- **Tamanhos**: lista editável (name, price), botão "Adicionar tamanho".
- **Sabores** (só pizza): lista editável (name, description, price_delta, available).
- **Complementos**: lista de grupos aplicados a este produto (toggle simples). Edição completa fica na nova página.

### `src/routes/admin.complementos.tsx` (nova)
Página dedicada de grupos de complementos:
- Lista grupos do tenant com badges (obrigatório, min/max).
- Modal de edição com nome, required, min/max, lista de opções (nome+preço), e seleção de **categorias** e **produtos** alvo.
- Link "Complementos" no `AdminLayout`.

## 4. UI Storefront — `src/components/storefront/ProductModal.tsx`

Reescrever para suportar:
- **Seletor de tamanho** (radio) quando `sizes.length > 0` — define o preço base.
- **Pizza multi-sabor**: checkboxes de sabores até `maxFlavors`. Preço = média dos preços (size + maior price_delta), padrão clássico de pizzarias.
- **Grupos de complementos**: render por grupo respeitando `required`, `minSelect`, `maxSelect`. Radio quando `maxSelect===1`, checkbox caso contrário. Botão "Adicionar" desabilitado até atender obrigatórios.
- **Observações**: só exibe quando `allowObservations` é true.
- Mostra avisos de validação ("Selecione 1 opção", "Faltam X sabores").

`cart-context` recebe `selectedSize?`, `selectedFlavors?[]`, `selectedGroups?` (mantém compatibilidade com `addons` legados — o snapshot já é gravado em `order_items.addons` jsonb).

## 5. Adapters (`src/lib/db-adapters.ts`)

Atualizar `dbProductToDomain` para mapear sizes/flavors/addonGroups vindos do `getCatalog`.

## Fora de escopo nesta entrega
- Editor visual de "metade A / metade B" — usamos a regra "preço = média" que é o padrão de pizzarias e funciona com 1–3 sabores.
- Reordenar drag-and-drop dos itens (mantemos `sort_order` numérico).

## Files

**Novos:** `src/routes/admin.complementos.tsx`

**Editados:** `src/lib/domain-types.ts`, `src/lib/db-adapters.ts`, `src/lib/catalog.functions.ts`, `src/lib/catalog-admin.functions.ts`, `src/components/storefront/ProductModal.tsx`, `src/routes/admin.produtos.tsx`, `src/components/admin/AdminLayout.tsx`, `src/lib/cart-context.tsx`
