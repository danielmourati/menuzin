# Auditoria das rotas `/api/public/*` e dos webhooks do Mercado Pago

## Situação atual (verificada no código)

| Rota | Função | Estado |
| --- | --- | --- |
| `/api/public/qz` | Certificado + assinatura QZ Tray | OK — exige Bearer válido para assinar |
| `/api/public/qz-cert.crt` | Cert público em PEM | OK — só dado público |
| `/api/public/mp-oauth-callback` | Retorno do OAuth do lojista | OK — `state` de uso único com expiração, `postMessage` restrito ao próprio origin |
| `/api/public/menuzin-mp-webhook` | Mensalidades/destaques da plataforma | Funciona, mas **sem validação de assinatura** |
| `/api/public/guia-click` | Analytics de clique no Guia | Funciona, mas **aberto e sem CORS na resposta** |

## Problemas encontrados

1. **Webhook de mensalidades sem verificação de origem.** `/api/public/menuzin-mp-webhook` aceita qualquer POST. Hoje o risco é contido porque a rota reconsulta o pagamento na API do Mercado Pago antes de aprovar (a fonte da verdade é o MP, não o corpo do POST), mas qualquer pessoa pode disparar consultas em massa contra a nossa conta MP. Falta a validação do header `x-signature` (HMAC do MP).

2. **Pagamentos de pedidos dos lojistas não têm webhook — só polling no navegador.** Em `src/lib/payments.functions.ts` o PIX/cartão é criado sem `notification_url`, e a confirmação depende de `pollPaymentStatus` rodando na tela do cliente (`PixCheckout.tsx`). Se o cliente fecha o navegador ou perde conexão depois de pagar, o pedido fica "pendente" para sempre no painel do lojista. Só a assinatura da plataforma tem `notification_url` configurada.

3. **`/api/public/guia-click` sem barreiras.** Grava em `directory_clicks` com service role, aceitando qualquer `product_id` de qualquer origem, sem validar formato UUID nem limitar volume — dá para inflar as métricas de destaque de qualquer loja. Além disso, o `POST` responde sem cabeçalhos CORS (só o `OPTIONS` os envia), então chamadas cross-origin acusam erro no navegador mesmo tendo sido gravadas.

4. **URL base de notificação defasada.** O fallback usado para montar a `notification_url` é `https://menuzin.lovable.app`, e não a URL estável do projeto/domínio publicado.

## Plano

1. **Assinar o webhook de mensalidades.** Validar o header `x-signature`/`x-request-id` conforme o padrão do Mercado Pago (HMAC-SHA256 sobre `id`+`request-id`+`ts`, comparação timing-safe) usando um novo segredo `MP_WEBHOOK_SECRET`, retornando 401 quando inválido. O segredo é gerado no painel do Mercado Pago ao cadastrar a URL de notificação — vou pedir por formulário seguro no momento certo. Enquanto ele não existir, a rota continua funcionando como hoje (fail-open com log), para não interromper cobranças em produção.

2. **Criar `/api/public/mp-order-webhook` para pedidos dos lojistas.** Passa a receber as notificações dos pagamentos criados com o token do próprio lojista:
   - `payments.functions.ts` passa a enviar `notification_url` apontando para essa rota, com o `tenant_id` na query.
   - O handler reconsulta o pagamento na API do MP usando o token daquele lojista, resolve o pedido pelo `external_reference` (id do pedido) e atualiza `payments`/`orders` com a mesma lógica já usada no polling.
   - O polling do `PixCheckout` continua como caminho rápido de UX; o webhook vira a garantia de consistência.

3. **Endurecer `/api/public/guia-click`.** Validar `product_id` como UUID, devolver os cabeçalhos CORS também no `POST`, e aplicar um limite simples por IP/produto (janela curta) para evitar inflar cliques. Sem mudar o comportamento fire-and-forget nem o schema.

4. **Corrigir a URL base das notificações** para usar a URL publicada/estável do projeto em vez de `menuzin.lovable.app`.

## Observações técnicas

- Nada aqui muda RLS: as gravações continuam server-side via service role, conforme a regra do projeto de nunca abrir INSERT anônimo em `orders`/`payments`.
- Todo webhook responde 200 mesmo em erro de processamento (após validar a assinatura), para o Mercado Pago não entrar em loop de reentrega; falhas ficam em log.
- Depois de publicar, a URL de notificação precisa ser cadastrada no painel do Mercado Pago da plataforma (mensalidades). Para os lojistas, a URL vai embutida em cada pagamento, sem configuração manual.
