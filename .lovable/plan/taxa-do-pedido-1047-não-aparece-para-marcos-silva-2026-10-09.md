# Taxa do Pedido #1047 não aparece para Marcos Silva

## Causa (confirmada nos dados)
- O pedido #1047 (Burguer Prime, entrega, taxa R$ 5,00, Maquininha) foi **criado em 02/10**.
- Ele só foi despachado com Marcos Silva e finalizado **hoje (09/10, ~23:08)**, dentro do turno aberto às 22:09.
- O Caixa só considera pedidos **criados** durante o turno. Como o #1047 nasceu uma semana antes, ficou fora, e a taxa não entrou na conta do entregador.

## Correção
- O Caixa passa a contar um pedido no turno em que ele foi **despachado ou finalizado**, e não mais só no turno em que foi criado:
  - **Taxas por entregador e acerto do dinheiro:** entram os pedidos despachados ou finalizados durante o turno.
  - **Vendas em dinheiro do fechamento:** entram os pedidos finalizados durante o turno.
  - **Pedidos pendentes:** continuam aparecendo os pedidos criados no turno e ainda abertos.
- Um pedido nunca é contado em dois turnos.
- Depois da correção, o #1047 aparece para Marcos Silva com R$ 5,00 no turno atual.

## Detalhes técnicos
- Em `computeSession` (`src/lib/cash.functions.ts`), buscar os pedidos onde `created_at` **ou** `completed_at` estão na janela do turno (`.or(...)`), e também os que foram despachados na janela (consultando `order_status_history` com `new_status = 'saiu_entrega'` e `created_at` na janela).
- Para as vendas em dinheiro, filtrar `finalizado` por `completed_at` dentro da janela.
- Para os entregadores, incluir os pedidos de entrega com `driver_id` cujo despacho ou finalização caiu na janela, sem duplicar ids.
