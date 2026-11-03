# Melhorias no Caixa e na lista de Finalizados

## 1. Dispensar pedidos fora de turno (anexo 1)
- Cada dia do aviso "Há pedidos fora de turno" ganha o botão **Dispensar** ao lado de "Criar turno retroativo" (com confirmação).
- O dia dispensado some do aviso para todos os dispositivos da loja. Os pedidos não são alterados; os relatórios continuam mostrando essas vendas.
- Também haverá um botão **Dispensar todos**.

## 2. Resumo financeiro completo (anexo 2)
No modal "Detalhes do turno", abaixo do resumo do dinheiro, entra o bloco **Total do turno por forma de pagamento**:
- Dinheiro, Pix Online, Pix Manual, Cartão online, Maquininha (crédito/débito) etc., cada um com a quantidade de pedidos e o valor.
- **Total geral do turno** (todas as formas), além de taxas de entrega e descontos.
- Pedidos cancelados ficam fora da soma.
- O bloco do dinheiro (fundo + vendas em dinheiro − sangrias = esperado) continua igual.

## 3. Novo layout do modal "Detalhes do turno" (anexo 3)
- Modal mais largo, dividido em duas metades (no celular, uma embaixo da outra):
  - **Esquerda:** Esperado/Contado, resultado, resumo financeiro, total por forma de pagamento, sangrias.
  - **Direita:** Entregadores (WhatsApp, imprimir, dinheiro das entregas).
- O bloco "Taxas de entrega (loja → entregador)" vira um acordeão, fechado por padrão: o cabeçalho mostra o total e o status; ao abrir, aparece a lista de pedidos.

## 4. Turnos anteriores (anexo 4)
- Cada linha ganha títulos pequenos e mais suaves: **Abertura**, **Fechamento**, **Esperado (dinheiro)**, **Contado (dinheiro)**, **Total do turno**.
- Turnos agrupados por mês ("Outubro 2026"), em acordeões; o mês atual vem aberto. O cabeçalho mostra a quantidade de turnos e o total do mês.
- Filtros: mês/período, e situação (Sobra / Falta / Sem diferença).

## 5. Finalizados / Cancelados em Pedidos (anexo 5)
- Linha de títulos nas colunas: Pedido, Cliente, Tipo, Hora, Total, Ações.
- Pedidos agrupados por data ("Hoje", "Ontem", "24/10/2026"), cada data em um acordeão com quantidade e total; só "Hoje" vem aberto.
- Filtros: busca por número/nome, situação (Finalizado / Cancelado), tipo (Entrega / Retirada / Local) e data.

## Detalhes técnicos
- Nova tabela `cash_offshift_dismissals (tenant_id, day, dismissed_by, created_at)`, com chave única (tenant_id, day), RLS para membros da loja e grants. `getOffShiftDays` exclui os dias dispensados. Nova função de servidor `dismissOffShiftDay` (dono/admin).
- `getClosedCashSessionDetail` e `getCashOverview.history` passam a calcular os totais por `payment_method` dos pedidos não cancelados dentro do período do turno (`total_all`, `by_method[]`); helper puro de agrupamento com teste.
- O modal usa `max-w-6xl` com `lg:grid-cols-2`; acordeão com `@/components/ui/accordion`.
- O agrupamento e os filtros de turnos e de finalizados são feitos no navegador sobre os dados já carregados (helpers puros de agrupamento por mês e por dia em São Paulo, com testes).
