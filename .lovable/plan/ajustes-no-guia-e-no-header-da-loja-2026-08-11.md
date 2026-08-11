# Ajustes no Guia e no header da loja

## 1. Carrossel hero com arraste no dedo (mobile)

- O carrossel de destaques do topo do Guia passa a responder ao gesto de arrastar: o slide acompanha o dedo e, ao soltar, avança/volta um item (ou volta ao lugar se o arraste for curto).
- A rotação automática pausa enquanto o dedo está na tela e volta depois.
- Os pontinhos de navegação continuam funcionando; no desktop nada muda.

## 2. Badge do tenant no carrossel hero

- Cada slide do hero ganha um selo com logo redonda da loja, nome e avaliação (estrela + nota), quando o destaque estiver vinculado a uma loja.
- Sem loja vinculada ou sem avaliação, o selo se adapta (só logo + nome, ou nada).

## 3. Seção "em destaque agora"

- Grid de 3 colunas dentro do viewport.
- Com mais de 3 itens, vira um carrossel horizontal deslizável (cada card ocupando 1/3 da largura), mantendo o link "ver mais" para expandir em grade completa.

## 4. Rodapé do Guia fixo

- A barra inferior (início / busca / pedidos / conta) passa a ficar fixa também no desktop, sem rolar com a página, com o espaçamento inferior do conteúdo ajustado.

## 5. Imagem de fundo no header da loja (storefront)

- No `/{slug}`, o cartão de informações da loja passa a exibir a capa (`coverUrl`) como imagem de fundo, com camada escura para manter a legibilidade do nome, status e ícones.
- Sem capa cadastrada, mantém o gradiente do tema atual.

## 6. Remover badges amarelos de destaque

- Some o selo amarelo "destaque" dos cards de loja (grade e lista) na home do Guia.
- Some o selo amarelo de nota no card de produto em destaque (`featured`), mantendo a nota apenas nos contextos neutros (ex.: famozin, badge do hero).

## Detalhes técnicos

- `src/routes/guia.index.tsx`
  - `HeroCarousel`: handlers `onTouchStart/Move/End` + `onPointer*`, `dragX` em estado, transform combinando índice e deslocamento, threshold ~20% da largura; `clearInterval` durante o gesto.
  - `featured_real`: substituir o grid fixo por `grid grid-cols-3` quando `<= 3` itens e por um scroller `flex overflow-x-auto snap-x` com `basis-1/3` quando `> 3`; manter `featuredAll` expandindo em grade.
  - Nav inferior: remover `md:hidden` e ajustar `pb-28 md:pb-16` → padding uniforme.
  - `AllStoresSection`: remover os dois blocos `s.has_featured && (...)`.
- Badge do hero: `getGuiaHome` (`src/lib/guia.functions.ts`) passa a resolver, para os slots com `tenant_id`, o nome/logo da loja e a média de avaliações (mesma agregação usada em `listAllStores`), expostos em novos campos opcionais de `GuiaSlot` (`storeLogo`, `storeRating`, `storeRatingCount`) em `src/lib/guia-types.ts`. `SlotCard` (kind `hero`) renderiza o selo.
- `src/components/guia/SlotCard.tsx`: remover a badge amarela de rating do card `featured`.
- `src/routes/$slug.tsx`: aplicar o `bannerStyle` já calculado (hoje sem uso) como fundo do card da loja, com overlay e classes de texto claro condicionais a `tenant.coverUrl`.
- Sem migrações de banco; nenhuma alteração em rotas ou regras de negócio.
