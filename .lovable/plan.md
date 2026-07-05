# Melhorias mobile no storefront

Escopo: mudanças de UI apenas no modo mobile (`md:` mantém o layout atual do desktop). Sem alterações de banco.

## 1. Card compacto do tenant (anexo 1)

No mobile, substituir o header atual em `src/routes/$slug.tsx` por um card no estilo do anexo:

```
[logo redondo] [Nome + status • aberto/fechado]         [›]
[🛵 Entrega R$…] [⏱ 20-70min] [💰 Mín R$…]
```

- Logo circular à esquerda (`h-14 w-14 rounded-full`).
- Título com nome e, abaixo, linha de status colorida (verde/vermelho + label "Aberta" / "Fechada — Agendar pedido").
- Chevron `›` à direita indicando que é clicável.
- Chips com `Entrega`, `Prep time` e `Mín. pedido` numa linha rolável (`overflow-x-auto`).
- Card inteiro `<button>` que abre o drawer "Sobre a loja" (item 5).
- No desktop (`md:`) mantém o layout completo atual.

## 2. Lupa de busca (mobile)

No mobile, o input de busca vira um botão-lupa no canto (top-right, ao lado ou dentro do header). Ao tocar:

- Expande um input full-width abaixo do header com autofocus e um `×` para fechar.
- Estado `searchOpen` local em `StorePage`.
- Desktop continua com o input visível como hoje.

## 3. Menu lateral (anexo 2)

Novo componente `src/components/storefront/StoreSideMenu.tsx` — `Sheet` shadcn com `side="left"`:

- Cabeçalho: logo da loja + nome do tenant.
- Itens:
  - **Entrar** → `/admin/login` (ícone `LogIn`).
  - **Cardápio** → fecha o menu e volta ao topo.
  - **Cupons e Promoções** → nova rota (item 3.1).
  - **Sobre Nós** → abre o drawer "Sobre a loja" (item 5).
- Rodapé: "Desenvolvido por Menuzin" com o logo.
- Botão-hambúrguer (`Menu`) no header do storefront (mobile), à esquerda da logo.

### 3.1 Rota `/$slug/cupons`

Página pública que lista cupons ativos do tenant com código, descrição, desconto e validade. Reusa `listCoupons` (server fn nova ou já existente para o público — vou criar `listPublicCoupons` em `src/lib/coupons.functions.ts` filtrando por tenant slug + `active=true` + validade).

## 4. Página "Ver todos" nos destaques (anexo 3)

- `FeaturedScroller` ganha prop opcional `viewAllTo?: string`. Quando presente, renderiza link "Ver todos ›" no cabeçalho.
- Nova rota `src/routes/$slug.destaques.tsx` renderizando um grid completo dos produtos com `featured=true` (fetch via `catalogQueryOptions` do slug).
- Nova rota `src/routes/$slug.promocoes.tsx` idem para categoria "Promoções/Ofertas".
- No storefront, os dois `FeaturedScroller`s recebem `viewAllTo` apontando para essas rotas.

## 5. Drawer "Sobre a loja" (anexo 4)

Novo componente `src/components/storefront/StoreAboutDrawer.tsx` — `Sheet side="bottom"` no mobile / `side="right"` no desktop:

- Hero: banner colorido com logo e nome do tenant.
- Chips: entrega, prep time, pedido mínimo.
- **Opções de entrega**: 3 cards (Delivery / Retirada / Consumo Local) marcados conforme `acceptsDelivery`, `acceptsTakeout`, `acceptsDinein`.
- **Horário de funcionamento**: badge Aberta/Fechada + tabela dos 7 dias a partir de `hoursSchedule`.
- **Formas de pagamento**: fetch de `getPublicPaymentSettingsBySlug` (já existe) e listagem em pills: Dinheiro, Cartão de Crédito, Cartão de Débito, PIX, Transferência (mostra apenas os habilitados).
- Aberto pelo card do item 1 e pelo item "Sobre Nós" do menu lateral.

## Arquivos que serão criados/alterados

Novos:

- `src/components/storefront/StoreSideMenu.tsx`
- `src/components/storefront/StoreAboutDrawer.tsx`
- `src/routes/$slug.destaques.tsx`
- `src/routes/$slug.promocoes.tsx`
- `src/routes/$slug.cupons.tsx`

Alterados:

- `src/routes/$slug.tsx` — novo header mobile, botão-lupa, botão-menu, integração dos drawers e passagem de `viewAllTo` para os scrollers.
- `src/components/storefront/FeaturedScroller.tsx` — prop `viewAllTo`.
- `src/lib/coupons.functions.ts` — nova `listPublicCoupons` (público, filtra por slug + ativos + validade).

## Fora do escopo

- CNPJ/Razão social no drawer (não existem no schema `tenants`).
- Mudanças no layout desktop (só mobile).
- Aplicar cupom na página de cupons — apenas listagem/cópia do código.