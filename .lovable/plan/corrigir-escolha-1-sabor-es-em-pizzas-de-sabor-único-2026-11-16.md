# Corrigir "Escolha 1 sabor(es)" em pizzas de sabor único

## Causa encontrada
Na Pizzaria Dominus, "Frango com catupiry" e "Calabresa" estão marcados como **não listados como sabor**. Por isso a janela trata cada pizza como um "combo" que precisa de outros sabores. Mas não existe nenhum sabor listado para escolher, e o tamanho só permite 1 sabor. O resultado é o botão travado em "Escolha 1 sabor(es)". A correção anterior só funcionava para pizzas listadas como sabor, por isso não teve efeito.

## O que muda
- Se o tamanho permite apenas 1 sabor, a própria pizza aberta conta como o sabor escolhido. Isso vale mesmo que ela não esteja marcada como sabor. Não é preciso escolher nada.
- O mesmo vale quando a categoria não tem nenhum sabor para escolher.
- O preço continua o do tamanho da própria pizza (Pequena R$18, Média R$25 etc.).
- Pizzas com 2 ou mais sabores por tamanho continuam pedindo a escolha normalmente.
- Vale para a loja e para o PDV.

## Detalhes técnicos
- `ProductModal.tsx`: calcular `flavorRequirement` = 0 quando `!productIsListed && (pizzaMaxFlavors <= 1 || availablePizzaFlavors.length === 0)` e o produto tem preço próprio no tamanho (`ownPizzaSizePrice > 0`); usar isso na validação, em `missingPizzaFlavors` e no rótulo do botão.
- No carrinho, o item é salvo com o nome e o preço do tamanho do próprio produto, sem linha de sabor extra.
- Conferir no navegador com "Frango com catupiry" em todos os tamanhos.
