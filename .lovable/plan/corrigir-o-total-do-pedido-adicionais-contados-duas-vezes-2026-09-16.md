# Corrigir o total do pedido (adicionais contados duas vezes)

## O que está errado

No pedido #1008 a conta mostra:

- Item: R$ 37,00 (frango R$ 12 + arroz R$ 10 + batata R$ 15)
- Subtotal: R$ 62,00
- Entrega: R$ 8,00
- Total: R$ 70,00

O subtotal correto seria R$ 37,00 e o total R$ 45,00. A diferença de R$ 25,00 é
exatamente a soma dos adicionais (R$ 10 + R$ 15): eles já estão dentro do preço
do item e estão sendo somados de novo na hora de fechar a conta.

## Causa confirmada

Na criação do pedido, o preço enviado por item já inclui tamanho, sabores e
adicionais. Mesmo assim, o cálculo do subtotal no servidor soma os adicionais
outra vez antes de gravar o pedido. O valor exibido no item está certo; o que
está inflado é o subtotal (e, por consequência, o total, e a base de cálculo de
cupons e de pedido mínimo).

## Correção

1. Ajustar o cálculo do subtotal no servidor para usar apenas quantidade x preço
   do item, sem re-somar os adicionais.
2. Conferir que a mesma regra vale para desconto de cupom, pedido mínimo de
   entrega e total gravado — todos passam a usar o subtotal correto.
3. Validar com um pedido de teste reproduzindo o caso do print: item R$ 37,00 +
   entrega R$ 8,00 deve resultar em R$ 45,00, e conferir que carrinho, tela de
   confirmação, painel do lojista e cupom impresso mostram o mesmo valor.

## Pedidos antigos

Os pedidos já gravados continuam com o valor inflado no banco. Posso, se você
quiser, recalcular o subtotal e o total dos pedidos existentes a partir dos
itens. Diga se prefere corrigir o histórico ou deixá-lo como está.

## Detalhes técnicos

- Arquivo: `src/lib/orders.functions.ts`, cálculo do `subtotal` (`it.unit_price + addonsSum`)
  passa a ser `it.qty * it.unit_price`.
- O `unit_price` enviado vem de `computeUnitPrice` em `src/lib/cart-context.tsx`,
  que já agrega `basePrice`, `addons` e `groupOptions`; o array `addons` gravado
  é apenas rótulo/detalhamento do item.
- Único ponto de criação de pedidos é `CartDrawer.tsx`, então não há outros
  chamadores impactados.
