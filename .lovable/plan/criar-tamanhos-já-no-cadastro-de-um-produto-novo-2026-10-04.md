# Criar tamanhos já no cadastro de um produto novo

## Situação atual
- Ao **editar** um produto já salvo, o card "Preços e tamanhos" já permite adicionar, renomear, mudar preço e remover tamanhos.
- Ao **criar** um produto novo, aparece só o aviso "Salve o produto para cadastrar tamanhos", sem como incluí-los (o print enviado).

## O que muda
1. No produto novo, o card passa a ter a mesma área "Novo tamanho + Preço + botão +", e os tamanhos adicionados aparecem numa lista (com editar nome/preço e remover) antes de salvar.
2. Ao clicar em Salvar, o produto é criado e os tamanhos são gravados junto. O preço base vira automaticamente o menor tamanho.
3. Se houver pelo menos um tamanho na lista, os campos "Preço base / Preço promo" somem (mesmo comportamento do produto já salvo).
4. Extra nos dois casos: botões de subir/descer para ordenar os tamanhos.
5. Produtos de pizza continuam usando a configuração da categoria (sem mudança).

## Detalhes técnicos
- `src/routes/admin.produtos.tsx`: estado local `draftSizes` no modal; `SizesEditor` ganha modo "rascunho" (sem productId, opera em memória).
- Após o insert do produto, chamar `saveProductSize` para cada rascunho (sort_order sequencial); o servidor já sincroniza `products.price` com o menor tamanho.
- Reordenar: trocar `sort_order` entre vizinhos via `saveProductSize`, reaproveitando `ReorderButtons`.
- Sem mudança no banco.
