## 1. Modal de detalhes do pedido (`OrderDetailsDrawer.tsx`)

Novo grid em 2 colunas (md+):

```text
┌─────────────────────────────┬─────────────────────────────┐
│ ITENS DO PEDIDO (esquerda)  │ CLIENTE (direita)           │
│ - lista, obs, valores       │ - nome, telefone, endereço  │
│                             │   ou mesa, enviado às…      │
├─────────────────────────────┴─────────────────────────────┤
│ LINHA DO TEMPO — horizontal, full-width, ícones grandes   │
└───────────────────────────────────────────────────────────┘
```

Mobile: empilha (itens → cliente → timeline).

**Timeline horizontal mais explicativa** (`OrderStatusTimeline.tsx`, modo `horizontal`):
- Ícones por etapa em vez do `Clock` genérico, derivados do `step.key`:
  - `novo` → `Inbox`
  - `aceito` → `CheckCircle2`
  - `preparo` → `ChefHat` (`Flame` quando current)
  - `saiu_entrega` → `Bike`
  - `pronto_retirada` → `PackageCheck`
  - `servido` → `Utensils`
  - `finalizado` → `Award`
- Bolha 40px, label maior (text-xs → text-sm), horário sob o label.
- Conector mais grosso (h-1) entre etapas; verde quando concluído.

Restante (header, valores, botões de pagamento/imprimir/fechar) preservado; rodapé fica abaixo da timeline.

## 2. Fluxo Kanban simplificado (`OrdersStatusGroups.tsx` + `OrdersKanbanBoard.tsx` + `OrdersMobileTabs.tsx`)

Reduzir para 3 colunas/grupos ativos + 1 lista de arquivados:

1. **Novos pedidos** — `novo`
2. **Em preparo** — `aceito` + `preparo` (unificados; Aceitar já manda para preparo)
3. **Prontos / Despachados** — `pronto_retirada`, `saiu_entrega`, `servido`
4. **Finalizados** — `finalizado` + `cancelado`, exibidos como **lista compacta** (1 linha cada: #nº · cliente · modo · total · hora · botão "Visualizar"), em vez de cards.

Implementação:
- Remover/ocultar o grupo `aceito` separado; juntar `["aceito","preparo"]` em "Em preparo".
- Criar componente `OrdersFinalizedList` (lista densa) substituindo o grid de cards no grupo de arquivados.
- `OrdersMobileTabs`: mesma simplificação (Novos, Em preparo, Prontos, Finalizados).

## 3. Aceitar pedido = inicia preparo + imprime cozinha

Centralizar em um helper `acceptAndStartPreparation(order)` em `useOrdersRealtime`:
- Atualiza status diretamente para `"preparo"` (uma única chamada server: `updateOrderStatus(orderId, "preparo", "Pedido aceito e em preparo")`).
- Em seguida tenta imprimir a comanda de cozinha automaticamente (mesmo fluxo do `PrintKitchenButton`).
- Falha silenciosa de impressão → toast de aviso com link "Configurar impressora"; não bloqueia a transição.

Pontos de chamada atualizados:
- `OrderCard` botão "Aceitar".
- `OrderDetailsDrawer` botão "Aceitar Pedido".
- `OrderStatusActions` quando `next` inclui `aceito` no estado `novo` (transforma em ação única "Aceitar e iniciar preparo").

`nextStatuses` em `src/lib/format.ts`:
- `novo` → `["preparo","cancelado"]` (sem passar por `aceito` no novo fluxo).
- Mantém `aceito` como status válido para pedidos legados; trata `aceito` no UI como "Em preparo".

## 4. Comanda de cozinha com fonte ampliada

Em `src/lib/print-kitchen.ts`:
- Antes do texto, prefixar ESC/POS `\x1B@` (init) e `\x1D!\x11` (double width + double height) no cabeçalho/itens; voltar a normal `\x1D!\x00` no rodapé.
- Aplicar fonte grande aos itens (qty, nome, sabores/adicionais) e manter observações em fonte normal para caber.
- Atualizar `buildKitchenTicket(order, cols)` para devolver blocos marcados; `print-kitchen.ts` monta o stream final com os bytes ESC/POS intercalados (a string segue sendo enviada como antes por `printQzReceipt`).

## 5. Botão de reimpressão da cozinha

- `PrintKitchenButton` já existe — manter no rodapé do `OrderDetailsDrawer` com rótulo "Reimprimir cozinha" quando `order.status !== "novo"`.
- Adicionar atalho na lista de arquivados/finalizados e no `OrderCard` (ícone `ChefHat`) para reimprimir sem abrir o modal.

## 6. Acompanhamento do cliente simplificado (`CustomerOrderTracking.tsx` + `getTimelineSteps`)

Nova função `getCustomerTimelineSteps(mode)` (ou flag em `getTimelineSteps`) que remove `novo` e produz:
- entrega: `aceito` → `preparo` → `saiu_entrega` → `finalizado` (Entregue)
- retirada: `aceito` → `preparo` → `pronto_retirada` → `finalizado` (Retirado)
- consumo_local: `aceito` → `preparo` → `servido` → `finalizado`

`CustomerOrderTracking` usa o `OrderStatusTimeline` horizontal com a variante "cliente" (sem a etapa "Pedido enviado") e mesma iconografia explicativa.

## Arquivos afetados

- `src/components/orders/OrderDetailsDrawer.tsx`
- `src/components/orders/OrderStatusTimeline.tsx`
- `src/components/orders/OrderStatusActions.tsx`
- `src/components/orders/OrdersStatusGroups.tsx`
- `src/components/orders/OrdersMobileTabs.tsx`
- `src/components/orders/OrderCard.tsx`
- `src/components/orders/OrdersFinalizedList.tsx` *(novo)*
- `src/hooks/useOrdersRealtime.ts` (helper `acceptAndStartPreparation`)
- `src/lib/format.ts` (`nextStatuses`, `getCustomerTimelineSteps`)
- `src/lib/kitchen-ticket.ts` + `src/lib/print-kitchen.ts` (fonte ampliada)
- `src/components/storefront/CustomerOrderTracking.tsx`

Sem mudanças de schema/migração.
