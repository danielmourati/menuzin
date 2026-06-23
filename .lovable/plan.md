## Objetivo

Adicionar exportação em PDF e Excel do relatório de vendas por período já existente em `/admin/relatorios`, respeitando o período/filtros atualmente selecionados na tela.

## Mudanças

### 1. Dependências (client-side, sem backend)
- `jspdf` + `jspdf-autotable` — geração do PDF
- `xlsx` (SheetJS) — geração do Excel `.xlsx`

Exportação 100% no navegador a partir dos dados já carregados pelo `useQuery(getBasicReports)`. Sem novas server functions, sem mudanças de schema/RLS.

### 2. `src/lib/reports-export.ts` (novo)
Utilitários puros que recebem o objeto `data` retornado por `getBasicReports` + `{ from, to }` e produzem:
- `exportReportToPdf(data, range, tenantName?)` — PDF A4 retrato com:
  - Cabeçalho: "Relatório de Vendas", período formatado (dd/mm/aaaa a dd/mm/aaaa), data de geração
  - Bloco de KPIs: Vendas totais, Pedidos, Ticket médio
  - Tabelas (via `autoTable`): Produtos mais vendidos, Pedidos por status, Formas de pagamento, Entrega vs retirada vs consumo local
  - Rodapé com numeração de página
  - Nome do arquivo: `relatorio-vendas_{from}_{to}.pdf`
- `exportReportToExcel(data, range)` — Workbook `.xlsx` com abas:
  - `Resumo` (KPIs + período)
  - `Produtos` / `Status` / `Pagamentos` / `Modalidades`
  - Valores monetários como número (não string formatada) com `z` BRL para somatórios corretos no Excel
  - Nome do arquivo: `relatorio-vendas_{from}_{to}.xlsx`

### 3. `src/routes/admin.relatorios.tsx` (editar)
- Adicionar, no card de filtros, dois botões à direita: **Exportar PDF** e **Exportar Excel** (ícones `FileText` e `FileSpreadsheet` do lucide-react, variant `outline`, `size="sm"`).
- Botões desabilitados enquanto `isLoading` ou sem `data`.
- Layout responsivo: os botões ficam na mesma linha dos presets em telas ≥ sm e quebram para baixo no mobile.
- Handlers chamam as funções de `reports-export.ts` passando `data` e `range` atuais. Toast de sucesso/erro via `sonner` (já usado no projeto).

## Design / UX
- Mantém o padrão visual atual da página (sem cores fora dos tokens semânticos).
- Botões com ícone + label; em mobile (<sm) mostram apenas ícone com `aria-label` para não poluir.
- PDF usa tipografia padrão do jsPDF (Helvetica) com tamanhos hierárquicos; cabeçalhos de tabela em fundo `#f1f5f9` neutro.

## Fora de escopo
- Detalhe de pedido individual, lista de pedidos da tela `/admin/pedidos`, agendamento/envio por e-mail, geração server-side.
- Qualquer alteração de backend, RLS, schema ou server functions.
