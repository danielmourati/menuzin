# Troco no checkout, destaque na comanda e controle de caixa enxuto

## 1. Checkout (cliente)
- Ao escolher **Dinheiro**:
  - Checkbox **"Não preciso de troco"**. Quando marcado, o campo de valor some.
  - Campo **"Precisa de troco para quanto?"** com botões de atalho calculados a partir do total. Exemplo: total R$ 38 mostra R$ 40, R$ 50 e R$ 100. O próximo múltiplo de 10 e as próximas notas comuns ficam acima do total.
  - Linha ao vivo: **"Troco a devolver: R$ 12,00"**.
  - Valor menor que o total fica bloqueado, com aviso.
  - Se a loja não aceitar notas de R$ 100 ou R$ 200, esses atalhos são escondidos. Se o cliente digitar um valor que exija essas notas, aparece um aviso: "Esta loja não aceita notas de R$ 200 para troco".
- O pedido salva o valor em dinheiro (`change_for`, que já existe). "Sem troco" é salvo como valor igual ao total, com a marcação `no_change`.

## 2. Configurações da loja
- Em Configurações > Pagamentos > Dinheiro: toggles **"Aceito notas de R$ 100"** e **"Aceito notas de R$ 200"**. Os dois vêm ligados por padrão.

## 3. Gestor de Pedidos e impressão
- O card e o detalhe do pedido em dinheiro ganham um bloco destacado: Total a cobrar / Pagamento em / **Levar troco de R$ X (SEPARAR)**, ou "SEM TROCO".
- As comandas térmicas de 58 e 80 mm, cozinha e cliente, mostram o bloco entre linhas `====`, em negrito e fonte dupla nos valores-chave:
```text
================================
FORMA DE PAGAMENTO: DINHEIRO
TOTAL A COBRAR: R$ 38,00
PAGAMENTO EM:   R$ 50,00
LEVAR TROCO DE: R$ 12,00 (SEPARAR)
================================
```
- O mesmo bloco vai para o PDV, onde o campo "troco para" ganha os mesmos atalhos.

## 4. Caixa (nova tela: Admin > Caixa, exclusivo Pro)
- **Abrir turno:** um único campo, o Fundo de Troco Inicial. Só pode haver um turno aberto por loja.
- **Registrar sangria:** valor e motivo. A lista do turno pode ser excluída enquanto o turno estiver aberto.
- **Fechamento cego:** o lojista digita o dinheiro contado sem ver o valor esperado. Só depois o sistema mostra:
  Esperado = Fundo inicial + soma dos pedidos finalizados em dinheiro no turno − soma das sangrias.
  O resultado aparece como **Bateu**, **Sobra de R$ X** ou **Falta de R$ X**. Ele fica salvo no histórico de turnos.
- Pedidos cancelados não entram no cálculo. Pedidos em dinheiro ainda abertos aparecem como "pendentes" no fechamento.

## 5. Acerto por entregador
- Na tela Caixa, aba "Entregadores", aparecem os pedidos em dinheiro do turno agrupados por entregador, usando o entregador já atribuído ao pedido.
- Para cada entregador: "**João** saiu com R$ 150 em entregas a cobrar e R$ 40 em troco. Deve entregar **R$ 190** ao retornar."
- O troco é a soma de (pagamento em − total). O valor a entregar é a soma do "pagamento em".
- Botão **"Marcar acerto recebido"** por entregador, registrado no turno.

## Detalhes técnicos
- Migração:
  - `orders.no_change boolean default false`.
  - `tenants` ganha `accepts_bill_100` e `accepts_bill_200`, ambos `boolean default true`.
  - Novas tabelas `cash_sessions` (tenant_id, opened_by, opening_float, opened_at, closed_at, counted_amount, expected_amount, difference, status), `cash_movements` (session_id, tenant_id, kind 'sangria', amount, reason, created_by) e `cash_driver_settlements` (session_id, driver_id, amount, settled_at).
  - Cada tabela terá GRANT para authenticated e service_role, RLS via `has_tenant_role`, e índice único parcial para um único turno aberto por loja.
- O fechamento é feito por uma função de servidor (`cash.functions.ts`, com `requireSupabaseAuth`), que calcula o valor esperado no servidor. O cliente nunca envia esse valor.
- A validação do checkout no servidor rejeita `change_for < total` e notas não aceitas. A lógica de atalhos fica em um helper puro compartilhado (`src/lib/cash-change.ts`), usado pelo checkout, pelo PDV e pela validação.
- A impressão usa o construtor de comanda existente (`buildKitchenTicketForPrinter`) e o comprovante do cliente, com um bloco novo de pagamento em dinheiro.
- Gate de plano Pro na tela Caixa, igual às outras funções Pro.
