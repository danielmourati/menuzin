# Aviso de novo pedido no celular do lojista (push)

## O que muda para você
- O lojista ativa em Configurações > Pedidos e passa a receber no celular/computador "Novo pedido #1234 — R$ 45,00", mesmo com o painel fechado. Tocar abre a tela de Pedidos.
- Suas chaves de push serão guardadas no cofre seguro do projeto (você cola num formulário; nada fica no código).
- Não é preciso rodar comandos nem mexer em painel de banco de dados: aqui não existe esse painel, e eu faço o gatilho do pedido por dentro.

## Ponto de atenção
Hoje os avisos de cupons/promoções para clientes usam uma chave embutida. Ao trocar pelas suas chaves, as inscrições atuais dos clientes param de funcionar e eles precisam reativar (a loja reinscreve automaticamente quem já deu permissão, na próxima visita). Se preferir, uso suas chaves só para o aviso do lojista — mas o recomendado é uma chave só.

## Passos
1. Pedir `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` pelo formulário seguro; remover as chaves embutidas do código.
2. Inscrição do lojista: trocar a gravação direta pelo navegador (hoje bloqueada pela segurança) por uma função no servidor que confere se a pessoa é dona/admin da loja e salva o aparelho como "do lojista". A chave pública vem do servidor, então `VITE_VAPID_PUBLIC_KEY` não é necessária.
3. Disparo: rota interna `/api/public/order-push` protegida por token secreto gerado automaticamente; um gatilho no banco (ao inserir em pedidos) chama essa rota. Ela envia para os aparelhos do lojista daquela loja e apaga inscrições expiradas.
4. Remover a Edge Function `send-admin-push` (não é usada nesta arquitetura).
5. Garantir que avisos de campanha só vão para clientes (não para aparelhos do lojista).
6. Testar: ativar no painel, criar pedido de teste, conferir envio nos registros.

## Detalhes técnicos
- Migração: `push_subscriptions.is_admin_device` + `user_id` (se faltarem), extensão `pg_net`, trigger `AFTER INSERT ON orders` usando `net.http_post` para `https://menuzin.app/api/public/order-push` com header `x-push-token` lido do Vault.
- Secret `ORDER_PUSH_TOKEN` via generate_secret; mesma string no Vault.
- `sw.js`/`sw-push.js`: unificar para um único service worker que trata `push` e `notificationclick`.
