# Levar o tamanho escolhido na busca para a janela de personalização (PDV)

## Problema
Na janela "Localizar Produto", cada tamanho aparece em uma linha própria (ex.: "Pastel 2 Sabores (Grande)"). Ao personalizar essa linha (Enter ou "..."), a janela seguinte abre sempre com o primeiro tamanho marcado ("Pequeno"). O atendente precisa trocar de novo.

## O que muda
- Ao personalizar uma linha com tamanho, a janela abre com esse tamanho já marcado e o preço certo (Grande → R$ 18,00).
- Linhas sem tamanho continuam como hoje (primeiro tamanho ou nenhum).
- Vale para produtos comuns e pizzas.
- A loja do cliente não muda.

## Detalhes técnicos
- `admin.pdv.tsx`: no `onPersonalize`, guardar `r.sizeId` em estado (`selectedSizeId`) e repassar ao `ProductModal` como `initialSizeId`. Limpar quando outra linha sem tamanho for aberta.
- `ProductModal.tsx`: nova prop opcional `initialSizeId`. No efeito de reset ao abrir (linhas ~120-140), usar `initialSizeId` se existir em `product.sizes` (ou em `visiblePizzaSizes`), senão manter o primeiro; marcar `sizeTouched=true` nesse caso para exibir o preço exato.
- Verificar com typecheck; teste em tela requer login no PDV.
