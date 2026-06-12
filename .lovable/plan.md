# Melhorias para /vilaboemia (reutilizáveis por todos os tenants)

A maior parte da infraestrutura já existe — vou reaproveitar `addon_groups` (`kind='observacao'`), `addon_options` e `addon_group_targets` em vez de criar tabelas novas. As mudanças se dividem em 4 frentes.

## 1) Subcategorias de observação (admin)

A tabela `addon_groups` já tem `name`, `required`, `min_select`, `max_select`, `active`, `sort_order`, `kind`. Falta apenas um campo de instrução para o cliente.

**Migration:** adicionar `description text` em `addon_groups` (opcional, default `''`).

**UI em `/admin/adicionais`** (tab Observações) — hoje cada item é uma opção solta. Vou trocar por **gestão de grupos** quando `kind='observacao'`:
- Listar grupos com nome, descrição, obrigatório/min/max, alvos (categorias/produtos) e contagem de opções.
- Dialog do grupo: nome, descrição, obrigatório (switch), min/max, alvos (multi-select de categorias e/ou produtos), ativo.
- Dentro do grupo: lista de opções com nome, ativo, ordem, editar/excluir/reordenar.
- A tab "Adicionais" continua igual (já funciona por grupo via `kind='adicional'`).

Exemplos atendidos:
- Grupo "Escolha o arroz" → required, min=1, max=1, alvo categoria "Espeto Completo", opções Arroz branco / Baião / Grega.
- Grupo "Ponto da carne" → required, min=1, max=1, alvo categoria "Espetos", opções Mal / Ao ponto / Bem.

Server fns novos em `catalog-admin.functions.ts`: `listObservationGroups`, `saveObservationGroup`, `deleteObservationGroup`, `saveObservationOption`, `deleteObservationOption`, `reorderObservationOptions`.

## 2) Fluxo sequencial no cliente (ProductModal)

Hoje `ProductModal.tsx` renderiza todas as observações como uma única lista achatada de checkboxes, ignorando nome do grupo, descrição, required e min/max.

Mudanças:
- Renderizar **uma seção por grupo de observação**, ordenadas por `sort_order`, com título = `group.name` e subtítulo = `group.description` + chip "Obrigatório" e "Escolha N".
- Radio quando `max_select === 1`, checkbox quando > 1.
- Validação já existe em `validateSelection` (em `product-selection.ts`) — observation groups já são tratados igual aos adicionais. Mensagens de erro já saem como `${group.name}: selecione N`. Vou só ajustar o texto para ficar amigável ("Escolha o ponto da carne", etc.) usando o próprio nome do grupo.
- Botão "Adicionar ao carrinho" continua bloqueado até validations limparem (`canAdd`).

As opções selecionadas já se propagam para carrinho/checkout/pedido/recibo/comanda via `extras` salvos como `${group.name}: ${option.name}` — nada a mudar nessa parte.

## 3) Upsell de bebidas no checkout

Hoje `UpsellSuggestions` aparece **dentro do `CartDrawer`** (sacola). O pedido é levar também ao **checkout**.

- Reaproveitar o componente `UpsellSuggestions` (já detecta categorias `bebida/refri/suco/cerveja/drink/água`, oculta se já houver bebida no carrinho, e adiciona sem sair da tela).
- Inserir o bloco no topo do checkout em `src/routes/loja.$slug.tsx` (página de checkout), acima do resumo, com a copy "🥤 Que tal adicionar uma bebida ao seu pedido?".

## 4) Checkbox "Mais vendido" + badge

**Migration:** adicionar `bestseller boolean not null default false` em `products`.

**Admin (`/admin/produtos`)** — nos dois dialogs de edição (criar/editar), adicionar `Switch` "Mais vendido" abaixo de "Em destaque". Persistir em `saveProduct`.

**Domain types / db-adapters:** mapear `bestseller` → `Product.bestseller`.

**Storefront (`ProductCard.tsx`)** — exibir badge "🔥 Mais vendido" (cor `bg-accent`/`text-accent-foreground`) ao lado/sobre o badge "Destaque" existente, sem sobrepor preço/nome. Mesmo tratamento responsivo (mobile/desktop).

## Compatibilidade / escopo
- Todas as mudanças são **multi-tenant** (filtros já por `tenant_id`); nada hard-codado para vila-boemia.
- Produtos existentes sem grupo de observação continuam funcionando (a seção só aparece se houver grupos ativos com opções ativas).
- Não mexo em fluxo de checkout/criação de pedido — apenas adiciono o upsell na página.
- O dado já flui para recibo/comanda (`receipt-builder.ts` / `kitchen-ticket.ts` iteram sobre `item.addons`).

## Detalhes técnicos (rápido)

```text
DB:
  ALTER TABLE addon_groups ADD COLUMN description text NOT NULL DEFAULT '';
  ALTER TABLE products     ADD COLUMN bestseller  boolean NOT NULL DEFAULT false;

Arquivos editados:
  src/lib/catalog-admin.functions.ts   (CRUDs de grupo/opção de observação)
  src/routes/admin.adicionais.tsx      (UI por grupo na tab Observações)
  src/routes/admin.produtos.tsx        (Switch "Mais vendido")
  src/lib/domain-types.ts              (+ bestseller, + group.description)
  src/lib/db-adapters.ts               (mapeamento)
  src/components/storefront/ProductModal.tsx     (render por grupo + radio/checkbox + descrição + chips)
  src/components/storefront/ProductCard.tsx      (badge "Mais vendido")
  src/components/storefront/UpsellSuggestions.tsx (reuso)
  src/routes/loja.$slug.tsx            (inserir upsell no checkout)
```

Posso seguir?
