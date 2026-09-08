# Aceite automático com impressão na hora

Hoje todo pedido novo espera alguém clicar em "Aceitar" para entrar em preparo e imprimir a comanda. A ideia é replicar o comportamento do iFood/aiqfome: assim que o pedido chega, ele já é aprovado e a comanda sai na impressora da cozinha sozinha.

## Como vai funcionar

- Novo botão liga/desliga **"Aceite automático de pedidos"** em Configurações > Impressora, junto das opções da impressora da cozinha.
- Com a opção ligada, todo pedido novo que chegar (qualquer forma de pagamento) passa automaticamente para "Em preparo" e a comanda da cozinha é impressa na hora.
- O som de alerta e o aviso na tela continuam aparecendo, mas o aviso passa a dizer "Pedido aceito automaticamente" com atalho para ver os detalhes, em vez do botão "Aceitar".
- Se a impressora estiver desligada ou o QZ Tray fechado, o pedido é aceito do mesmo jeito e aparece um aviso de falha na impressão com a opção de reimprimir a comanda.
- O histórico do pedido registra que ele foi aceito automaticamente, para ficar claro quem/como aprovou.
- Função exclusiva do plano Pro. Nos demais planos a opção aparece bloqueada com o selo de upgrade, igual à impressão automática atual.
- Enquanto ninguém estiver com o painel de pedidos aberto, nada é aceito nem impresso; ao abrir o painel, os pedidos ainda pendentes são aceitos e impressos em sequência (a impressão depende do computador com a impressora ligada).

## Detalhes técnicos

- Banco: adicionar `auto_accept_orders boolean not null default false` em `public.printer_settings` (tabela por tenant, já com RLS e grants); nenhuma nova tabela.
- `src/routes/admin.configuracoes.impressora.tsx`: novo switch persistido junto com as demais configurações da impressora, atrás de `useTenantPlan().can("kitchenPrinter")`.
- `src/hooks/useAcceptOrderWithKitchenPrint.ts`: expor `autoAcceptEnabled` (query das configurações de impressora) e um `autoAcceptOrder(order)` que chama `updateOrderStatus(id, "preparo", "Aceito automaticamente")` e depois `printKitchenTicket`, engolindo erros de impressão em toast com ação "Reimprimir".
- `src/components/orders/OrdersRealtimeListener.tsx`: quando `autoAcceptEnabled`, em vez de exibir o toast com botão "Aceitar", dispara `autoAcceptOrder` para o pedido novo; guarda de idempotência por `orderId` (reaproveitar `notifiedIdsRef`) e fila sequencial (`await` em série) para evitar impressões simultâneas/duplicadas em vários pedidos.
- Como o listener já roda no `AdminLayout`, o auto-aceite vale em qualquer tela do admin; se duas abas estiverem abertas, a segunda encontra o pedido já fora de "novo" e não reimprime (checagem do status atual antes de imprimir).
- `src/components/orders/NewOrderToast.tsx`: variante "aceito automaticamente" (sem botão Aceitar, com "Ver pedido" e "Reimprimir").
