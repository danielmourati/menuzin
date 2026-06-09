## Objetivo

Reformular o cadastro de pizzas no padrão iFood mostrado nos prints: **tamanhos, massas e bordas passam a pertencer à categoria do tipo "Pizza"**, e cada produto-pizza vira um **sabor com preço por tamanho** (matriz preço × tamanho), em vez de cada produto manter seus próprios tamanhos.

## Mudanças no banco

1. **`categories`**: adicionar `kind text default 'standard'` (`'standard' | 'pizza'`).
2. **Novas tabelas** ligadas à categoria (RLS + GRANTs por tenant, mesmo padrão das demais):
   - `category_pizza_sizes` — `category_id`, `name`, `pieces` (int), `max_flavors` (1–4), `pdv_code`, `active`, `sort_order`.
   - `category_pizza_doughs` — `category_id`, `name`, `extra_price`, `pdv_code`, `active`, `sort_order`.
   - `category_pizza_crusts` — `category_id`, `name`, `extra_price`, `pdv_code`, `active`, `sort_order`.
3. **`product_sizes`**: adicionar `category_size_id uuid null` para amarrar o preço do sabor ao tamanho da categoria (a coluna `name`/`price` continua existindo para retrocompat com pizzas antigas e produtos `standard` que ainda usam tamanhos próprios).
4. Backfill: para cada categoria existente cuja produtos sejam `type='pizza'`, marcar `kind='pizza'` e migrar tamanhos do produto "mais completo" para `category_pizza_sizes` (best-effort; depois o tenant ajusta).

Sem CHECK constraints com `now()`; valores enum via texto + validação no servidor.

## Backend (`catalog-admin.functions.ts`)

- `saveCategory`: aceitar `kind` no input. Default `'standard'`.
- Novas server functions (mesmo guard `getAuthorizedTenantId`):
  - `listCategoryPizzaConfig({ category_id })` → `{ sizes, doughs, crusts }`.
  - `saveCategoryPizzaSize`, `deleteCategoryPizzaSize`.
  - `saveCategoryPizzaDough`, `deleteCategoryPizzaDough`.
  - `saveCategoryPizzaCrust`, `deleteCategoryPizzaCrust`.
- `saveProduct`: quando a categoria-alvo for `kind='pizza'`, forçar `type='pizza'`; `max_flavors` deixa de ser editável no produto (vem do tamanho).
- `saveProductSize`: passar a aceitar `category_size_id` (opcional). Preço por tamanho do sabor.
- `listMyProducts`: já retorna `sizes`; nada muda.

## UI

### 1. Modal "Nova categoria" (`admin.categorias.tsx`)
- Primeiro passo: card-picker com dois modelos: **Itens principais** (ícone talher) e **Pizza** (ícone pizza), conforme print 1.
- Em seguida, formulário de detalhes (nome + descrição + ativo). Salvo com `kind` correto.

### 2. Página da categoria Pizza
- Quando a categoria for `kind='pizza'`, abrir um drawer/dialog full com abas **Detalhes / Tamanhos / Massas / Bordas** (prints 3–6). Editor inline tipo tabela (linha por item) com botões "+ Adicionar tamanho/massa/borda" e toggle Pausar/Ativado.
- Lista de tamanhos vira também cards "Resumo e status de venda" (print 5).

### 3. Modal de produto (`admin.produtos.tsx`)
- Detectar categoria selecionada. Se `kind='pizza'`:
  - Tabs do produto viram **Detalhes / Preço / Classificação** (sem aba "Tamanhos" do produto; sem aba "Sabores" — cada produto **é** um sabor).
  - **Detalhes**: nome (rótulo "Sabor"), descrição, imagem, PDV.
  - **Preço**: lista os tamanhos cadastrados na categoria com checkbox para habilitar + input de preço por tamanho (print 8). Persiste em `product_sizes` com `category_size_id`.
  - **Classificação**: featured, allow_observations, prep_time, disponível.
  - Esconde `type`/`max_flavors` (derivados).
- Para categoria `standard`, manter o fluxo atual (tabs Geral/Tamanhos, sem aba Sabores — o tipo "pizza" antigo deixa de aparecer no seletor).

### 4. Storefront (`ProductModal`)
- Para pizza, montar a seleção a partir de:
  - Tamanhos da categoria (filtrando só os que esse sabor tem preço habilitado).
  - Sabores = outros produtos da mesma categoria com preço habilitado no mesmo tamanho (modal vira "monte sua pizza" partindo do sabor clicado). Limite de sabores = `category_pizza_sizes.max_flavors` do tamanho escolhido (média de preços, padrão já implementado).
  - Massas (radio, obrigatório) e Bordas (radio opcional) somam `extra_price` ao item.
- Cart/checkout: salvar massa/borda escolhidas no campo `addons` do `order_items` (snapshot já suportado).

### 5. Ajustes visuais
- Botões primários "Próximo/Salvar" no canto inferior direito, "Cancelar" outline ao lado, conforme prints — aplicar nos diálogos novos.
- Linha-item editável com ícone drag + lixeira (print 3/4/6).

## Fora de escopo

- Importação automática "Recomendações" (cards laterais nos prints).
- Cód. PDV integrado a sistemas externos — campo é só armazenado.
- Combos/descontos % no produto (print 10) — não solicitado nesta refatoração.

## Ordem de execução

1. Migration (categorias `kind` + 3 tabelas pizza + coluna em `product_sizes`).
2. Tipos + server functions.
3. UI de categoria (picker + abas pizza).
4. UI de produto pizza (preço por tamanho).
5. Adaptar `ProductModal` storefront.
6. Smoke test manual: criar categoria pizza → 3 tamanhos / 2 massas / 2 bordas → 2 sabores com preços → pedido no storefront com 2 sabores + borda recheada.
