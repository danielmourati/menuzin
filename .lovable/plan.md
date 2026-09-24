# Impedir pedidos duplicados no painel

## O que está acontecendo
Não é erro de exibição: os pedidos estão realmente sendo gravados em dobro (ou triplo). Hoje:

- Kamyla: #1006, #1007 e #1008 criados com 1 segundo de diferença, R$ 80,00 cada, cada um com seu próprio Pix gerado. Só o #1008 foi pago.
- Cibele: #1003, #1004 (1 s de diferença) e #1005, R$ 38,00 cada. Só o #1005 foi pago.

Todos são Pix Online. Ao tocar em "Pix" várias vezes (ou a tela reabrir), o carrinho cria um novo pedido e um novo Pix a cada toque. A proteção que existe hoje fica só no navegador e é perdida em algumas situações (ex.: carrinho fechado/reaberto, tela recarregada).

## Correção
1. **Trava no servidor (principal):** cada tentativa de checkout recebe um código único. Se o mesmo código chegar de novo, o servidor devolve o pedido já criado em vez de criar outro. Vale para Pix, cartão, dinheiro e maquininha.
2. **Rede de segurança:** se chegar um pedido idêntico (mesma loja, mesmo WhatsApp, mesmos itens e valor) em até 2 minutos de outro ainda não pago, reaproveita o existente.
3. **Pix reaproveitado:** se o pedido já tem um Pix pendente, mostra o mesmo QR Code em vez de gerar outro.
4. **Botão travado:** as opções de pagamento ficam bloqueadas enquanto o Pix está sendo gerado.
5. **Limpeza de hoje:** cancelar #1003, #1004, #1006 e #1007 (duplicados não pagos) com o motivo "Pedido duplicado", mantendo #1005 e #1008, que foram pagos. Os duplicados deixam de contar nos relatórios.

## Validação
Simular vários toques rápidos em "Pix" e em "Finalizar" e confirmar que só um pedido aparece no painel.

## Detalhes técnicos
- Migração: coluna `orders.idempotency_key text` + índice único parcial `(tenant_id, idempotency_key)`.
- `CartDrawer.tsx`: gerar `crypto.randomUUID()` por checkout (guardado em `sessionStorage` por loja+carrinho, limpo em `resetAll`/após confirmação) e enviar em `createOrder`; desabilitar `PaymentMethodSelector` enquanto `ensureOrder` estiver pendente.
- `orders.functions.ts` (`createOrder`): antes do insert, buscar por `idempotency_key`; tratar conflito do índice único retornando o existente; fallback de dedupe por tenant+whatsapp+total+`payment_status='pending'` em 120 s.
- Criação do Pix: se `orders.mp_payment_id` já existir e estiver pendente, retornar os dados do pagamento existente.
- Limpeza via SQL: `status='cancelado'`, `cancel_reason='Pedido duplicado'` nos 4 pedidos.
