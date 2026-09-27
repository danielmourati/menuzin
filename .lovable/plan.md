# Corrigir falha ao finalizar pedido com entrega por KM

## Causa
Quando a loja cobra entrega por KM, o carrinho calcula a taxa e marca a origem como "por distância". Mas o banco de dados só aceita, para essa origem, os valores antigos (sem taxa, taxa única, bairro por CEP, bairro por nome). Por isso o banco recusa o pedido e o cliente não consegue finalizar.

## O que vou fazer
1. Liberar no banco a origem "por distância" para a taxa de entrega dos pedidos.
2. Fazer um pedido de teste de ponta a ponta numa loja no modo por KM, com um endereço real, e confirmar que o pedido chega no painel com a taxa certa.
3. Deixar a mensagem de erro do checkout mais clara caso o banco recuse um pedido por outro motivo (em vez de falha genérica).

## Detalhes técnicos
- Migração: `ALTER TABLE public.orders DROP CONSTRAINT <check de delivery_fee_source>` e recriar com `('none','single_fee','neighborhood_by_cep','neighborhood_by_name','distance_km')`. Nome real da constraint conferido antes via consulta a `pg_constraint`.
- Origem do bug: migração `20260604045256` criou o CHECK sem `distance_km`; `orders.functions.ts` e `resolveDeliveryFee` já enviam `distance_km`.
- Log do erro do insert em `createOrder` sem expor detalhes ao cliente.
