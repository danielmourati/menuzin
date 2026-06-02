
## Objetivo

Tornar o cupom térmico mais compacto e bem alinhado em 55mm e 80mm, e reorganizar os cards de pedidos do painel para evitar overflow e destacar o nome do cliente.

## 1. Cupom — `src/lib/receipt-builder.ts`

Reduzir linhas em branco e agrupar informações:

- Remover `out.push("")` redundantes entre seções (cabeçalho, cliente, tabela, itens, totais, rodapé). Manter no máximo 1 linha em branco por bloco lógico, e nenhuma quando o separador já marca a divisão.
- Cabeçalho: juntar `CNPJ` e `WhatsApp` na mesma linha quando ambos couberem em `cols` (ex.: `CNPJ 00.000.000/0001-00  Tel (86) 9...`); fallback para linhas separadas.
- Aviso fiscal: condensar em uma única linha `*** NAO E DOCUMENTO FISCAL ***` (sem segunda linha "AGUARDE…" — mover para o rodapé só uma vez).
- Cliente: juntar nome + telefone na mesma linha quando couber (`Cliente: Fulano  (86) 9...`).
- Itens: remover a linha em branco entre itens; usar separador `-` curto só quando houver adicionais/observação. Aproximar nome do produto da linha de qty/valor (sem newline extra) quando o nome couber junto com `Nx Vu  Vt` na mesma linha.
- Adicionais: indent de 1 espaço (em vez de 2) no 55mm para ganhar coluna.
- Totais: omitir linha "Subtotal" quando não houver taxa de entrega (já feito) e remover a linha em branco antes de "Forma de Pagamento".
- Rodapé: combinar `Data/Hora` + número curto do pedido em uma linha. Mover `feed_lines` para ser respeitado mas com piso 1 e teto 4 (a fonte já dá margem).
- Substituir uso de `=` duplo por um separador único configurável; em 55mm sempre usar `-` simples para não pesar visualmente.

## 2. Suporte real a 55mm

Hoje o sistema declara `PaperWidth = "58mm" | "80mm"` mas a UI usa `55mm`. Unificar:

- `src/lib/printer-types.ts`: trocar `PaperWidth` para `"55mm" | "80mm"` e ajustar `columnsFor` → 55mm = 30 colunas, 80mm = 48 colunas.
- `src/lib/printer-settings.functions.ts`: trocar enum Zod `PaperWidth` para `["55mm","80mm"]`. Migrar valores antigos `"58mm"` no `rowToSettings` mapeando para `"55mm"`.
- `PrintableOrder.tsx`: aceitar `55mm | 80mm`; remover branch `58mm`; `@page size: 55mm auto` com `margin: 1mm`.
- `receipt-builder.ts`: usar `columnsFor` já central; ajustar `addonLine` indent para 1 espaço em 30 colunas.
- Migração leve no `qz-tray` `printQzReceipt`: nada muda (recebe texto + nome de impressora).

## 3. Estilos de impressão por largura — `PrintableOrder.tsx`

- `@page` com `size` e `margin` por largura: 55mm → margin 1mm, 80mm → margin 2mm.
- Fonte: 55mm/normal = 9px, 55mm/compact = 8px, 80mm/normal = 11px, 80mm/compact = 10px; `line-height: 1.1`, `letter-spacing: 0`, `white-space: pre`.
- Adicionar `@media print { html, body { margin:0; padding:0; } .printable-order-receipt { width: 100%; } }`.

## 4. Cards de pedidos — `src/components/orders/OrderCard.tsx`

Reorganizar a linha principal para que o cliente fique em destaque sem overflow:

- Aumentar peso/tamanho do nome do cliente: `text-base font-bold` (era `text-sm font-semibold`).
- Coluna do cliente passa a ser a primeira após o id; reduzir min-width das outras colunas e usar `min-w-0` + `truncate` em todos os filhos de texto longo.
- Mover `#número`, modo, status, tempo para uma "header strip" superior compacta (linha 1), e cliente + total + ações para a linha 2 (em telas <md). Em telas ≥md manter linha única, mas com larguras fixas: tempo `w-16`, total `w-24 text-right`, cluster de ações `w-auto`.
- Endereço/telefone: agrupar em `flex flex-wrap gap-x-2` com `truncate` no telefone e `line-clamp-1` no endereço para evitar quebra dupla.
- Itens resumidos: subir o breakpoint de `xl:` para continuar escondidos em telas médias (mantém comportamento atual mas só renderizar se `order.items.length>0`).
- Cluster de botões: garantir `flex-nowrap shrink-0`; aplicar `gap-0.5` em vez de `gap-1`; em <sm, esconder o botão de WhatsApp e WhatsApp/print ficam só no drawer/expand.
- Adicionar `overflow-hidden` no container externo e `min-w-0` em cada flex child para impedir estouro horizontal.
- Ajustar paddings: `pl-3 pr-2 py-2.5` para ganhar densidade.
- Padronizar badges: `OrderStatusBadge` e `PaymentStatusBadge` com `h-5` e `whitespace-nowrap`.

## 5. Critérios técnicos

- Sem mudança de regra de negócio: apenas formatação visual + montagem de texto.
- Reusar `buildReceipt` no preview e impressão (já é o caso) — assim 55mm/80mm ficam idênticos byte a byte.
- Atualizar `sampleOrderForPreview` se necessário para validar visualmente o novo layout em ambas as larguras.
- Verificar tela `/admin/configuracoes/impressora` continua funcionando com novo enum `55mm`.

## Arquivos afetados

- `src/lib/receipt-builder.ts` (compactação)
- `src/lib/printer-types.ts` (enum 55mm/80mm + columnsFor)
- `src/lib/printer-settings.functions.ts` (Zod + migração)
- `src/components/orders/PrintableOrder.tsx` (estilos print por largura)
- `src/components/orders/OrderCard.tsx` (layout + destaque cliente)
- `src/routes/admin.configuracoes.impressora.tsx` (apenas se houver opção 58mm exposta no select — trocar por 55mm)

## Fora do escopo

- Mudanças no fluxo de QZ Tray, autenticação ou no domínio dos pedidos.
- Novos toggles de layout do cupom (mantém os existentes em `PrinterSettings`).
