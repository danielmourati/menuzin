# Selo de turno, troca de forma de pagamento e taxas por entregador

## 1. Selo de turno no topo do painel
- No topo do painel, ao lado do botão Loja aberta/fechada, aparece um selo:
  - **Turno aberto** (verde), com o horário de abertura. Ao clicar, abre a tela Caixa.
  - **Turno fechado** (âmbar), com o link "Abrir turno", que leva para Caixa > Abrir turno.
- Só aparece para lojas Pro, que têm a tela Caixa. O selo se atualiza sozinho a cada 60 s e também logo depois de abrir ou fechar um turno.

## 2. Trocar a forma de pagamento de um pedido
- No detalhe do pedido, o botão **"Alterar forma de pagamento"** abre opções offline: Dinheiro, Maquininha na entrega (crédito/débito), Pix manual.
- Se a escolha for Dinheiro, aparece o mesmo seletor de troco do checkout ("Não preciso de troco" ou "troco para R$ X").
- Pedidos já pagos online pelo Mercado Pago não podem ser alterados, e o motivo aparece na tela. Pedidos cancelados também ficam travados.
- Cada troca fica registrada no histórico do pedido, por exemplo: "Pagamento alterado de Pix para Dinheiro por Fulano".
- O caixa e o acerto dos entregadores passam a usar a nova forma de pagamento automaticamente.

## 3. Caixa > Entregadores: taxas de entrega
- Para cada entregador, uma lista de todas as entregas do turno: nº do pedido, bairro, taxa de entrega e forma de pagamento. O total das taxas fica no rodapé.
- O cartão continua mostrando o acerto do dinheiro recebido ("deve entregar R$ X") e ganha um novo bloco: **"Taxas a pagar ao entregador: R$ Y"**.
- O botão **"Pagar taxas"** pergunta como o pagamento será feito:
  - **Dinheiro:** cria automaticamente uma sangria com o motivo "Taxas de entrega — João" e marca o pagamento como feito. O valor esperado no fechamento já desconta essa saída.
  - **Pix:** só marca como pago, sem mexer na gaveta.
- Depois de pago, o cartão mostra "Taxas pagas em Dinheiro/Pix às 23:10". Dá para desfazer enquanto o turno estiver aberto, e a sangria criada é removida junto.

## Detalhes técnicos
- Migração (somente adições):
  - `cash_driver_settlements` ganha as colunas `kind text default 'cash_return'` ('cash_return' | 'delivery_fees'), `payment_method text` ('cash' | 'pix') e `movement_id uuid`, que aponta para a sangria gerada.
  - A restrição única passa a considerar `(session_id, driver_id, kind)`.
- `cash.functions.ts`:
  - `getCashShiftStatus`: versão leve que só lê o turno aberto, usada pelo selo do topo.
  - O resumo por entregador passa a incluir a lista de entregas com taxas, o total e o pagamento das taxas.
  - `payDriverFees({ driverId, method })`: calcula o total no servidor. No caso de dinheiro, insere `cash_movements` do tipo sangria e grava o pagamento com o `movement_id`.
  - `undoDriverFees`: desfaz o pagamento e, se houver, remove a sangria.
- `orders.functions.ts`: `updateOrderPaymentMethod({ orderId, method, changeFor, noChange })` com `requireSupabaseAuth` e `has_tenant_role`. Valida o troco com o helper `cash-change.ts` e as notas aceitas pela loja, bloqueia pedidos com `mp_payment_id` aprovado ou cancelados, atualiza `payment_label`/`change_for`/`no_change` e grava em `order_status_history` (a nota fica com o status atual).
- Interface: componente `CashShiftBadge` no cabeçalho do `AdminLayout`, um diálogo de troca de pagamento no `OrderDetailsDrawer` e o diálogo "Pagar taxas" em `admin.caixa.tsx`. A aba Caixa passa a ler `?tab=` para que o link do selo abra a aba certa.
