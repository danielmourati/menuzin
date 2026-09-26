# Fontes maiores nos cards de produto da loja

Aumentar em cerca de 20-25% todos os textos dos cards de produto, mantendo a proporção entre nome, descrição e preço. Vale para todas as lojas.

## O que muda
- **Nome do produto**: um pouco maior e mais destacado.
- **Descrição**: maior e mais legível.
- **"A partir de"**: sai do tamanho muito pequeno atual para um tamanho legível.
- **Preço** (normal, promocional e riscado): maiores na mesma proporção.
- Botão "+" levemente maior para acompanhar.

## Onde
- Cards em lista (como no print) e em grade do cardápio da loja.
- Carrossel de destaques/mais vendidos.
- Páginas "Mais vendidos" e "Promoções" (usam o mesmo card).

## Detalhes técnicos
- `ProductCard.tsx` (lista): nome `text-sm sm:text-base` -> `text-base sm:text-lg`; descrição `text-xs` -> `text-sm`; "A partir de" `text-[10px]` -> `text-xs`; preço `text-sm` -> `text-base sm:text-lg`; riscado `text-[10px]` -> `text-xs`; botão `h-9 w-9` -> `h-10 w-10`, `pr-12` -> `pr-14`.
- `ProductCard.tsx` (grade): nome/preço `text-sm` -> `text-base`; descrição `text-xs` -> `text-[13px]`; rótulos `text-[10px]` -> `text-xs`.
- `FeaturedScroller.tsx`: nome/preço `text-sm` -> `text-base`, descrição `text-[11px]` -> `text-xs`, riscado `text-[10px]` -> `text-xs`.
- Conferir com Playwright em viewport mobile que nada quebra linha de forma estranha.
