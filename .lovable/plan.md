# Otimizar visualização dos produtos no menu público

## Objetivo
Hoje o menu mostra 1 card por linha no mobile, ocupando muito espaço vertical. Mudar para **grid de 2 colunas no mobile** (e 3 no desktop), mantendo o visual moderno com imagem edge-to-edge.

## Mudanças

### 1. `src/routes/$slug.tsx`
- Linha 230: trocar `grid gap-3 md:grid-cols-2` por `grid grid-cols-2 gap-3 md:grid-cols-3`.
- Resultado: 2 cards lado a lado no mobile, 3 no desktop.

### 2. `src/components/storefront/ProductCard.tsx`
Ajustar densidade para caber bem em meia largura de tela:
- Imagem: manter `aspect-[4/3]` e `object-cover` (edge-to-edge).
- Texto: reduzir paddings (`p-2.5` em vez de `p-3`), título `text-sm`, descrição `text-xs line-clamp-2`, preço `text-sm font-bold`.
- Botão "+": reduzir para `h-8 w-8` e reposicionar (`bottom-2 right-2`); área de texto com `pr-10`.
- Badge "Destaque": fonte/padding levemente menor para não invadir a imagem em telas estreitas.

### 3. `FeaturedScroller` (sem mudança)
O scroller horizontal de Destaques continua igual — serve como "hero" e não conflita com o grid 2-col abaixo.

### 4. Modal e lógica de carrinho
Sem alterações. Mudança puramente visual no grid e densidade do card.

## Critérios de aceite
- No mobile (≤640px) aparecem 2 cards por linha, encaixados sem corte.
- No desktop aparecem 3 colunas.
- Imagem continua edge-to-edge, nome/descrição/preço legíveis, botão "+" acessível.
- Featured scroller, busca, categorias e modal permanecem iguais.
