# Resumo básico e completo do turno aberto

## O que o usuário vai ver

No cabeçalho do card "Turno aberto" (Caixa), dois botões ao lado do fundo inicial, visíveis em qualquer aba:

```text
[Turno aberto]  Desde 11/10/2026, 17:55 · Ana Kelly      [Resumo] [Relatório completo]   Fundo inicial R$ 100,00
```

Cada botão abre uma janela (modal), no celular quase em tela cheia.

### Resumo básico (janela 1)
- Fundo inicial, total de pedidos, total vendido, sangrias (total e quantidade), pedidos pendentes/cancelados.
- Dono/admin: também "Vendas em dinheiro" e "Esperado na gaveta".
- Equipe (staff): essas duas linhas somem, com aviso "Valores em dinheiro ficam ocultos até o fechamento cego".

### Relatório completo (janela 2)
- Tudo do resumo básico.
- Vendas por forma de pagamento: forma, quantidade de pedidos, total (cancelados fora, mostrados à parte).
- Lista de todos os pedidos do turno: nº, hora, cliente, tipo (entrega/retirada/local), pagamento, status, total; cancelados em destaque/riscados; pedidos em dinheiro com nota/troco apenas para dono/admin.
- Staff: a linha "Dinheiro" da forma de pagamento e o troco dos pedidos ficam ocultos.
- Filtros leves na lista: Todos / Pendentes / Cancelados.

## Regras
- Fechamento cego preservado: o servidor nunca envia valores em dinheiro/esperado para quem não é dono/admin (não basta esconder na tela).
- Só leitura; nada é gravado; sem migração de banco.
- Pedidos considerados: mesma janela do turno já usada no Caixa (criados, finalizados ou despachados no período).

## Detalhes técnicos
- `src/lib/cash.functions.ts`: nova server fn `getOpenCashReport` (requireSupabaseAuth, `tenantOf`, turno aberto). Reusa `computeSession` ampliado para devolver a lista de pedidos do turno (campos: id, number, created_at, customer_name, mode, payment_label, status, total, change_for, no_change). Verifica papel com `supabase.rpc("has_tenant_role", { owner, admin })` via contexto do usuário; se não for dono/admin, zera/omite `cash_sales`, `expected` e troco e marca `cash_hidden: true`. Agrupamento por pagamento feito no servidor.
- `src/routes/admin.caixa.tsx`: dois botões no card do turno aberto; dois `Dialog` (max-h-[92dvh], rolável) com react-query (`["open-cash-report"]`, carrega só ao abrir, refetch ao abrir); componentes `CashSummaryDialog` e `CashReportDialog` (em arquivo novo `src/components/admin/CashReportDialogs.tsx` para não inflar a rota).
- Testar com Playwright (sessão `lovable auth-session --json --self`) no Burguer Prime: abrir ambos os modais, conferir totais contra o banco e a visão sem dinheiro.

## Fora do escopo
- Impressão/WhatsApp do relatório completo (não selecionado).
