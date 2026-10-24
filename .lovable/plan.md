# Escolha de local de impressão por produto

## O que muda
- Na edição de **produto** e de **categoria**, novo campo "Onde imprimir" com os locais da cozinha cadastrados (ex.: Cozinha, Sucos/Frituras). Pode marcar mais de um.
- Regra: produto escolhido > categoria > se nada marcado, imprime em todos os locais da cozinha (comportamento atual, nada quebra).
- Na impressão automática e na reimpressão, cada local da cozinha recebe só os itens dele. Se um local não tem itens no pedido, não imprime papel em branco.
- O cupom do caixa/conta continua com o pedido completo.
- No PDV e pedidos do cardápio, vale igual.

## Teste
- Produto "Suco" marcado em Sucos/Frituras, "Pastel" em Cozinha: pedido com os dois imprime um item em cada local.
- Produto sem local herda a categoria; sem nada, sai em todos.
- Teste automático da regra de escolha.

## Detalhes técnicos
- Migração: `products.print_location_ids uuid[] default '{}'`, `categories.print_location_ids uuid[] default '{}'` (ids de `tenant_printers`).
- Helper puro `src/lib/print-routing.ts`: `itemsForPrinter(items, printerId, productMap, categoryMap)`.
- `print-kitchen.ts` / `usePrintQueue.ts`: filtrar itens por impressora de role kitchen antes de `buildKitchenTicketForPrinter`; pular se vazio.
- `admin.produtos.tsx` e edição de categorias: checkboxes com `listTenantPrinters`.
- `scripts/print-routing-tests.mjs` (bun).
