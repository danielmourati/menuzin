## Objetivo
1. Preço fracionado por sabor em pizzas multi-sabor: o admin digita o preço cheio e o sistema gera valores editáveis para 1/2, 1/3, 1/4. No pedido, o total é a soma das frações escolhidas.
2. Garantir que novos tenants criados pelo super-admin sejam zerados por padrão — sem herdar dados de tenants modelo (burgerprime/vilaboemia).

---

## Parte 1 — Preço fracionado de pizzas

### Schema (migration)
- `category_pizza_sizes`: adicionar `price_rule TEXT NOT NULL DEFAULT 'sum_fractions'` com check em (`sum_fractions`, `max_value`, `fixed`). `max_flavors` já existe (1..4) e atua como “permite fracionamento” (1 = não permite).
- `product_sizes`: adicionar `fraction_prices JSONB` no formato `{"1": 60.00, "2": 30.00, "3": 20.00, "4": 15.00}`. Mantém `price` (compat = preço cheio = `fraction_prices."1"`).
- Backfill: para linhas existentes, gerar `fraction_prices = {"1": price}` (sem partes fracionadas até o admin editar).

### Server fns (`src/lib/catalog-admin.functions.ts`)
- `saveProductSize`: passar a aceitar `fraction_prices` (Zod `record(z.string(), z.number())`). Validar contra `max_flavors` da categoria pizza correspondente.
- `saveCategoryPizzaSize`: aceitar `price_rule`.
- `listCategoryPizzaConfig`: já retorna `category_pizza_sizes`; expor o novo `price_rule`.

### Tipos
- `DbProductSize`/`ProductSize`: adicionar `fractionPrices?: Record<string, number>`.
- `db-adapters.ts`: mapear o campo.

### UI Admin (`PriceCell` em `src/routes/admin.produtos.tsx`)
Substituir o input único por um bloco quando a categoria pizza permite fracionamento (`size.max_flavors > 1`):
- Input principal (preço cheio).
- Inputs editáveis automaticamente preenchidos: 1/2, 1/3, 1/4 (apenas até `max_flavors`).
- Ao digitar o valor cheio, recalcula apenas as frações que o admin ainda não tocou (dirty flag por campo).
- Botão "Recalcular valores" restaura cálculo automático para todos os campos.
- Máscara `CurrencyInput` já existente.
- Persiste `fraction_prices` (debounce/onBlur) via `saveProductSize`.

### UI Admin (config da categoria — `PizzaCategoryConfigDialog.tsx`)
Adicionar select "Regra de preço" por tamanho (default Somar frações). Hoje só temos `max_flavors`; manter como controle de fracionamento.

### Cálculo no pedido (`src/components/storefront/ProductModal.tsx`)
Trocar a regra atual `Math.max(...)` por:
```
const k = selectedPizzaFlavors.length   // 1..max_flavors
total = sum( fractionPriceOf(flavor, selectedSize, k) )
fractionPriceOf = pricesByCategorySizeId[size.id].fraction_prices[k] ?? price/k
```
- `PizzaFlavorOption`: passar `fractionPricesByCategorySizeId` além de `pricesByCategorySizeId` (extraído em `$slug.tsx` na montagem dos dados de pizza).
- Remover `priceLocked` (preço passa a refletir frações reais).
- Quando `max_flavors === 1` ou só 1 sabor selecionado, usar valor cheio (compat).

### Exibição
- Carrinho/checkout/admin/PrintableOrder/kitchen-ticket: o snapshot já lista cada sabor como linha de addon ("Sabor: X"). Acrescentar valor fracionário no rótulo do sabor (`Sabor: Calabresa — 1/2 R$ 30,00`) construído no `ProductModal` ao montar `addons`.

---

## Parte 2 — Tenant novo sempre zerado

### Problema atual (`src/lib/platform.functions.ts`)
- `adminCreateTenant` chama incondicionalmente `applyTenantTemplate(tenant.id)` (`tenant-template.server.ts`), que copia `addon_groups`, `categories`, `printer_settings`, `store_payment_settings` e campos de operação a partir de `burgerprime` / `vilaboemia`. É a fonte de vazamento.
- Também roda `seedCategoriesForBusinessTypes` quando há `business_types`.

### Mudanças
- `CreateTenantInput`: adicionar 3 flags opcionais (default `false`) — `seed_business_categories`, `seed_demo_data`, `clone_from_slug` (já existe).
- Por padrão (nenhuma flag ligada): criar tenant com **apenas** a linha em `tenants`, owner em `user_roles`/`profiles`, e um `store_payment_settings` mínimo + `printer_settings` zerado (sem copiar de template).
- `applyTenantTemplate`: chamar somente quando `seed_demo_data === true`. Caso contrário, executar apenas a parte "defaults seguros" (criar registros vazios das duas tabelas de configuração obrigatórias) — extrair em helper `ensureBaselineSettings(tenantId)`.
- `seedCategoriesForBusinessTypes`: só executar se `seed_business_categories === true`.
- `cloneCatalog`: já é opt-in via `clone_from_slug`, manter.
- Tela `/platform/tenants/novo`: adicionar dois checkboxes ("Criar categorias padrão pelo tipo de negócio", "Copiar dados demo do template") — ambos desmarcados por padrão; remover qualquer comportamento implícito.

### Auditoria de isolamento
- Conferir nas server fns de catálogo/pedidos/cupons/zonas que toda query tem `.eq("tenant_id", ...)`. Como `current_tenant_id()` é usado em RLS, o risco real está nos paths admin que usam `supabaseAdmin`. Verificar:
  - `cloneCatalog` (já filtra por `fromTenantId`).
  - `applyTenantTemplate` (mantida apenas em opt-in).
- Adicionar testes de fumaça em `scripts/` que: cria tenant via `adminCreateTenant` mock, confere contagem 0 em `categories`, `products`, `addon_groups`, `coupons`, `delivery_zones`, `tenant_printers`, `orders`.

---

## Testes
- `scripts/pizza-fraction-pricing-tests.mjs`: validar `fraction_prices` (recalcular, dirty flag, soma no pedido — cenários 1/2/3/4 sabores).
- `scripts/tenant-isolation-tests.mjs`: criar tenant default → assert vazio; criar com `seed_business_categories` → assert apenas categorias da matriz; criar com `seed_demo_data` → assert template aplicado.

### Resumo técnico
- Migration: `+ category_pizza_sizes.price_rule`, `+ product_sizes.fraction_prices`, backfill simples.
- 4 arquivos editados em `src/lib` (catalog-admin, db-types, db-adapters, platform).
- 3 arquivos UI: `admin.produtos.tsx` (PriceCell), `PizzaCategoryConfigDialog.tsx`, `platform.tenants.novo.tsx`, `ProductModal.tsx`.
- Sem alteração em pagamentos ou rotas públicas.