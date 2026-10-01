# Corrigir "Chave VAPID pública não configurada" ao ativar avisos no painel

## Causa
O botão **Ativar** (Configurações > Pedidos > Notificações em Segundo Plano) procura a chave de notificação numa configuração pública do site (`VITE_VAPID_PUBLIC_KEY`) que não existe. A chave está guardada só no cofre do servidor, então o botão sempre falha.

Achei mais dois problemas no mesmo botão, que fariam ele falhar logo depois:
- Ele tenta gravar a inscrição do celular direto no banco, mas desde a correção de segurança anterior só o servidor pode gravar inscrições — seria recusado.
- Ele registra um arquivo de avisos diferente (`/sw.js`) do usado pelas campanhas (`/sw-push.js`), o que pode fazer os avisos não aparecerem.

## Mudanças
1. **Ler a chave pelo servidor:** o botão passa a pedir a chave ao servidor (`getVapidPublicKey`, a mesma usada pela loja para os clientes). Nada a configurar.
2. **Gravar pelo servidor:** criar `subscribeAdminPush` em `push-campaigns.functions.ts`, protegido por login, que confere se a pessoa é dono/admin da loja e usa o `saveAdminPushSubscriptionServer` já existente.
3. **Mesmo arquivo de avisos:** registrar `/sw-push.js` com escopo `/` e reaproveitar a inscrição já existente do navegador.
4. Mensagens de erro claras se o servidor não tiver a chave.

## Verificação
- Typecheck limpo.
- Abrir Configurações > Pedidos logado e confirmar que o erro some (o pedido de permissão em si só funciona no site publicado, fora da prévia).
- Depois de publicar: ativar no celular, fazer um pedido de teste e conferir o aviso.

## Notas técnicas
- Arquivos: `src/hooks/useWebPush.ts`, `src/lib/push-campaigns.functions.ts`.
- Sem mudança de banco.
