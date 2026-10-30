# Personalizar item no PDV — layout estilo Consumer

Vale só para a janela compacta (PDV e edição de pedido no admin). A loja do cliente não muda.

## Layout

```text
+-----------------------------------------------------------+
| Personalizar item                                     [X] |
| [-] 1 [+]   Pastel Alabama Apimentado          R$ 20,00   |
| (tamanho / sabores obrigatórios, se houver — topo)        |
+-----------------------------+-----------------------------+
| Observações    [Buscar...]  | Complementos   [Buscar...]  |
| [ ] Para viagem             | Bacon (3,50)      (-) 0 (+) |
| [ ] Sem maionese            | Calabresa (2,50)  (-) 0 (+) |
| [ ] Sem tomate              | Cebola (0,50)     (-) 0 (+) |
| ...  (rolagem própria)      | ...  (rolagem própria)      |
| [Digite outras observações] |                             |
+-----------------------------+-----------------------------+
|                  [‹ Voltar]   [✓ OK]                      |
+-----------------------------------------------------------+
```

- **Coluna esquerda — Observações:** junta todos os grupos de observação numa lista de caixas de marcar, com busca e, embaixo, o campo de texto livre.
- **Coluna direita — Complementos/Adicionais:** junta os grupos de adicionais numa lista com o preço entre parênteses e botões − / + para quantidade.
- Cada coluna tem busca própria (ignora acentos) e rola sozinha; o cabeçalho e os botões ficam fixos.
- Escolhas obrigatórias (tamanho, sabores, grupos com mínimo) ficam no topo, acima das colunas, com o aviso vermelho atual.
- Se só existir um dos lados, ele ocupa a largura toda. No celular, as colunas ficam uma abaixo da outra.
- Teclado: Enter confirma, Esc volta (como hoje); Tab passa da busca para a lista.

## Ponto a decidir

Hoje cada adicional só pode ser marcado uma vez. O botão + do modelo permite "2× Bacon". Proposta: liberar quantidade por adicional (respeitando o máximo do grupo), somando ao preço e imprimindo "2x Bacon" na comanda. Se preferir, mantenho marcar/desmarcar com o mesmo visual.

## Detalhes técnicos

- `ProductModal.tsx`: com `compact`, trocar o Accordion por `<PdvCustomizeColumns>` novo em `src/components/pdv/`, que separa `allGroups` por `kind === "observacao"`.
- Quantidade: `groupSelections` passa a aceitar repetição de IDs (ou mapa id→qty); ajustar cálculo de total, validação min/max, montagem do item do carrinho, recálculo no servidor e `receiptItemDetails` para agrupar "Nx".
- Busca usa o mesmo normalizador sem acento já usado no PDV.
- Teste Bun para total com adicional em quantidade 2 e limite do grupo.
