# Atalho de conversas da IA + edição de pedidos aceitos

## 1. Atalho flutuante para conversas ativas do Atendente IA
- Botão redondo flutuante no canto inferior direito de todo o painel (exceto PDV, para não cobrir os botões), com o ícone do atendente e um contador de conversas abertas.
- Fica pulsando/destacado quando algum cliente pediu atendente humano.
- Ao tocar, abre um painel lateral com a lista de conversas ativas (pedido de humano primeiro, depois em atendimento humano, depois com a IA): nome do cliente, última mensagem, há quanto tempo, e nº do pedido se houver.
- Tocar numa conversa abre a tela do Atendente IA já nela.
- Só aparece quando o Atendente IA está ligado na loja (plano Pro). Atualiza sozinho a cada poucos segundos, reaproveitando a consulta que o alerta de atendimento já faz.

## 2. Editar pedidos aceitos / em preparo
Disponível para dono e administradores da loja, nos status Aceito e Em preparo (e Novo). Bloqueado para cancelados, finalizados e já despachados.

Novo botão **"Editar pedido"** nos detalhes do pedido, abrindo uma tela com:
- **Itens:** alterar quantidade, remover, trocar ou incluir itens do cardápio (com tamanhos, sabores e adicionais obrigatórios, usando o mesmo seletor do PDV), editar observação do item.
- **Resumo recalculado ao vivo:** subtotal, taxa de entrega, desconto do cupom (reaplicado sobre o novo subtotal, respeitando as regras do cupom) e total.
- **Entregador:** trocar ou remover o entregador responsável (também em pedidos já despachados).
- **Forma de pagamento:** trocar entre dinheiro (com troco), maquininha crédito/débito e Pix manual. Pedidos pagos online pelo Mercado Pago aparecem com a forma travada e o aviso "Pago online — não pode ser alterado".
- **Pedido pago online com aumento de valor:** a diferença fica registrada como "valor a cobrar na entrega" (escolhendo dinheiro/maquininha para essa diferença); se o valor diminuir, aparece aviso de que o reembolso deve ser feito manualmente.

Ao salvar:
- O servidor recalcula tudo a partir do cardápio (o painel nunca envia preços).
- Fica registrado no histórico: "Pedido editado por Fulano — incluído X, removido Y, total R$ A → R$ B".
- Oferece "Reimprimir comanda da cozinha" com a marca **ALTERADO** no topo.
- Se o troco já estava calculado, ele é refeito para o novo total (avisando se o valor informado pelo cliente não cobre mais).

## 3. Cliente vê a atualização no acompanhamento
- A página "Acompanhar pedido" no aparelho do cliente passa a se atualizar sozinha (a cada ~15s e ao voltar para a aba).
- Quando o pedido muda, aparece um aviso destacado "Seu pedido foi atualizado pela loja" com o novo total, e a linha do tempo mostra o evento "Pedido alterado".
- Detalhes do pedido mostram os itens e valores novos; troca de entregador e de forma de pagamento também aparecem.
- Se o cliente ativou notificações, recebe um aviso "Pedido #N atualizado".

## Detalhes técnicos
- Atalho: `src/components/admin/AiConversationsFab.tsx` montado em `AdminLayout.tsx`; usa a listagem de conversas já existente em `ai-agent.functions.ts` (ordenada por handoff) com `refetchInterval`; navega para `/admin/atendente-ia?c=<id>`.
- Novo server fn `updateOrderItems` em `orders.functions.ts` (`requireSupabaseAuth` + `has_tenant_role` owner/admin): valida status, recalcula itens com a mesma rotina de preço do `createOrder`, substitui `order_items`, atualiza subtotal/desconto/total/troco, grava `order_status_history` com nota e `edited_at`.
- Migração: colunas `orders.edited_at timestamptz`, `orders.edit_count int default 0`, `orders.amount_due_on_delivery numeric default 0` (aditivas).
- Pagamento reutiliza `updateOrderPaymentMethod` (já bloqueia Mercado Pago aprovado); restringir a owner/admin. Entregador reutiliza `assignDriverToOrder` sem mudar status; o acerto do Caixa segue a regra atual (turno do despacho/finalização).
- Comanda: flag `edited` em `buildKitchenTicketForPrinter` para o cabeçalho ALTERADO.
- Acompanhamento: `useCustomerOrder` com `refetchInterval` e comparação de `edited_at` para exibir o aviso; push via o endpoint de notificação ao cliente já usado em mudanças de status.
- Pedidos criados pela IA ou PDV seguem a mesma edição.
