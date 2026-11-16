# Onde fica "Não listado na montagem" e ajuste proposto

## Resposta
- O aviso aparece quando a opção **"Aceitar em pizzas meio a meio / múltiplos sabores"** está **desligada** no produto.
- Essa opção fica em Cardápio > Produtos > editar pizza, na aba principal, logo abaixo de "Disponível no cardápio". Ao criar uma pizza nova, ela vem ligada.
- Ela só é mostrada quando algum tamanho da categoria aceita 2 ou mais sabores. Em "Pizzas Tradicionais" da Pizzaria Dominus, todos os tamanhos aceitam só 1 sabor. Por isso a opção está escondida e não dá para religá-la. "Frango com catupiry" e "Calabresa" ficaram desligadas antes de os tamanhos passarem a aceitar só 1 sabor.
- Com a correção de hoje, essas pizzas já podem ser pedidas normalmente. O aviso aparece no painel, mas não tem efeito.

## Ajuste proposto
1. No painel, não mostrar o aviso "Não listado na montagem" quando a categoria só aceita 1 sabor por tamanho.
2. Religar a opção em "Frango com catupiry" e "Calabresa" da Pizzaria Dominus. Assim, se mais tarde você liberar meio a meio, elas já aparecem como sabores.

## Detalhes técnicos
- `admin.produtos.tsx`: condicionar o badge (linha ~1047) a `!singleFlavorOnly` da categoria do produto.
- Atualizar `products.listed_as_flavor = true` para as duas pizzas da categoria `cac421ad-...`.
