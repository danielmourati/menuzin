## Problema

O botão **Testar pagamento** em Admin → Pagamentos sempre dispara o toast `"Use o checkout público para testar pagamentos reais."` porque `testPayment()` em `src/lib/payment-service.ts` é um stub que retorna `success: false` fixo.

## Objetivo

Transformar o botão em um teste real ponta-a-ponta das credenciais do Mercado Pago salvas, sem precisar criar um pedido nem ir ao checkout público. O teste confirma:

1. As credenciais (public key + access token) são válidas.
2. O par está coerente com `mp_live_mode` / `mp_account_kind` (mesma validação já usada no checkout).
3. O gateway aceita criar uma cobrança (Pix R$ 1,00).
4. O pagamento é cancelado/expirado em seguida para não gerar movimentação real.

## Como funciona

### 1. Nova server function `testMpCredentials` em `src/lib/payments.functions.ts`
- Recebe `{ store_id }`, protegida por `requireSupabaseAuth` + verificação de propriedade da loja (mesmo padrão de `saveMpCredentials`).
- Lê `store_payment_settings` (access token, live mode, account kind).
- Aplica a mesma checagem de coerência mode × account kind — se falhar, retorna mensagem clara (ex.: "Token de produção com Modo Produção desligado. Reconecte com Usuário de Teste.").
- Chama `POST https://api.mercadopago.com/v1/payments` com:
  - `transaction_amount: 1.00`
  - `payment_method_id: "pix"`
  - `description: "Teste de credenciais Menuzin"`
  - `payer: { email: "test_user_…@testuser.com" }` (sandbox) ou e-mail genérico em produção
  - `X-Idempotency-Key` único
- Interpreta a resposta:
  - `201` + `status: pending` → sucesso. Em seguida chama `PUT /v1/payments/{id}` com `status: "cancelled"` (best-effort, erro silencioso) para não deixar Pix pendente.
  - `401` / `"Unauthorized use of live credentials"` → mensagem específica orientando reconectar credenciais coerentes.
  - Outros erros → repassa `message` do MP.
- Retorna `{ success, message, payment_id?, account_kind, live_mode }`.

### 2. Atualizar `testPayment` em `src/lib/payment-service.ts`
- Substituir o stub por wrapper que chama `testMpCredentials({ data: { store_id } })`.
- Recebe `storeId` (já é passado pelo componente) e propaga o resultado.

### 3. UI em `MercadoPagoStatus.tsx` / `admin.configuracoes.pagamentos.tsx`
- Nenhuma mudança estrutural; o handler `handleTestPay` já mostra `toast.success`/`toast.error` com a `message`.
- Adicionar pequeno hint abaixo do botão: "Cria uma cobrança Pix de R$ 1,00 que é cancelada automaticamente após validação."
- Enquanto o request está em voo, desabilitar o botão e mostrar spinner (estado local `testing`).

### 4. Tratamento de modo Live
- Em modo Live, criar mesmo assim o Pix de R$ 1,00 e cancelar — Mercado Pago permite cancelar Pix `pending`. Se o cancelamento falhar, exibir aviso: "Teste OK, mas houve uma cobrança Pix de R$ 1,00 pendente — cancele em sua conta MP."

## Arquivos alterados

- `src/lib/payments.functions.ts` — nova `testMpCredentials` server fn.
- `src/lib/payment-service.ts` — `testPayment` passa a chamar a server fn real.
- `src/components/payment/MercadoPagoStatus.tsx` — hint + estado de loading no botão.

Sem migração de banco. Sem novas dependências.

## Validação

1. Loja em modo teste com Usuário de Teste correto → toast verde "Credenciais válidas. Pagamento de teste criado e cancelado (id: …)".
2. Loja em modo teste com token de produção → toast vermelho específico orientando reconectar.
3. Loja sem MP conectado → toast vermelho "Conecte o Mercado Pago primeiro" (já coberto antes da chamada).
