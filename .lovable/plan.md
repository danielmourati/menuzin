# Pix Online aprovado → ir direto para "Acompanhar pedido"

## Problema
Quando o Mercado Pago confirma o Pix, a tela volta para "Revisar pedido" com o botão "Fazer pedido". O pedido já existe e já está pago, então o cliente fica confuso e pode tentar pedir de novo.

## O que muda
1. Quando o pagamento é confirmado, a tela de Pix mostra "Pagamento confirmado!" com um check verde e "Pedido #N pago com sucesso" por cerca de 1,5 s.
2. Em seguida o carrinho fecha sozinho, é limpo, e o cliente vai para a página de confirmação/acompanhamento do pedido. Lá aparece um aviso verde: "Pagamento via Pix confirmado".
3. O cliente não volta mais para "Revisar pedido" depois de pagar. O mesmo vale para o Cartão Online, que hoje faz o mesmo retorno.

## Detalhes técnicos
- `CartDrawer.tsx`: extrair do `handleSubmit` (linhas ~998-1061) uma função `finishOrder(orderId, number, paymentStatus)` (sessionStorage, `saveLastOrderForSlug`, `clear`, `clearActiveCoupon`, fechar, `resetAll`, `navigate` para `/$slug/pedido-confirmado`). `PixCheckout onSuccess` e `CardCheckout onSuccess` passam a chamar `finishOrder` com `paymentStatus: "approved"`, em vez de `goTo("review")`.
- O `onSuccess` do Pix envia o pedido já persistido (`dbOrderId`/`dbOrderNumber`), sem criar outro.
- `PixCheckout.tsx`: deixar mais claro o estado `approved` (título + número do pedido) antes do redirecionamento que já acontece em 1,5 s.
- `$slug.pedido-confirmado.tsx` (e a versão `loja.`): ler `payment_status` do pedido salvo e mostrar o aviso "Pagamento confirmado" quando for `approved`.
- Conferir no navegador simulando a aprovação (mock do status) para ver se a página de confirmação abre.
