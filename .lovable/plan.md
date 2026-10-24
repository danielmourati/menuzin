# "Onde imprimir" em cada produto (vale mais que a categoria)

## Como está hoje
- A regra já é: produto marcado > categoria > local principal da cozinha.
- O quadro "Onde imprimir" do produto já existe, mas fica escondido na última aba (Classificação) da edição, e em produto novo só aparece depois de salvar.

## O que muda
- Mover o quadro "Onde imprimir" para a primeira aba da edição do produto, logo abaixo da categoria, para ficar fácil de achar.
- Mostrar no quadro de onde vem a impressão atual quando nada está marcado no produto. Ex.: "Sem marcação: segue a categoria Bebidas (Sucos/Frituras)". Ao marcar um local no produto, mostra "Este produto imprime só aqui, mesmo que a categoria use outro local".
- Produto novo: a escolha fica guardada e é salva junto ao clicar em Salvar/Continuar (sem precisar salvar antes).
- Botão "Usar o da categoria" para limpar a escolha do produto.

## Teste
- Categoria Bebidas em Sucos/Frituras; produto Coca marcado em Cozinha: pedido com Coca sai só na Cozinha.
- Teste automático da regra ganha esse caso (produto ignora categoria).

## Detalhes técnicos
- `admin.produtos.tsx`: mover `PrintLocationPicker` da aba `classificacao` para a aba principal; passar `categoryId` para exibir o herdado via `getMyPrintRouting().categories`.
- `PrintLocationPicker`: modo controlado (`onChange`) quando não há `id`; após criar o produto, chamar `setPrintLocations` com o id retornado.
- `scripts/print-routing-tests.mjs`: caso de produto sobrepondo categoria.
