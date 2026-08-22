# Auditoria de credenciais sensíveis (Mercado Pago, criptografia e QZ Tray)

## O que verifiquei

Mapeei todas as leituras de variáveis de ambiente sensíveis no código (app TanStack + Edge Functions antigas) e comparei com os segredos hoje configurados no projeto:
`MENUZIN_MP_ACCESS_TOKEN`, `MP_CLIENT_ID`, `MP_CLIENT_SECRET`, `PAYMENT_ENCRYPTION_KEY`, `QZ_CERT_PEM`, `QZ_PRIVATE_KEY_PEM`.

### Está correto hoje (caminho ativo do app)

- `src/lib/mp-oauth.server.ts` e `src/lib/payments.functions.ts` leem `MP_CLIENT_ID` / `MP_CLIENT_SECRET` dentro dos handlers, com validação de Client ID numérico.
- `src/lib/menuzin-mp.server.ts` lê `MENUZIN_MP_ACCESS_TOKEN` (PIX das assinaturas/destaques).
- `src/lib/payment-crypto.ts` usa `PAYMENT_ENCRYPTION_KEY` (AES-GCM, formato `iv.ciphertext`) — é o formato que grava e lê os tokens do lojista.
- Impressão: `src/lib/qz-config.server.ts`, `/api/public/qz` e `/api/public/qz-cert.crt` leem `QZ_CERT_PEM` / `QZ_PRIVATE_KEY_PEM`, validam o par cert/chave, bloqueiam o certificado demo e exigem sessão autenticada para assinar. O cliente (`src/lib/qz-tray.ts`) aponta para essas rotas.

### Divergências encontradas

1. **Edge Functions de pagamento apontam para um segredo que não existe.**
   `mp-oauth-callback`, `mp-save-credentials`, `mercado-pago-webhook` e `create-transparent-payment` leem `TOKEN_ENCRYPTION_KEY` — esse nome **não está** entre os segredos do projeto (o correto é `PAYMENT_ENCRYPTION_KEY`). Além disso, elas usam um esquema de criptografia diferente (chave hex crua + `iv+ct` em base64 único), **incompatível** com o que o app grava/lê. Se alguma delas rodar, grava tokens que o app não consegue descriptografar.
2. **URLs de OAuth defasadas nessas mesmas funções**: `MP_REDIRECT_URI` e `APP_ADMIN_URL` não existem nos segredos, então caem no fallback `https://foodcatalogo.app/...` (domínio antigo). O fluxo válido hoje é `/api/public/mp-oauth-callback` em `menuzin.app`.
3. **Endpoint de assinatura QZ duplicado e sem autenticação**: `src/lib/qz-sign.functions.ts` (`signQzRequest`) assina qualquer payload com a chave privada, sem exigir sessão. Nenhum componente o utiliza (todos usam `/api/public/qz`, que é autenticado), mas ele continua exposto como endpoint.

## Plano de correção

1. **Remover as Edge Functions legadas de pagamento** (`mp-oauth-callback`, `mp-connect-start`, `mp-save-credentials`, `mercado-pago-webhook`, `create-transparent-payment`), já substituídas pelas rotas/server functions do app (`/api/public/mp-oauth-callback`, `/api/public/menuzin-mp-webhook`, `payments.functions.ts`). Isso elimina de uma vez o `TOKEN_ENCRYPTION_KEY` fantasma e os fallbacks para `foodcatalogo.app`.
   - Alternativa, se você preferir mantê-las como backup: trocar `TOKEN_ENCRYPTION_KEY` por `PAYMENT_ENCRYPTION_KEY`, alinhar o algoritmo ao `payment-crypto.ts` e corrigir as URLs de redirect/admin.
2. **Remover `src/lib/qz-sign.functions.ts`** (código morto) para que a assinatura QZ exista somente na rota autenticada `/api/public/qz`. A Edge Function `qz-sign` fica como está (é backup autenticado e usa os mesmos segredos corretos).
3. **Limpar `.env.example`**, que ainda documenta `TEST_MP_PUBLIC_KEY`, `TEST_MP_ACCESS_TOKEN` e `TOKEN_ENCRYPTION_KEY` — nomes que não existem mais.
4. **Checagem final**: rodar uma verificação automática de que nenhum nome de variável sensível referenciado no código está fora da lista de segredos configurados, e confirmar via diagnóstico da impressora que o par QZ segue válido.

## Observações técnicas

- Nenhuma chave nova precisa ser cadastrada: os segredos atuais cobrem todos os caminhos ativos.
- `PAYMENT_ENCRYPTION_KEY` não deve ser rotacionada sem plano de migração — tokens de Mercado Pago já gravados ficariam ilegíveis e os lojistas precisariam reconectar.
- Os segredos `SUPABASE_PUBLISHABLE_KEYS` / `SUPABASE_SECRET_KEYS` (no plural) não são lidos pelo código; o runtime injeta as versões no singular automaticamente. Sem ação.
