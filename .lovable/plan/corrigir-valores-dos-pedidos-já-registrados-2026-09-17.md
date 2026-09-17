# Corrigir valores dos pedidos já registrados

Os relatórios estão errados porque vários pedidos gravados têm subtotal e total que não batem com a soma dos itens do próprio pedido.

## O que foi verificado

Comparando cada pedido com a soma dos seus itens (quantidade x preço unitário), 11 dos 32 pedidos estão divergentes:

- **Pedidos reais** (loja Famozin): valores inflados porque os adicionais foram somados duas vezes. Ex.: pedido #1008 — item de R$ 37,00 (já com arroz e batata inclusos) foi registrado como R$ 62,00 de subtotal, R$ 70,00 de total; o correto é R$ 37,00 + R$ 8,00 de entrega = R$ 45,00.
- **Pedidos de demonstração** (Burguer Prime): subtotais digitados na criação dos dados de exemplo que não correspondem aos itens. Ex.: #1009 registrado com R$ 86,60 sendo que o item é R$ 119,90.

A causa no código já foi corrigida anteriormente, então pedidos novos nascem certos. Falta acertar o histórico.

## O que será feito

1. Recalcular, para cada pedido divergente, o subtotal como a soma de (quantidade x preço unitário) dos seus itens.
2. Recalcular o total como subtotal - desconto + taxa de entrega, mantendo taxa de entrega e desconto como estão hoje.
3. Aplicar somente aos pedidos onde há divergência, deixando os 21 pedidos corretos intactos.
4. Conferir depois da correção que nenhum pedido continua divergente.

Resultado: os relatórios de vendas e os históricos de pedidos passam a mostrar os valores reais.

## Detalhes técnicos

Atualização de dados em `public.orders` via `UPDATE ... FROM` com subconsulta agregando `public.order_items` por `order_id`, filtrando `WHERE subtotal IS DISTINCT FROM calculado`. Sem mudança de schema e sem alteração de código.
