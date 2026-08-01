# Resolver o erro "O aplicativo não está pronto para se conectar a Mercado Pago"

Essa tela é exibida pelo próprio Mercado Pago **antes** de pedir a autorização do lojista. Ela não vem do Menuzin: significa que a aplicação identificada pelo `client_id` enviado não está habilitada para OAuth no painel de desenvolvedores do Mercado Pago, ou que a URL de retorno enviada não é exatamente uma das cadastradas na aplicação.

Como não tenho acesso ao painel do Mercado Pago nem ao valor dos segredos, o plano tem duas frentes: (1) checklist de configuração que só você pode conferir e (2) ajustes no código para diagnosticar e evitar as causas mais comuns.

## 1. Checklist no painel do Mercado Pago (você)

Na aplicação Menuzin em Suas integrações → Suas aplicações:

1. **Solução de integração**: precisa ser "Pagamentos online" com o modelo **Marketplace / Plataforma de terceiros**. Aplicações criadas como "CheckoutPro simples" não liberam OAuth e geram exatamente esta tela.
2. **URLs de redirecionamento (OAuth)**: cadastrar exatamente, sem barra final e sem query:
   ```text
   https://menuzin.app/api/public/mp-oauth-callback
   ```
3. **Client ID**: confirmar que o valor salvo em `MP_CLIENT_ID` é o **Client ID / Application ID** da aplicação (numérico), e não o Public Key nem o Access Token.
4. A aplicação deve estar em uma conta **de produção** (não conta de teste) e com os dados do negócio preenchidos.

## 2. Ajustes que eu implemento

1. **Diagnóstico visível**: hoje, se algo estiver errado, o lojista só vê a tela amarela do Mercado Pago. Vou registrar no log do servidor (e mostrar no painel, em modo desenvolvedor) a URL de autorização gerada — com `client_id` e `redirect_uri` — para conferência imediata contra o cadastro da aplicação.
2. **Validação do formato do Client ID**: se `MP_CLIENT_ID` não parecer um Application ID válido (ex.: contiver `APP_USR-` ou `TEST-`), a conexão automática é bloqueada com a mensagem "Credenciais da plataforma inválidas: informe o Client ID da aplicação" em vez de abrir o pop-up e cair na tela de erro.
3. **URL de autorização**: usar o host global `https://auth.mercadopago.com/authorization` (em vez do `.com.br`), que é o recomendado atualmente e faz o roteamento por país; manter `response_type=code`, `platform_id=mp`, `state` e `redirect_uri`.
4. **Ambiente de preview**: permitir que a URL de retorno seja sobrescrita por `MP_OAUTH_REDIRECT_URI`, para você poder testar no domínio de preview cadastrando também aquela URL na aplicação — hoje o retorno é fixo em `menuzin.app`.
5. **Página de teste do retorno**: melhorar as mensagens de erro do callback (`state` inválido/expirado, falha na troca do código) para identificar em qual etapa parou.

## 3. Verificação

Depois dos ajustes e do checklist: clicar em "Conectar minha conta Mercado Pago" em um tenant Pro, conferir no log a URL gerada, concluir a autorização e validar o status "Conectado (Automática)" com Pix/cartão liberados no checkout.

## Detalhes técnicos

- `src/lib/mp-oauth.server.ts`: `buildAuthorizationUrl` passa a usar `https://auth.mercadopago.com/authorization`; nova validação de formato em `getMpOAuthConfig`; `resolveRedirectUri` mantém `MP_OAUTH_REDIRECT_URI` como override documentado.
- `src/lib/payments.functions.ts`: `startMpOAuth` loga a URL gerada (sem segredos) e retorna também `redirect_uri` para exibição no painel.
- `src/routes/admin.configuracoes.pagamentos.tsx` / `src/components/payment/MercadoPagoStatus.tsx`: bloco discreto "URL de retorno esperada" para conferência do lojista/suporte.
- `src/routes/api.public.mp-oauth-callback.ts`: mensagens de erro por etapa.
- Sem migrações e sem alteração no fluxo de Credenciais Manuais.
