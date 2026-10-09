# PDV: sem aviso/som e com impressão automática

## O que muda para o lojista
- Pedido lançado no PDV nunca mais gera aviso na tela (toast), sino, som nem push no celular, em nenhum aparelho com o painel aberto.
- Ao clicar em "Lançar Pedido", a comanda da cozinha é impressa na hora, sem precisar de nenhum outro clique.
- Todo pedido PDV entra direto em "Em preparo" (decisão confirmada), pago ou não. Não fica mais parado em "Novo" esperando aceite.
- Reimpressão continua manual e em 1 via.

## Causa hoje (verificada no código)
- PDV não pago entra como "novo" -> o painel trata como pedido de cliente: toast, som e aceite automático.
- Só o PDV pago entra em "preparo" (por isso não avisa).
- O gatilho do banco `orders_notify_push` dispara push para os celulares do lojista em TODO pedido inserido, inclusive PDV.
- O PDV nunca manda a comanda para impressão: a impressão só existe nos fluxos de "Aceitar" / aceite automático.
- Não existe campo que diga a origem do pedido (loja online x PDV).

## Passos
1. Banco (migração): coluna `orders.source` (texto, padrão `storefront`; valores `storefront` | `pdv`). Atualizar `notify_order_push()` para não chamar o endpoint de push quando `source = 'pdv'`.
2. `createManualOrder` (src/lib/orders.functions.ts): gravar `source: 'pdv'`, forçar `status: 'preparo'` e `accepted_at` preenchido; histórico "Pedido lançado via PDV"; devolver o pedido completo com itens (para imprimir sem nova consulta).
3. Painel (src/hooks/useOrdersRealtime.ts + order-adapters): expor `source` no pedido da interface e, como segurança extra, tratar qualquer pedido `pdv` como já visto (sem toast, sino, alerta nem som), inclusive na carga inicial e no polling.
4. PDV (src/routes/admin.pdv.tsx): no sucesso, chamar `printKitchenFor(pedido, { automaticNewOrder: true })` do hook `useAcceptOrderWithKitchenPrint`. Usa a impressora configurada (QZ ou Bluetooth), layout via `buildKitchenTicketForPrinter` e vias duplicadas do automático. Falha de impressão não desfaz o pedido: aparece erro com botão "Reimprimir". Mantém o toast de sucesso do próprio lançamento ("Pedido #X lançado") que é feedback local, não notificação de pedido novo.
5. Regras: impressão segue o plano Pro (já exigido por `kitchenPrinter`); sem impressora configurada, mostra o aviso "Configurar impressora" existente.

## Detalhes técnicos
- Pedidos antigos ficam como `storefront` (padrão) — nenhum dado histórico é alterado.
- A relação com caixa/relatórios não muda: pagamento e `payment_status` continuam como estão; só o status inicial passa a ser sempre `preparo`.
- Impressão disparada só no navegador que lançou o pedido (evita duplicar em outros aparelhos). O processamento de pendentes ao abrir o painel não reimprime PDV porque o pedido não está "novo".

## Testes
- Typecheck; Playwright autenticado no PDV (Burguer Prime): lançar pedido em dinheiro, conferir pedido em "Em preparo", ausência de toast/sino, chamada de impressão (sem impressora física: confere o aviso/ação de reimpressão).
- Conferir no banco `source='pdv'` e que o gatilho de push não dispara para PDV.
- Não testável aqui: impressão física (QZ/Bluetooth) e push real no celular.
