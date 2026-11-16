# Sabor único já selecionado automaticamente

## Problema
Em pizzas (ex.: "Frango com catupiry") cujo tamanho permite só 1 sabor, a lista de sabores fica oculta, mas o próprio sabor não é marcado. Por isso o botão mostra "Escolha 1 sabor(es)" e não deixa adicionar.

## O que muda
- Quando o tamanho escolhido aceitar apenas 1 sabor (ou o cliente escolher "1 sabor"), o próprio produto aberto passa a ser o sabor selecionado automaticamente.
- Ao trocar de tamanho, a regra é reaplicada; se o produto não tiver preço naquele tamanho, nada é pré-selecionado.
- O botão passa a mostrar "Adicionar" com o preço correto direto.
- Vale para a loja do cliente e para o PDV (mesma janela).

## Detalhes técnicos
- `src/components/storefront/ProductModal.tsx`: efeito que, quando `isPizzaCategory && productIsListed && effectiveFlavorTarget === 1` e o produto está em `availablePizzaFlavors`, define `flavorIds = [product.id]` se a seleção estiver vazia ou inválida.
- Teste pequeno do helper de seleção, se extraído.
