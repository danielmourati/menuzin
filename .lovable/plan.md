# Abertura e fechamento de caixa

## Resposta
Sim, faz sentido. Hoje o sistema não sabe quanto dinheiro deveria estar na gaveta: a forma de pagamento é guardada como texto livre (ex.: "Pagar na retirada · Dinheiro em Espécie") e pedidos em dinheiro continuam "pendentes" mesmo depois de entregues. O caixa resolve isso e dá ao lojista a conferência diária.

## O que o lojista vai ter
- Nova tela **Caixa** no menu do painel (todos os planos), um caixa por loja.
- **Abrir caixa:** informa o fundo de troco; só pode haver um caixa aberto por vez.
- **Durante o dia:** botões para registrar
  - Sangria (retirada de dinheiro, com motivo)
  - Suprimento (entrada de dinheiro para troco, com motivo)
  - Despesa do dia (valor, descrição, paga com dinheiro do caixa)
- **Dinheiro dos pedidos entra automaticamente:** pedidos pagos em dinheiro (PDV, retirada, entrega) somam no caixa aberto quando forem finalizados; troco devolvido já é considerado (usa o campo "troco para" do pedido).
- **Fechar caixa (contagem às cegas):** operador digita o dinheiro contado; só então o sistema mostra esperado x contado e a diferença (sobra/falta), com observação opcional.
- **Resumo do fechamento:** vendas por forma de pagamento (dinheiro, Pix, cartão), sangrias, suprimentos, despesas, diferença. Botão de imprimir resumo.
- **Histórico** de caixas anteriores com quem abriu/fechou e diferença.
- Aviso discreto no PDV/painel quando não há caixa aberto (não bloqueia pedidos).

## Fórmula do dinheiro esperado
fundo de troco + vendas em dinheiro + suprimentos - sangrias - despesas

## Ajustes necessários nos pedidos
- Pedidos em dinheiro finalizados passam a contar como recebidos (pagamento "aprovado" ao finalizar), corrigindo também os relatórios.
- Forma de pagamento normalizada (dinheiro / pix / cartão / outro) deduzida do texto atual, sem mudar o que o cliente vê; pedidos antigos classificados pelo texto.

## Fora do escopo agora
Caixa por operador, múltiplos caixas simultâneos, bloquear pedidos sem caixa aberto, conciliação de maquininha.

## Detalhes técnicos
- Tabelas novas `cash_sessions` (tenant_id, opened_by/closed_by como UUID simples, opened_at, closed_at, opening_amount, counted_amount, expected_amount, difference, notes, status) e `cash_movements` (session_id, tenant_id, kind: sangria|suprimento|despesa, amount, description, created_by, created_at). Índice único parcial garante um caixa aberto por loja.
- RLS por tenant com `has_tenant_role` (owner/admin/staff); GRANTs para authenticated e service_role; sem acesso anon.
- Funções de servidor autenticadas (`src/lib/cash.functions.ts`): abrir, registrar movimento, resumo do caixa atual, fechar (calcula esperado no servidor a partir dos pedidos do período, nunca confiando no cliente), histórico.
- Classificação do método de pagamento em helper compartilhado (`src/lib/payment-method.ts`) usado no caixa e nos relatórios.
- Pedidos em dinheiro: ao finalizar, marcar `payment_status` aprovado/manual apenas se estava pendente e o método for dinheiro; valor em dinheiro = total (troco não entra no caixa).
- Nova rota `src/routes/admin.caixa.tsx`, item no menu em `AdminLayout.tsx`, aviso no PDV; impressão do fechamento reutiliza o fluxo de impressão existente.
- Fuso São Paulo nos cortes de data, como no restante do sistema.
