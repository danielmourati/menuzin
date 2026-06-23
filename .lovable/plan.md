## Reduzir fonte do cupom da cozinha em 50%

Hoje o cupom da cozinha (`src/lib/kitchen-ticket.ts`) imprime cabeçalho e itens com fonte **2x largura + 2x altura** (ESC/POS `GS ! 0x11`). Reduzir 50% significa voltar à fonte normal da impressora (`GS ! 0x00`) nesses blocos — o tamanho padrão do ESC/POS é exatamente metade em largura e altura.

### Mudança

Arquivo único: `src/lib/kitchen-ticket.ts`

- Trocar `ESC_BIG = "\x1d!\x11"` por `"\x1d!\x00"` (fonte normal), ou simplesmente parar de emitir `ESC_BIG`/`ESC_NORMAL` e usar largura total `cols` em vez de `bigCols` para cabeçalho e itens.
- Ajustar `bigCols` para usar `cols` (sem dividir por 2), já que não há mais fonte dobrada.
- Separadores (`bigSep`, `bigSepThin`) passam a ocupar a largura completa do papel.
- Rodapé permanece igual (já era fonte normal).

Sem mudanças em backend, schema, ou em outros arquivos. O preview (`PrintableOrder`) não usa este builder, então nada muda na UI.
