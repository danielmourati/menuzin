# Entrega grátis até X km e divisão da taxa (50%/50%)

## 1. Entrega grátis até uma distância
Em Taxas de entrega (modo por KM), novo campo **"Grátis até (KM)"** (ex.: 4).
- Até 4 km: R$ 0,00 ("Entrega grátis").
- Acima de 4 km: **Taxa Base** (ex.: R$ 6,00) + **Valor por KM adicional** × km que passarem dos 4 km (com o arredondamento já escolhido).
- Exemplo: 6,3 km, meio em meio km → 2,5 km extras → R$ 6,00 + 2,5 × R$ 2,00 = R$ 11,00.
- Deixar 0 mantém o cálculo atual (sem faixa grátis). O simulador mostra a conta detalhada.

## 2. Divisão da taxa de entrega
Nova opção **"Quem paga a taxa"**: Cliente 100% (padrão), **Dividir 50%/50%** (loja paga metade), ou percentual personalizado.
- Checkout, chat da IA, PDV e cupom mostram: "Taxa de entrega R$ 11,00 — loja paga R$ 5,50 — você paga R$ 5,50".
- O total do pedido usa só a parte do cliente.
- O entregador continua recebendo a taxa cheia no Caixa (R$ 11,00); a parte da loja aparece no resumo do turno como "Subsídio de entrega".
- Vale para os modos taxa única, por bairro e por KM.

## Detalhes técnicos
- Migração (adições): `tenants.delivery_free_km numeric default 0`, `tenants.delivery_fee_customer_pct numeric default 100` (0–100, validado por trigger); `orders.delivery_fee_full numeric` e `orders.delivery_fee_store_share numeric default 0`.
- `delivery-zones.functions.ts` (`resolveDeliveryFee`/cálculo puro): se `distance <= free_km` → 0; senão base + perKm × arredondar(distance − free_km). Aplicar a divisão no servidor e retornar `{ fee, fullFee, storeShare }`.
- `orders.functions.ts`, `ai-agent.server.ts`, PDV: recalcular no servidor e gravar `delivery_fee` = parte do cliente, `delivery_fee_full` e `delivery_fee_store_share`.
- `cash.functions.ts`: taxas do entregador usam `coalesce(delivery_fee_full, delivery_fee)`.
- `receipt-builder.ts`: linha de subsídio quando houver.
- `admin.taxas-entrega.tsx`: novos campos + simulador.
- Testes bun para a regra: 3,9 km → 0; 4 km → 0; 6,3 km → 11,00; divisão 50% de 11,00 → 5,50/5,50.
