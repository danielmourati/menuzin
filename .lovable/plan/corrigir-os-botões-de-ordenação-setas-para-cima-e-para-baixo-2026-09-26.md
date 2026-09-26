# Corrigir os botões de ordenação (setas para cima e para baixo)

## O que está errado hoje
- **Produtos:** a seta troca o produto com o "vizinho" na loja inteira, não com o que aparece logo acima ou abaixo na tela. Com um filtro de categoria ativo (ou produtos de categorias diferentes misturados), o clique parece não fazer nada ou move o produto para outro lugar.
- **Ordem que não se mantém:** vários itens têm o mesmo número de ordem. A lista mostrada e a lógica das setas desempatam de jeitos diferentes, então a tela recarrega com uma ordem diferente da esperada.
- **Falha silenciosa:** se alguma gravação falhar, o painel não avisa e a ordem fica pela metade.
- **Opções dentro de um grupo** (ex.: "Sem Cebola", "Queijo"): o servidor aceita reordenar, mas não há setas na tela.
- A loja (cardápio do cliente) nem sempre usa a mesma ordem do painel.

## O que será feito
1. Produtos passam a ser reordenados **dentro da própria categoria**, trocando sempre com o item exibido logo acima ou abaixo. Com o filtro "Todas", as setas seguem a ordem visível.
2. Uma ordem única e estável (número de ordem e depois data de criação) em todas as listas do painel e da loja.
3. Na primeira reordenação de uma lista, os números são refeitos em sequência (0, 1, 2...), eliminando empates antigos.
4. Qualquer erro ao salvar aparece como aviso e nada fica pela metade.
5. Setas nas opções de cada grupo em Adicionais e Observações.
6. A tela se atualiza na hora do clique, sem esperar o servidor, e desfaz se der erro.
7. Conferência no navegador em Categorias, Produtos, Adicionais e Observações: mover para cima e para baixo, recarregar e ver a mesma ordem na loja.

## Detalhes técnicos
- `reorderCatalogItem` (`catalog-admin.functions.ts`): escopo de `product` por `tenant_id + category_id`; `addonGroup` por `tenant_id + kind` (mantido); `addonOption` por `group_id`. Verificar `error` de cada `update` e lançar erro. Aceitar opcionalmente a lista de ids visível (`orderedIds`) para reordenar exatamente como a tela mostra.
- Adicionar `.order("created_at")` como desempate em `listMyCategories`, lista de produtos, grupos/opções (linhas ~39, 134, 468, 475, 640, 645) e nas consultas do cardápio público em `catalog.functions.ts`.
- `ReorderButtons`: atualização otimista via `setQueryData` + rollback; aceitar entidade `addonOption`.
- Adicionar `ReorderButtons` nas opções em `admin.adicionais.tsx` e `admin.observacoes.tsx`; em `admin.produtos.tsx`, calcular `isFirst/isLast` dentro da categoria.
