## Objetivo
No cadastro de produto em categoria pizza (`/admin/produtos`), exigir que o admin defina explicitamente, via toggle obrigatório, se o item será listado como **sabor selecionável** na montagem da pizza no lado do cliente (suportando fracionamento). Sem essa decisão, o produto não pode ser salvo.

## Comportamento

- Todo produto cuja categoria tem `kind = "pizza"` ganha o campo **"Listar como sabor na montagem da pizza"** (Switch + descrição curta).
- O toggle é **obrigatório**: ao criar um novo sabor, o estado inicial é `null` (indefinido) e o botão Salvar fica desabilitado até o admin escolher Sim/Não. Mensagem inline: "Defina se este item entra na montagem de pizzas".
- Quando **Sim**: o produto aparece na lista de sabores no `ProductModal` (storefront), respeitando regras de fracionamento já existentes (`fraction_prices`, `max_flavors`, `price_rule`).
- Quando **Não**: o produto continua existindo na categoria pizza (para venda direta / cardápio), mas **não** é oferecido como opção fracionável na montagem.
- Produtos fora de categoria pizza ignoram o campo (não aparece no formulário).

## Mudanças

### Migration
- `products`: adicionar coluna `listed_as_flavor BOOLEAN` (nullable; sem default, para distinguir "não definido" em legados).
- Backfill: para produtos existentes em categorias pizza, setar `listed_as_flavor = true` (mantém comportamento atual). Demais ficam `NULL`.

### Backend (`src/lib/catalog-admin.functions.ts`)
- `saveProduct`: aceitar `listed_as_flavor` (boolean opcional). Validar: se a categoria do produto é `kind = pizza`, o campo é obrigatório (`z.boolean()`); caso contrário, ignora.

### Tipos
- `DbProduct.listed_as_flavor?: boolean | null` em `src/lib/db-types.ts`.
- `Product.listedAsFlavor?: boolean | null` em `src/lib/domain-types.ts`.
- `dbProductToUi` em `src/lib/db-adapters.ts` mapeia o campo.

### Admin UI (`src/routes/admin.produtos.tsx`)
- Dentro do form do modal de produto, quando `isPizzaCategory` for true: renderizar bloco com Switch tri-estado (`Sim` / `Não` / não definido).
- Quando estado é `null`, mostrar aviso vermelho e desabilitar Salvar.
- Badge na listagem: produtos pizza com `listed_as_flavor = false` exibem badge "Não listado" para deixar claro.

### Storefront (`src/routes/$slug.tsx`)
- No mapeamento `pizzaFlavors` (linhas 555–567), adicionar filtro `&& p.listedAsFlavor === true`.

## Resumo técnico
- 1 migration (coluna + backfill).
- 4 arquivos de tipos/server: `db-types.ts`, `domain-types.ts`, `db-adapters.ts`, `catalog-admin.functions.ts`.
- 2 arquivos UI: `admin.produtos.tsx` (form + badge), `$slug.tsx` (filtro de sabores).
- Nenhuma mudança em pagamentos, checkout ou fluxo de pedidos.
