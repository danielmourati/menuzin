# Diagnóstico

O toast "Gerando transação Pix segura..." não evolui e o cartão é sempre recusado porque o checkout transparente nunca foi efetivamente implementado:

- `createPixPayment` e `createCardPayment` em `src/lib/payment-service.ts` são **stubs que lançam `Error("Checkout transparente ainda não implementado.")`**. O catch dispara, mas o `toast.loading()` não é dispensado corretamente porque o id retornado não é capturado.
- O `CardCheckout` envia um `card_token` falso (`tok_${Math.random()...}`). Mesmo que o backend chamasse o MP, a resposta seria sempre `cc_rejected_bad_filled_other` — daí o "Pagamento Recusado" do print.
- A edge function `create-transparent-payment` existe, mas referencia tabelas antigas (`stores`, `orders.order_number`) que não batem com o schema atual (`tenants`, `orders`).
- O `order_id` enviado pro gateway é `o_${Date.now()}` (fake) — não há pedido persistido no momento da cobrança, então qualquer reconciliação por webhook quebraria.

# O que será feito

### 1. Persistir o pedido antes da cobrança
No `CartDrawer.tsx`, mover `createOrder` para o momento em que o cliente seleciona Pix Online (ou clica em "Confirmar pagamento" no cartão), com status inicial `pending_payment` / `payment_status='pending'`. O `order.id` real vira o `external_reference` do MP e também a `X-Idempotency-Key`. O `finalize()` deixa de criar pedido — apenas navega para a confirmação. Se o cliente cancelar antes de pagar, marca o pedido como `cancelled`.

### 2. Server function pública `createTransparentPayment`
Em `src/lib/payments.functions.ts`, nova `createServerFn` **sem `requireSupabaseAuth`** (checkout público), usando `supabaseAdmin`:

- Recebe `{ store_slug, order_id, payment_method, card_token?, installments?, payer }`.
- Resolve `tenant_id` por slug, valida que `orders.tenant_id === tenant.id` (anti-tamper).
- Lê `store_payment_settings`, descriptografa `mp_access_token_encrypted` com o `decryptToken` já existente.
- `POST https://api.mercadopago.com/v1/payments` com `X-Idempotency-Key: <order_id>` e o token decifrado.
- Insere linha em `payments` (status, `raw_response`).
- Atualiza `orders` com `payment_status`, `mp_payment_id`, `mp_status`, `mp_status_detail`.
- Se o gateway falhar antes do payment ser persistido como `approved`, marca o registro `payments` como `failed` no mesmo handler (evita pendentes órfãos).
- Retorna apenas DTOs seguros (Pix: qr_code, qr_code_base64, expires_at, payment_id, status; Card: payment_id, status, status_detail).

### 3. Tokenização real de cartão (MP SDK v2)
No `CardCheckout.tsx`:
- Receber `publicKey` como prop (vinda de `settings.mp_public_key`).
- Carregar `https://sdk.mercadopago.com/js/v2` via `<script>` injetado no mount.
- `const mp = new MercadoPago(publicKey)` e, no submit, `mp.createCardToken({ cardNumber, cardholderName, cardExpirationMonth, cardExpirationYear, securityCode, identificationType:'CPF', identificationNumber })`.
- Enviar o `card_token` real para o backend. Sem isso, MP recusa 100% das transações.

### 4. Polling de status real
Nova server fn pública `getPaymentStatus({ payment_id, store_slug })` que consulta `GET /v1/payments/{id}` no MP, atualiza `payments`/`orders` e devolve o `PaymentStatus` normalizado. `pollPaymentStatus` no client passa a chamá-la a cada 4s no `PixCheckout` até receber `approved/rejected/cancelled/expired`.

### 5. Webhook alinhado
Atualizar `supabase/functions/mercado-pago-webhook/index.ts` para usar `tenants` / `orders.id` (não `stores`/`order_number`), com upsert idempotente em `webhook_events` por `provider_event_id` e update atômico em `payments`/`orders` apenas quando o status mudar. Mostrar a URL pública do webhook ao final para o usuário cadastrar no painel MP.

### 6. Corrigir o toast travado
Capturar o id do `toast.loading(...)` e chamar `toast.dismiss(id)` no `try/catch/finally`. Garante que mesmo se algo der errado o loading some.

### 7. Teste end-to-end em sandbox
Credenciais TEST do tenant `burgerprime` já estão salvas. Validar:

- **Pix:** carrinho → entrega → "Pagar agora" → Pix Online. QR aparece. Aprovar manualmente pelo painel MP (ou simular via API `PUT /v1/payments/{id}` com status `approved`). Polling deve detectar e navegar para confirmação. Conferir `orders.payment_status='approved'` e linha em `payments`.
- **Cartão:** usar cartão de teste Visa `5031 4332 1540 6351`, CVV `123`, validade `11/30`, titular `APRO` (aprovado) e `OTHE` (recusado) para os dois caminhos. Conferir status_detail correto e atualização das tabelas.

# Arquivos a editar

```text
src/lib/payments.functions.ts         # + createTransparentPayment, getPaymentStatus
src/lib/payment-service.ts            # wrappers reais (sem stubs)
src/components/storefront/CartDrawer.tsx
  - cria pedido antes da cobrança
  - captura id do toast.loading
  - passa publicKey + orderId reais para CardCheckout/PixCheckout
src/components/payment/CardCheckout.tsx
  - integra MP SDK v2 e createCardToken real
src/components/payment/PixCheckout.tsx
  - polling via getPaymentStatus
supabase/functions/mercado-pago-webhook/index.ts
  - alinhar tabelas (tenants/orders.id) + idempotência por provider_event_id
```

# Observações sobre sandbox vs produção

Não é necessário sair do sandbox para o fluxo funcionar — as credenciais TEST do Mercado Pago aceitam Pix e cartões de teste oficialmente. A troca para credenciais de produção só deve ser feita depois que esse fluxo estiver 100% verde em sandbox.
