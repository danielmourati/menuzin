# Pix Online: travar preparo até o MP aprovar + reduzir recusas

## O que os dados mostram (pedido #1027, Pastelão Junin)
- 3 tentativas de Pix, todas `rejected / rejected_high_risk` (antifraude do Mercado Pago).
- O pedido foi para "Em preparo" 16s depois por **aceite manual** ("Pedido aceito — iniciou preparo"). O aceite automático já espera o pagamento; o botão manual e o arrastar no Kanban não esperam.

## Parte 1 — Pedido só vai para "Em preparo" com Pix aprovado
- **Servidor (regra definitiva):** na função que muda status do pedido, se a forma for Pix Online e não houver pagamento `approved`, recusar qualquer mudança de "Novo" para preparo/saiu/pronto/finalizado com a mensagem "Aguardando confirmação do Pix pelo Mercado Pago". Cancelar continua permitido.
- **Painel:** no card e no detalhe do pedido, trocar o botão "Aceitar" por um selo "Aguardando Pix" (ou "Pix recusado" em vermelho), bloquear arrastar para outra coluna e oferecer:
  - "Cancelar pedido"
  - "Receber de outra forma" (trocar para Pix manual/dinheiro/cartão na entrega), que libera o aceite.
- Quando o webhook aprovar, o aceite automático segue funcionando como hoje.
- Teste: regra pura `canAdvanceOrder(status, paymentMethod, paymentStatus)` com casos aprovado/pendente/recusado/cancelar.

## Parte 2 — Diminuir a recusa "alto risco"
O MP recusa quando faltam dados do comprador. Enviar na criação do Pix:
- **CPF do cliente** (novo campo obrigatório só quando escolher Pix Online, com validação de dígitos).
- Nome e sobrenome separados, telefone, e-mail real (se informado).
- **Identificador do dispositivo** do MP (script de segurança oficial no checkout, enviado no cabeçalho `X-meli-session-id`).
- `additional_info` com itens do pedido e dados do comprador.
- Ao recusar, mostrar ao cliente "Pagamento recusado pelo Mercado Pago — tente outra forma de pagamento" com botão para trocar a forma, sem gerar várias tentativas repetidas.

Observação: a decisão final é do antifraude do Mercado Pago; esses dados aumentam a aprovação mas não garantem. Se continuar, a loja precisa verificar com o MP se a conta está com chave Pix e sem restrição.

## Detalhes técnicos
- `src/lib/orders.functions.ts` (`updateOrderStatus` e edição) — checagem server-side do pagamento.
- `src/lib/order-payment-gate.ts` (novo, puro) + `tests/order-payment-gate.test.ts`.
- `src/hooks/useAcceptOrderWithKitchenPrint.ts`, cards/Kanban e `OrderDetailsDrawer.tsx` — selo e bloqueio.
- `src/lib/payments.functions.ts` — payer.identification CPF, first/last name, additional_info, header device id.
- Checkout (`$slug` checkout) — campo CPF condicional + script `https://www.mercadopago.com/v2/security.js`.
- Ação "Receber de outra forma" atualiza `payments` para método offline `manual`.
