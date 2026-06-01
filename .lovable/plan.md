# Teste end-to-end: pedido do cliente até o admin

Objetivo: validar manualmente que um pedido feito na loja aparece no painel `/admin/pedidos` do estabelecimento certo, com itens, total, pagamento e status corretos.

## Pré-requisitos

1. Loja ativa em `tenants` (ex.: Bora Burger, slug `boraburger`).
2. Pelo menos 1 categoria + 1 produto disponível.
3. Usuário com papel `owner` ou `admin` vinculado ao `tenant_id` dessa loja em `user_roles`.
4. (Opcional) Pagamentos configurados em `/admin/configuracoes/pagamentos` — para este teste pode ficar só com "Dinheiro" / "PIX manual" habilitados, sem MP.

## Roteiro de teste (2 abas)

### Aba A — Admin do estabelecimento
1. Login em `/admin/login` com o usuário owner da loja.
2. Abrir `/admin/pedidos` e deixar visível.
3. Anotar quantos pedidos existem hoje (baseline).

### Aba B — Cliente (anônima/privada)
1. Abrir `/loja/{slug}` (ex.: `/loja/boraburger`) em janela anônima.
2. Adicionar 1–2 produtos ao carrinho.
3. Ir ao checkout, preencher nome, WhatsApp e:
   - Modo: Delivery (com endereço) **ou** Retirada **ou** Mesa.
   - Pagamento: Dinheiro (com troco) — caminho mais simples.
4. Confirmar pedido → deve redirecionar para `/loja/{slug}/pedido-confirmado` com o número do pedido.
5. Copiar o ID do pedido e abrir `/loja/{slug}/acompanhar/{orderId}` para validar a visão do cliente.

### Verificação no admin (Aba A)
1. Recarregar `/admin/pedidos` (ou aguardar refresh automático, se houver).
2. Confirmar que o novo pedido apareceu com:
   - Número sequencial, nome do cliente, WhatsApp.
   - Itens corretos (nome, qtd, preço, addons).
   - Subtotal + taxa de entrega = total.
   - Forma de pagamento e modo (delivery/retirada/mesa).
   - Status inicial = `novo`.
3. Transicionar status: `novo → aceito → em preparo → pronto → finalizado` e verificar:
   - Histórico em `order_status_history`.
   - Página `/acompanhar/{orderId}` reflete o novo status na aba B.

## Checagens diretas no banco (opcional, mais rápido para diagnosticar)

Executáveis via SQL read-only:

```sql
-- Último pedido da loja
select id, number, customer_name, status, payment_status, total, created_at
from orders where tenant_id = '<TENANT_ID>'
order by created_at desc limit 5;

-- Itens do pedido
select name_snapshot, qty, unit_price, addons
from order_items where order_id = '<ORDER_ID>';

-- Histórico de status
select previous_status, new_status, changed_by_name, created_at
from order_status_history where order_id = '<ORDER_ID>' order by created_at;
```

## Cenários a cobrir

| Cenário | Modo | Pagamento | O que valida |
|---|---|---|---|
| 1 | Delivery | Dinheiro com troco | Endereço + `change_for` salvos |
| 2 | Retirada | PIX manual | `pickup_time`, chave PIX exibida |
| 3 | Mesa | Cartão na entrega | `table_label` salvo |
| 4 | Delivery | (com MP configurado) | Fluxo será coberto depois do checkout transparente |

## Pontos de atenção identificados

- **Sem realtime**: o painel `/admin/pedidos` provavelmente não atualiza sozinho (não há subscription em `postgres_changes`). Para o teste manual, recarregar a página. Se quiser, em build mode podemos adicionar realtime na tabela `orders` para o admin ver o pedido cair instantaneamente.
- **Permissões RLS**: o admin só vê pedidos do seu `tenant_id`. Se o pedido não aparecer, conferir se o `tenant_id` do `orders` bate com o `tenant_id` do `user_roles` do admin logado.
- **Som/notificação**: hoje não existe — opcional adicionar depois.

## Próximo passo sugerido

Após validar o roteiro acima, decidir se quer que eu, em build mode:
1. Adicione realtime ao `/admin/pedidos` (subscription em `orders`).
2. Adicione notificação sonora + badge no menu lateral quando entrar pedido novo.
3. Siga para implementar OAuth do Mercado Pago e o checkout transparente.
