# Adicionais e observações nos pastéis de vários sabores (Pastelão Sousa)

## Situação atual
- Os pastéis de 2, 3, 4 e 5 sabores e os Doces 2 Sabores não têm nenhum adicional nem observação. O cliente abre o produto e só escolhe o tamanho.
- Os 4 Pastéis Montados só têm a escolha obrigatória de sabores. Não há adicionais extras nem observações.

## O que será feito
Usar a lista de 22 sabores da loja (Queijo, Frango, Carne, Carne de sol, Calabresa, Presunto, Pernil, Bacon, Salsicha, Camarão, Catupiry, Cheddar, Milho, Ervilha, Tomate, Azeitona, Cenoura, Batata, Ovo, Cebola, Batata palha, Pimenta calabresa) para criar dois grupos:

1. **Adicionais** (opcional, o cliente escolhe quantos quiser): cada sabor pode ser acrescentado ao pastel.
2. **Observações** (opcional, várias escolhas): "Sem Cebola", "Sem Tomate" etc., um para cada sabor, sem custo.

Esses grupos vão aparecer nas categorias:
- Pastéis 2, 3, 4 e 5 Sabores
- Pastéis Doces 2 Sabores
- Pastéis Montados (depois da escolha obrigatória de sabores)

Ficam ligados às categorias, então um pastel novo cadastrado nelas já recebe as opções.

## Pontos para você confirmar depois
- **Preço dos adicionais:** a planilha não traz esse valor, então todos começam em R$ 0,00. Você pode ajustar no painel (Adicionais) ou me passar os valores.
- Os sabores salgados também vão aparecer nos Doces 2 Sabores. Se quiser, depois deixo só os doces lá.

## Detalhes técnicos
- Alteração só de dados (sem mudança de estrutura), apenas no tenant `46089417-...`.
- Criar 2 `addon_groups` (`kind='adicional'`, min 0 / max 22; `kind='observacao'`, min 0 / max 22) com 22 `addon_options` cada, e `addon_group_targets` por `category_id` para as 6 categorias.
- O catálogo já distribui grupos por categoria e o `ProductModal` já exibe os grupos; nada muda no código.
- Conferir no navegador um pastel de 2 sabores e um Montado.
