# Conexão automática com Mercado Pago (OAuth)

Hoje o lojista precisa copiar Public Key e Access Token manualmente na aba **Configurações → Pagamentos**. A proposta é adicionar o botão **"Conectar minha conta Mercado Pago"**: o lojista autoriza direto na conta dele e o token chega criptografado no servidor, sem copiar nenhuma chave. O modo manual continua disponível como alternativa.

## Como fica para o lojista

1. Em Pagamentos, ele vê o card "Mercado Pago Checkout" com duas opções: **Conexão Automática (OAuth)** (destaque) e **Credenciais manuais** (recolhida).
2. Clica em "Conectar minha conta Mercado Pago" → abre a tela de autorização do Mercado Pago em popup.
3. Autoriza → volta para a aba de Pagamentos já com status **Conectado**, mostrando a conta MP (#id, produção ou teste) e a data da conexão.
4. Pix e cartão online passam a ficar disponíveis no checkout da loja.
5. Botão **Desconectar** revoga a ligação e limpa os tokens.

## O que precisa do usuário (pré-requisito)

Para o OAuth funcionar é preciso criar uma **aplicação** no painel de desenvolvedores do Mercado Pago (uma só, da plataforma Menuzin) e informar duas credenciais que serão guardadas como segredos: `MP_CLIENT_ID` e `MP_CLIENT_SECRET`. Na mesma aplicação deve ser cadastrada a URL de retorno:

```text
https://menuzin.app/api/public/mp-oauth-callback
```

Vou pedir esses valores pelo formulário seguro de segredos na hora da implementação.

## Escopo técnico

**Segredos**: `MP_CLIENT_ID`, `MP_CLIENT_SECRET`, `MP_OAUTH_REDIRECT_URI` (opcional; default derivado do domínio publicado). Reaproveita `PAYMENT_ENCRYPTION_KEY` já existente.

**Banco** (`store_payment_settings`): usar as colunas que já existem (`mp_user_id`, `mp_public_key`, `mp_access_token_encrypted`, `mp_refresh_token_encrypted`, `mp_token_expires_at`, `mp_connected`, `mp_live_mode`, `mp_account_kind`) e adicionar `mp_connection_method text` (`'oauth' | 'manual'`) para a UI mostrar como foi conectado. Grants/RLS iguais aos atuais; o token continua legível só pelo servidor.

**Servidor** (`src/lib/payments.functions.ts` + novo `src/lib/mp-oauth.server.ts`):
- `startMpOAuth` (server fn autenticada): resolve o tenant, gera `state` assinado (HMAC com `PAYMENT_ENCRYPTION_KEY`, contendo tenant_id + nonce + expiração de 10 min, gravado em tabela `mp_oauth_states` de uso único) e devolve a URL de autorização.
- Rota pública `src/routes/api.public.mp-oauth-callback.ts`: valida e consome o `state`, troca `code` por token em `POST https://api.mercadopago.com/oauth/token`, consulta `/users/me` para public key/tipo de conta, criptografa access e refresh token com o helper AES-GCM já existente, faz upsert em `store_payment_settings` (`mp_connected=true`, método `oauth`) e devolve uma página mínima que avisa o opener e fecha o popup.
- `refreshMpToken` no `mp-oauth.server.ts`: quando `mp_token_expires_at` estiver a menos de 10 min do vencimento, renova via `grant_type=refresh_token` antes de qualquer cobrança. Chamado dentro do trecho que hoje faz `decryptToken(settings.mp_access_token_encrypted)` em `createTransparentPayment`, `getPaymentStatus` e `testMpCredentials`.
- `disconnectMercadoPago`: além de limpar os campos, chama a revogação OAuth quando o método for `oauth`.

**Frontend** (`src/routes/admin.configuracoes.pagamentos.tsx` + `src/lib/payment-service.ts`):
- `connectMercadoPago` deixa de lançar erro e passa a chamar `startMpOAuth`; o clique abre o popup e aguarda a mensagem same-origin de conclusão, depois refaz o fetch das configurações.
- Card reorganizado conforme a referência: bloco OAuth em destaque com o botão azul, texto explicativo, e as credenciais manuais como opção secundária/accordion.
- Estado conectado mostra badge de conta, método (Automática/Manual) e botão Desconectar.

**Fora de escopo**: split de pagamento, marketplace fee, e mudanças no checkout do cliente final (o fluxo de Pix/cartão já existente continua igual, só passa a usar o token obtido via OAuth).
