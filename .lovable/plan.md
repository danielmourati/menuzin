
# Plano de implementação

## Tarefa atual

### 1. Borda grátis (refatorar regra existente)

Hoje já existe `free_gift_kind` (`crust|product|null`) + `free_gift_ref_id` em `products`. Vamos generalizar para suportar os 3 modos pedidos.

**Migration**: adicionar coluna `free_crust_mode` em `public.products`:
- `none` → sem borda grátis (padrão)
- `fixed` → borda grátis específica (usa `free_gift_ref_id` apontando para `category_pizza_crusts.id`)
- `customer_choice` → cliente escolhe qualquer borda da categoria, sem custo

A coluna `free_gift_kind='product'` continua funcionando para brinde de bebida.

**Admin (`admin.produtos.tsx`)**: no bloco "Brinde incluso" (apenas quando produto é pizza), substituir o seletor atual por:
- Switch "Borda grátis"
- Quando ligado: radio com 2 opções
  - "Definir borda fixa" → select com as bordas da categoria pizza
  - "Cliente escolhe a borda grátis"
- Bloco separado mantém "Brinde de produto (bebida etc.)" usando `free_gift_kind='product'`

**Storefront (`ProductModal.tsx`)**:
- `fixed`: pré-selecionar a borda, esconder/desabilitar as outras, exibir badge "Borda grátis inclusa: <nome>"
- `customer_choice`: tornar seleção de borda obrigatória, todas listadas com preço R$ 0 e badge "Grátis", validar antes de adicionar ao carrinho
- `none`: comportamento atual (bordas opcionais com preço, se houver)

Aplicar apenas a produtos do tipo pizza. Não quebrar fluxo de adicionais/complementos.

### 2. Categoria especial "Oferta do Dia"

Tratar uma categoria com flag `kind='oferta'` (novo valor) como produto promocional fechado.

**Migration**:
- Permitir `categories.kind = 'oferta'` (extender check/constraint).
- Adicionar colunas em `products` para snapshot da oferta:
  - `offer_original_price numeric` (preço de antes)
  - `offer_fixed_size_id uuid` (FK opcional para `category_pizza_sizes`)
  - `offer_fixed_crust_id uuid` (FK opcional para `category_pizza_crusts`)
  - `offer_included_product_id uuid` (FK opcional para `products` — bebida inclusa)
  - `offer_fixed_flavor_ids uuid[]` (lista de produtos-sabores fixos)
  - `offer_pieces int`, `offer_max_flavors int`

**Admin**:
- Botão "+ Nova categoria especial" em `admin.categorias.tsx` cria categoria `kind='oferta'`.
- Em `admin.produtos.tsx`, quando categoria selecionada é `kind='oferta'`, exibir formulário enxuto:
  - Nome, descrição, imagem, ativo
  - Preço normal + preço com desconto (validação: desconto < normal; % calculada automaticamente e exibida)
  - Tamanho fixo (select), nº de fatias, máx. de sabores
  - Sabores fixos (multi-select dentre os produtos-sabores)
  - Borda inclusa (select de `category_pizza_crusts`)
  - Bebida inclusa (select de produtos)
- Esconder abas/blocos irrelevantes (tamanhos custom, sabores custom, grupos de adicionais) para esse tipo.

**Storefront**:
- `ProductCard` de oferta: preço normal riscado em cinza, preço promo em destaque, badge verde `-NN%`, lista do que está incluso.
- `ProductModal` para oferta: "card fechado" — sem seleção de tamanho/sabor/borda/bebida; só quantidade + observações (se permitido) + botão adicionar.
- Ao adicionar ao carrinho: criar item único com `addons` snapshot listando tamanho, sabores, borda, bebida e nota "Oferta do Dia".
- Garantir que ticket de cozinha, recibo e modal admin de pedido mostrem o snapshot completo.

### 3. Compatibilidade
- Não mexer em fluxo de carrinho/checkout/impressão além de garantir que o snapshot da oferta apareça.
- Manter pizzas normais inalteradas.
- Todos os campos novos escopados por tenant via `products.tenant_id` existente.

## Próxima tarefa (escopo separado, mesma entrega)

### 4. Tipo de negócio no super-admin

**Migration**: adicionar `tenants.business_types text[]` (array de slugs).

**UI** (`platform.tenants.novo.tsx` + edição):
- Seção "Tipo de negócio" com checkboxes multi-select:
  pizzaria, hamburgueria, churrascaria, espetaria, restaurante, acaiteria, sorveteria, cafeteria, padaria, lanchonete, marmitaria, sushi, pastelaria, food_truck, bar, conveniencia, outros
- Salvar no tenant.

**Seed inteligente de categorias** após criar tenant:
- pizzaria → "Pizza" (kind=pizza)
- hamburgueria → "Hambúrgueres", "Combos", "Bebidas"
- churrascaria/espetaria → "Espetos", "Porções", "Bebidas", "Combos"
- Pular categorias já existentes (match por nome case-insensitive).
- Tela de revisão pós-criação listando as sugeridas com toggle antes de inserir.

### 5. Home page

**Cards demo (`src/routes/index.tsx`)**: substituir `demoProducts` por foco em burgers/combos:
- Burger Artesanal, Combo Smash, Burger Bacon, Combo Família, Batata + Refri.
- Gerar 5 imagens via imagegen (jpg, realistas, comerciais). Remover imports de pizza/açaí se não usados em outro lugar.
- Manter estrutura do card (imagem, nome, descrição, preço, CTA).

**Card "demo store"**: substituir mockup atual por imagem gerada de mulher branca segurando smartphone com a tela do cardápio Menuzin. Gerar via imagegen em `src/assets/landing-hero-phone.jpg`, importar e renderizar no lugar do mockup atual.

Sem menções a "MVP", manter branding "Menuzin", design responsivo.

## Arquivos afetados (principais)

- Migrations Supabase (3 novas: free_crust_mode, oferta colums, business_types)
- `src/lib/db-types.ts`, `src/lib/domain-types.ts`, `src/lib/db-adapters.ts`
- `src/lib/catalog-admin.functions.ts`, `src/lib/catalog.functions.ts`
- `src/routes/admin.produtos.tsx`, `src/routes/admin.categorias.tsx`
- `src/components/storefront/ProductModal.tsx`, `ProductCard.tsx`, `$slug.tsx`
- `src/routes/platform.tenants.novo.tsx` (+ edição de tenant)
- `src/routes/index.tsx` + novos assets de imagem

## Perguntas antes de implementar

1. **Brinde de produto vs borda grátis**: hoje o admin escolhe `crust` OU `product` (excludente). Quer manter excludente, ou permitir os dois ao mesmo tempo (ex.: pizza com borda Catupiry grátis + 1 refri grátis)?
2. **Oferta do Dia — sabores fixos**: os sabores devem ser apenas exibidos como descrição (texto livre) ou precisam ser produtos-sabor reais existentes na categoria pizza do tenant (FK)? FK é mais rastreável mas exige cadastro prévio dos sabores.
3. **Seed de categorias por tipo de negócio**: criar automaticamente ao salvar o tenant, ou só sugerir numa tela de revisão com checkboxes (admin marca quais quer inserir)?
