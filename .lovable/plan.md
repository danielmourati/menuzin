## Escopo desta fase

Apenas **salvar e validar credenciais manuais do Mercado Pago** (sandbox e produção) contra a API real do MP, persistindo de forma segura no banco. Sem OAuth, sem checkout transparente, sem pagamento de teste de R$ 0,01.

## 1. Banco de dados

Nova tabela `store_payment_settings` (uma linha por tenant):

- `tenant_id` (FK lógica → `tenants.id`, **unique**)
- `provider` (default `mercadopago`)
- `mp_public_key` (texto, seguro de expor — começa com `APP_USR-` ou `TEST-`)
- `mp_access_token_encrypted` (bytea, cifrado com `pgcrypto` usando chave do servidor — **nunca exposto ao client**)
- `mp_user_id` (texto, retornado pelo MP)
- `mp_live_mode` (bool)
- `mp_connected` (bool)
- `mp_last_validated_at` (timestamptz)
- Flags de métodos: `cash_enabled`, `pix_manual_enabled`, `card_on_delivery_enabled`, `pix_enabled`, `credit_card_enabled`, `debit_card_enabled`
- `pix_manual_key`, `pix_manual_key_type`, `pix_manual_receiver`
- `created_at`, `updated_at`

**RLS**: apenas owner/admin do tenant (ou platform_admin) leem/escrevem. GRANTs para `authenticated` e `service_role`.

Funções `encrypt_mp_token(text)` / `decrypt_mp_token(bytea)` em `SECURITY DEFINER` usando `pgp_sym_encrypt` com chave lida de `current_setting('app.payment_encryption_key')` — chave injetada apenas em server functions admin.

## 2. Secret

Solicitar `PAYMENT_ENCRYPTION_KEY` (string aleatória ≥32 chars) para cifrar/decifrar o access token em repouso.

## 3. Server functions (`src/lib/payments.functions.ts`)

Todas com `requireSupabaseAuth` + checagem de `has_tenant_role` (owner/admin):

- **`getPaymentSettings({ tenantId })`** — retorna versão **safe** (sem access token), incluindo `mp_public_key` mascarado para UI.
- **`saveMpCredentials({ tenantId, mp_public_key, mp_access_token, mp_live_mode })`**:
  1. Valida formato (`APP_USR-` / `TEST-`) + coerência com `mp_live_mode`.
  2. Chama `GET https://api.mercadopago.com/users/me` com o access token.
  3. Se 200: captura `id` (`mp_user_id`), `site_id` (deve ser `MLB`).
  4. Persiste via `supabaseAdmin` cifrando o token; seta `mp_connected=true`, `mp_last_validated_at=now()`, ativa `pix_enabled` e `credit_card_enabled` por padrão.
  5. Retorna `{ success, message, mp_public_key_masked, mp_user_id, live_mode }`.
  6. Em erro do MP: retorna `success:false` com mensagem clara (token inválido, expirado, sandbox vs prod).
- **`disconnectMercadoPago({ tenantId })`** — zera credenciais e flags online.
- **`updatePaymentSettings({ tenantId, patch })`** — atualiza somente campos seguros (flags, dados PIX manual).

## 4. Frontend

- Substituir `src/lib/payment-service.ts` por wrapper fino usando `useServerFn`. Remover mock `localSettings` e `mockSettings`.
- Em `src/routes/admin.configuracoes.pagamentos.tsx`: trocar `storeId = "t1"` por `profile.tenant_id` do `useAuth()`. Bloquear UI se não houver tenant.
- `MercadoPagoStatus`: mostrar `mp_user_id` e `mp_last_validated_at` quando conectado; badge sandbox/produção.
- Remover botão "Testar pagamento" (volta na próxima fase).

## 5. Fora de escopo (próximas fases)

- OAuth (`mp-connect-start` / callback).
- Checkout transparente PIX/cartão (`create-transparent-payment`).
- Webhook (`mercado-pago-webhook`).
- Pagamento de teste R$ 0,01.

## Pontos a confirmar

1. OK criar a tabela + pedir o secret `PAYMENT_ENCRYPTION_KEY` agora?
2. Posso usar as credenciais de sandbox que já estão no `.env` (`TEST_MP_ACCESS_TOKEN` / `TEST_MP_PUBLIC_KEY`) para você testar o fluxo na UI, ou prefere inserir manualmente no formulário?
