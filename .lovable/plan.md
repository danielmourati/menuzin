# Personalizar item (PDV) — seções lado a lado, sem acordeão

## Problema
Na versão atual, todo grupo marcado como obrigatório ou com mínimo de seleção vai para o topo, em acordeão, empilhado. Por isso adicionais e complementos acabam um embaixo do outro, e as colunas lado a lado quase não aparecem.

## O que muda (só no PDV e na edição de pedido; a loja do cliente não muda)
1. **Sem acordeão:** nenhuma seção abre ou fecha. Todas ficam sempre visíveis, como cards com borda.
2. **Grade lado a lado:** todos os grupos (Tamanho, Sabores, Adicionais, Complementos, Observações) viram cards numa grade de 2 colunas (3 quando a janela for larga). Cada card tem título, busca própria e rolagem interna, como no modelo Consumer.
3. **Ordem:** primeiro Tamanho e Sabores (obrigatórios, com o selo "Obrigatório"), depois Complementos/Adicionais, e Observações por último, com o campo "Digite aqui outras observações..." no fim do card.
4. **Estilo das linhas:**
   - Escolha única (tamanho, sabor quando máximo for 1): bolinha de seleção.
   - Escolha múltipla sem preço (observações, sabores): caixinha de marcar.
   - Com preço (adicionais): "Nome (preço)" com botões − 0 +.
5. **Janela maior:** no computador ocupa até cerca de 1100px de largura, com cards de altura uniforme. No celular os cards ficam empilhados (não há espaço lateral).
6. Validação de obrigatórios, preços, Enter = OK e Esc = Voltar continuam iguais.

## Detalhes técnicos
- `ProductModal.tsx` (modo `compact`): deixar de dividir em `accordionGroups`/`columnGroups`; passar todos os grupos (incluindo tamanho de produto/pizza e sabores) para um novo layout em grade, sem renderizar o bloco de acordeão.
- `PdvCustomizeColumns.tsx` → generalizar para `PdvCustomizeGrid`: um card (`ColumnCard`) por grupo, `grid sm:grid-cols-2 xl:grid-cols-3`, cada card com `max-h` e `overflow-y-auto`; tipo da linha decidido por maxSelect/preço/kind.
- `DialogContent` compact: `sm:max-w-5xl`.
- Reutilizar `stepGroupOptionQty`, `normalizeSearch` e a validação existente; testes atuais continuam válidos.
- Conferir no navegador, logado, abrindo "Pastel 2 Sabores" no PDV e tirando print.
