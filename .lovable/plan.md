# Ativar a conexão automática (OAuth) do Mercado Pago para os lojistas

O fluxo já está construído: o lojista clica em "Conectar minha conta Mercado Pago", autoriza na conta dele e volta conectado, com os tokens guardados criptografados no servidor e renovados automaticamente. Falta apenas o único item que ainda impede o botão de funcionar de verdade: as credenciais da aplicação Menuzin no painel de desenvolvedores do Mercado Pago.

Importante: essas credenciais são da **plataforma** (a "porta de entrada" do OAuth). Elas não conectam nenhuma conta — cada lojista continua conectando a conta dele próprio, e é o token do lojista que recebe os pagamentos.

## O que você precisa fazer (uma vez só)

1. Acessar o painel de desenvolvedores do Mercado Pago e criar (ou reaproveitar) uma aplicação da plataforma Menuzin.
2. Nessa aplicação, cadastrar a URL de retorno exatamente assim:

```text
https://menuzin.app/api/public/mp-oauth-callback
```

3. Copiar o **Client ID** e o **Client Secret**. Vou pedir os dois por um formulário seguro de segredos (`MP_CLIENT_ID` e `MP_CLIENT_SECRET`) na hora de implementar.

## O que eu implemento

1. **Guarda de disponibilidade**: enquanto as credenciais não estiverem cadastradas, o botão de conexão automática aparece desabilitado com o aviso "Conexão automática ainda não habilitada — use Credenciais Manuais", em vez de abrir o pop-up e falhar com erro técnico.
2. **Domínio de retorno**: fixar o retorno no domínio publicado (`menuzin.app`) para bater com o cadastro da aplicação, inclusive quando o lojista abrir o painel por outro endereço.
3. **Teste de ponta a ponta** após o cadastro dos segredos: iniciar a autorização, validar o retorno, conferir que a loja fica com status "Conectado (Automática)" e que Pix/cartão online ficam disponíveis no checkout.
4. **Desconectar**: confirmar que o botão limpa os tokens e volta a loja para o modo sem pagamento online.

## Detalhes técnicos

- Segredos novos: `MP_CLIENT_ID`, `MP_CLIENT_SECRET` (opcional `MP_OAUTH_REDIRECT_URI` caso queira sobrescrever a URL de retorno).
- Nova função de servidor `getMpOAuthAvailability` em `src/lib/payments.functions.ts`, retornando `{ available: boolean }` a partir da presença dos dois segredos (lidos dentro do handler).
- `src/routes/admin.configuracoes.pagamentos.tsx` consulta essa flag no carregamento e repassa para `src/components/payment/MercadoPagoStatus.tsx` desabilitar o botão OAuth e mostrar o aviso.
- `resolveRedirectUri` em `src/lib/mp-oauth.server.ts` passa a priorizar o domínio publicado em vez do origin da requisição, evitando mismatch de `redirect_uri`.
- Sem migrações: as colunas (`mp_refresh_token_encrypted`, `mp_token_expires_at`, `mp_connection_method`) e a tabela `mp_oauth_states` já existem.
- A aba "Credenciais Manuais" continua intacta como alternativa; lojas já conectadas manualmente não são afetadas.
