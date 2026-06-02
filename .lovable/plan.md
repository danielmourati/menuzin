# Corrigir erro "Unauthorized use of live credentials" no checkout

## Causa raiz

O Mercado Pago retorna `Unauthorized use of live credentials` quando há mistura entre o "mundo" das credenciais e o "mundo" do que está sendo pago. No banco atual:

- `tenant = burgerprime`
- `mp_live_mode = false` (marcada como teste)
- `mp_public_key = APP_USR-551bdd1…`
- `mp_user_id = 1844984812`

O par foi validado contra `/users/me`, então **public key e access token pertencem à mesma conta MP**. Mas o prefixo `APP_USR-` no MP hoje é usado por **dois tipos** de credenciais:

1. Credenciais de **Produção** da sua conta real de vendedor.
2. Credenciais de **um Usuário de Teste** (criado em Suas integrações → Contas de teste).

O que **não** é teste de verdade: pegar a "Credencial de Produção" da sua conta real e marcar `mp_live_mode=false` no app. O MP detecta que o token é de produção e, ao receber um cartão de teste (`APRO`, `OTHE`, `5031 4332 1540 6351`), bloqueia com exatamente essa mensagem. Não aparece nada para autorizar no painel porque o pagamento é rejeitado **antes** de ser criado.

Sua conta `mp_user_id=1844984812` é a conta real, não um usuário de teste — daí o erro.

## Solução em duas frentes

### Frente A — Acertar as credenciais (ação do usuário, sem código)

Caminho recomendado para sandbox real:

1. No painel MP da conta vendedora real → **Suas integrações → (sua aplicação) → Contas de teste** → criar **dois usuários de teste**: um "vendedor de teste" e um "comprador de teste" (BR / BRL).
2. Logar no MP com o e-mail do **vendedor de teste**, ir em **Credenciais** dele e copiar `Public Key` + `Access Token`. Esses são os que devem ser salvos em Admin → Pagamentos com o switch **Modo teste** ligado.
3. Pagar no checkout usando o **e-mail do comprador de teste** como `payer.email` e cartões de teste (`5031 4332 1540 6351`, CVV `123`, validade `11/30`, titular `APRO` para aprovar / `OTHE` para recusar).

Alternativa rápida: usar diretamente o par que já está no `.env` (`TEST_MP_PUBLIC_KEY` / `TEST_MP_ACCESS_TOKEN`) e `TEST_MP_BUYER_EMAIL` como payer — esse par já é de um usuário de teste pronto.

### Frente B — Endurecer o app para impedir o erro silencioso (código)

Hoje `saveMpCredentials` só checa que o token responde em `/users/me`, mas não detecta se o usuário marcou "modo teste" usando credenciais de produção. Vamos:

1. **`src/lib/payments.functions.ts` → `saveMpCredentials`**
   - Após `/users/me`, fazer também `GET https://api.mercadopago.com/users/test_user` *(probe leve)* ou usar o campo `site_status` / `tags` da resposta de `/users/me` para detectar se o `user_id` retornado pertence a um **usuário de teste**. Critério prático: a resposta de `/users/me` para test users traz `tags` contendo `"test_user"`.
   - Se `data.mp_live_mode === false` e o token **não** é de um test user → bloquear com mensagem clara:
     > "As credenciais informadas são de Produção, mas o Modo Teste está ativado. Crie um Usuário de Teste no painel do Mercado Pago e use as credenciais dele, ou desligue o Modo Teste para aceitar pagamentos reais."
   - Caso oposto (live=true mas token é de test user) → bloquear igualmente com mensagem espelhada.
   - Persistir um campo `mp_account_kind: 'test_user' | 'production'` (text, nullable) em `store_payment_settings` para exibir no UI.

2. **Migração SQL** — adicionar coluna `mp_account_kind text` em `store_payment_settings` (nullable). Sem GRANT novo (tabela já existente).

3. **`src/components/payment/MercadoPagoStatus.tsx`**
   - Mostrar um banner informativo abaixo do campo "Modo teste" explicando a diferença entre credenciais de produção e usuário de teste, com link `https://www.mercadopago.com.br/developers/panel/test-users`.
   - Exibir `mp_account_kind` ao lado do `mp_user_id` (`"Conta: Usuário de teste #...”` ou `"Conta: Produção #...”`).

4. **`src/lib/payments.functions.ts` → `createTransparentPayment`**
   - Antes de chamar `POST /v1/payments`, validar coerência: se `settings.mp_live_mode === false` e `mp_account_kind === 'production'`, retornar erro 400 amigável:
     > "Esta loja está em Modo Teste com credenciais de Produção — o Mercado Pago rejeitará o pagamento. Reconecte com credenciais de Usuário de Teste em Admin → Pagamentos."
   - Mesma checagem inversa para live + test_user.
   - Garantir que `payer.email` em modo teste seja sempre um e-mail `@testuser.com` (avisar no log se não for; o MP costuma rejeitar test users pagando com e-mail real).

5. **`src/components/payment/CardCheckout.tsx`**
   - Quando `onSubmit` capturar erro do gateway com a string `Unauthorized use of live credentials` (ou status MP `cc_rejected_high_risk` com esse detail), exibir mensagem orientada:
     > "Credenciais incompatíveis com cartão de teste. Verifique em Admin → Pagamentos se você usou as credenciais de um Usuário de Teste do MP."

## Detalhes técnicos

- A detecção de "test user" via `/users/me` é confiável: a resposta inclui `tags: ["test_user", ...]` quando o token pertence a um usuário de teste criado pela API de test users.
- A coluna `mp_account_kind` será preenchida na próxima validação (em `saveMpCredentials`). Para o registro já existente, basta reconectar — não precisa backfill.
- Nada disso muda o webhook nem o polling existentes.

## Arquivos a alterar

- `supabase/migrations/<timestamp>_add_mp_account_kind.sql` (novo)
- `src/lib/payments.functions.ts` (saveMpCredentials, createTransparentPayment, toSafe)
- `src/lib/payment-types.ts` (adicionar `mp_account_kind` ao `StorePaymentSettingsSafe`)
- `src/components/payment/MercadoPagoStatus.tsx` (UI informativa)
- `src/components/payment/CardCheckout.tsx` (mensagem de erro mais útil)

## Teste de aceitação

1. Reconectar `burgerprime` usando o par `TEST_MP_PUBLIC_KEY` / `TEST_MP_ACCESS_TOKEN` do `.env`, modo teste **ON**. UI deve mostrar "Conta: Usuário de teste #…".
2. Pagar um pedido com cartão `5031 4332 1540 6351`, titular `APRO`, e-mail do payer = `TEST_MP_BUYER_EMAIL` → status do pedido vai para `approved`.
3. Repetir com titular `OTHE` → `rejected` com mensagem amigável.
4. Tentar salvar credenciais de produção com modo teste ligado → form bloqueia com mensagem clara, sem encostar no checkout.
