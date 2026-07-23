## Objetivo
No `ProductModal`, transformar a imagem do produto em um bloco fixo no topo, enquanto o conteúdo (nome, preço, seções) rola por cima com efeito parallax — como no iFood/aiqfome moderno.

## Comportamento
- Imagem ocupa o topo do modal (h-56 mobile / h-64 desktop) e **permanece fixa** enquanto o usuário rola.
- Conteúdo desliza sobre a imagem, com a borda superior arredondada (`rounded-t-3xl`) e leve sombra, criando a sensação de "folha subindo".
- Parallax sutil: a imagem se desloca ~30% da velocidade do scroll (translateY negativo) e recebe um leve zoom/escurecimento conforme o conteúdo cobre.
- Botão "Voltar" e badge "Destaque" permanecem ancorados no topo da imagem (posição absoluta no header do modal, acima do conteúdo).
- Footer com quantidade + "Adicionar" segue fixo no rodapé (comportamento atual mantido).

## Implementação técnica
Arquivo único: `src/components/storefront/ProductModal.tsx`

1. Reestruturar o layout interno do `DialogContent`:
   - Wrapper `relative` ocupando todo o modal.
   - **Camada 1 (imagem)**: `absolute inset-x-0 top-0 h-56 sm:h-64`, com `<img>` em `object-cover` + overlay gradiente sutil.
   - **Camada 2 (scroll container)**: `relative h-full overflow-y-auto`, com `padding-top` igual à altura da imagem. Primeiro filho é um "espaçador" transparente, seguido do painel de conteúdo com `bg-card rounded-t-3xl -mt-6 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)]` para sobrepor a imagem.
   - **Camada 3 (chrome)**: botão voltar/badge em `absolute z-20`, sempre visíveis.

2. Parallax:
   - `onScroll` no container captura `scrollTop`.
   - Aplicar `transform: translateY(${scrollTop * 0.3}px) scale(${1 + scrollTop * 0.0005})` na imagem via `ref` + estilo inline.
   - Overlay escurece proporcionalmente (`opacity: Math.min(scrollTop / 200, 0.4)`).
   - Usar `requestAnimationFrame` para suavizar.

3. Preservar o tratamento de imagem padrão (`isDefaultProductImage` → `object-contain p-8`).

4. Ajustar `pt-5` do container de conteúdo para compensar o novo `rounded-t-3xl`.

## Fora de escopo
- Não altera lógica de preços, validações, addons, pizza, brindes ou carrinho.
- Não mexe em `ProductCard`, `Storefront`, ou outros componentes.
