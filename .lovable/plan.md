# Corrigir falhas no disparo de notificações push

## Diagnóstico

Na hora de enviar as notificações de uma campanha, o código usa uma variável chamada `payloadStr` que nunca foi definida. Resultado: **todo** envio quebra antes de chegar ao navegador do cliente, e cada assinatura é contada como "recusada pelo servidor de push" — daí a mensagem "3 assinatura(s) foram recusadas". As assinaturas dos clientes provavelmente estão boas; o problema está no nosso envio.

O typecheck atual confirma o erro (`Cannot find name 'payloadStr'`) junto de outros dois erros relacionados na mesma área.

## Mudanças

### 1. Corrigir o envio (`src/lib/push-notifications.server.ts`)

- Serializar o conteúdo da notificação com `JSON.stringify(pushPayload)` no lugar da variável inexistente.
- Incluir o cupom da campanha (`coupon`) no conteúdo enviado, já que a notificação no navegador tem botão "Ver Cupom" preparado para isso e hoje nunca é usado.
- Garantir que a contagem de sucesso/falha reflita o envio real e que assinaturas mortas (erros 404/410) continuem sendo removidas automaticamente.

### 2. Corrigir os erros de typecheck na mesma área

- `src/lib/push-campaigns.functions.ts`: remover o `success` duplicado no retorno do disparo (TS2783).
- `src/routes/admin.notificacoes.tsx`: tratar o caso de `statsData` indefinido (TS18048).

### 3. Verificação

- Rodar o typecheck/build até zerar esses erros.
- Teste manual: criar uma campanha de teste para um tenant com assinatura ativa e confirmar que o relatório mostra envio com sucesso (ou, em caso de falha real, que o motivo correto aparece).

## Notas técnicas

- As chaves VAPID seguem com o fallback embutido quando `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` não estão definidas — o navegador e o servidor leem a mesma fonte (`getVapidPublicKeyServer`), então não há risco de divergência de chave; não é preciso configurar nada.
- Nenhuma mudança de banco de dados. Assinaturas removidas indevidamente não existem: só 404/410 são excluídas, comportamento correto.
