## 1. Erro `Cannot read properties of undefined (reading 'filter')`

Reproduzir clicando em `Ver todos` no `/burgerprime` (é a única mudança recente que usa `viewAllTo`/`Link` dinâmico) e capturar stack real. Suspeita mais provável: `FeaturedScroller` passa `viewAllTo` como string genérica para `<Link to={viewAllTo as never} params={...}>`, o TanStack Router tenta resolver a rota tipada durante o preload e chama `.filter` em uma coleção interna que fica `undefined` quando o `to` não é literal.

Correção: trocar por `Link` tipado dedicado ou por `<a href={viewAllTo}>`. Vou usar `<Link>` com `to` literal condicional: o scroller receberá `viewAllHref: string` (URL já pronta, ex.: `/burgerprime/destaques`) e renderizará `<Link to={viewAllHref}>` sem `params`. O `$slug.tsx` monta a URL com o slug. Se o erro persistir, faço fallback para `<a href>` simples.

## 2. Anexo 1 — faixa laranja sobrepondo descrição no drawer "Sobre a loja"

Em `StoreAboutDrawer.tsx`, o hero tem `pb-14` e o card de chips usa `-mt-6`, criando uma sobreposição visual. Ajustar:

- Hero: reduzir `pb-14` → `pb-8`.
- Card de chips: remover o `-mt-6` (deixar fluxo normal) e adicionar `mt-4`.
- Garantir que a descrição (`tenant.description`) fique claramente abaixo, com espaçamento `mt-2` do bloco de chips.

## 3. Anexo 2 — reorganização do header mobile

Em `src/routes/$slug.tsx` (bloco `md:hidden`):

**3.1** Mover o botão hambúrguer e a lupa para uma **linha separada acima** do card do tenant:
```
[☰]                              [🔍]
[ card do tenant (linha única) ]
```
- Nova `div` com `flex items-center justify-between mb-3` contendo apenas menu (esq.) e lupa (dir.).
- Card do tenant ocupa 100% da largura em outra `div`.

**3.2** Trazer as informações básicas (Entrega / Prep / Mínimo) **para dentro do card**, empilhadas verticalmente para deixar o card mais alto:

```
┌───────────────────────────────────────┐
│ [logo]  Burger Prime              [›] │
│         ● Aberta                       │
│ ─────────────────────────────────────  │
│ 🛵 Entrega R$ 8~12   ⏱ 35 a 45 min    │
│ 💰 Mín. R$ 20,00                       │
└───────────────────────────────────────┘
```

Remover a linha de chips separada que existe hoje abaixo do card.

**3.3** "Entrega R$ 8~12" (valor mínimo e máximo):

- Criar `getDeliveryFeeRange` em `src/lib/delivery-zones.functions.ts` (server fn público, method GET). Recebe `slug`, retorna `{ min: number; max: number; mode }`:
  - `delivery_mode = 'none'` → `min=max=0`.
  - `delivery_mode = 'single'` → `min=max=tenants.delivery_fee`.
  - `delivery_mode = 'neighborhood'` → `min = MIN(fee)`, `max = MAX(fee)` de `delivery_zones` ativas (fallback `tenants.delivery_fee`).
- Hook `useQuery` no `StorePage` para buscar o range e formatar:
  - Se `min === max` → `Entrega R$ 8,00`.
  - Caso contrário → `Entrega R$ 8 ~ R$ 12` (usar `brl` sem centavos quando forem redondos, ou `brl(min) ~ brl(max)`).

## 4. Anexo 3 — ícone `X` duplicado

Em `StoreAboutDrawer.tsx` renderizamos um botão `X` customizado no canto, mas o `SheetContent` do shadcn já injeta um `SheetClose` com `X`. Remover o botão custom (`<button ... aria-label="Fechar">`) — manter o padrão do Sheet. Estilizar o close default via `className` do `SheetContent` se precisar mudar posição/cor.

Verificar também `StoreSideMenu.tsx`: hoje tem `<button>` custom com `X` no cabeçalho — remover pelo mesmo motivo (Sheet já tem close nativo).

## Arquivos alterados

- `src/lib/delivery-zones.functions.ts` — adicionar `getDeliveryFeeRange`.
- `src/components/storefront/FeaturedScroller.tsx` — mudar prop `viewAllTo`/`viewAllParams` para `viewAllHref: string`.
- `src/routes/$slug.tsx` — reorganizar header mobile (linha separada de ícones + card com info interna), consumir `getDeliveryFeeRange`, passar `viewAllHref` já com slug interpolado.
- `src/components/storefront/StoreAboutDrawer.tsx` — reduzir sobreposição do hero, remover botão `X` custom.
- `src/components/storefront/StoreSideMenu.tsx` — remover botão `X` custom.

## Fora do escopo

- Layout desktop (mantido como está).
- Mudanças em `getCatalog` ou schema.
- Aplicar cupom, mudar comportamento de busca desktop.
