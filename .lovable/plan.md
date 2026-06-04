## Objetivo

Garantir que o bairro selecionado e a taxa de entrega calculada pela zona apareçam em três pontos: resumo do carrinho, mensagem do WhatsApp e cupom impresso (preview + impressão real via admin).

## O que já existe (sem mexer)

- `CartDrawer` já calcula `deliveryFee` automaticamente quando o cliente escolhe o bairro (zona) — `zones.find(...).fee`. Mantido.
- `createOrder` já persiste `delivery_fee` e o `address.neighborhood` no pedido.
- `PrintOrderButton` → `printOrderViaQz` → `buildReceipt` já recebe o `Order` completo (com `deliveryFee` e `address.neighborhood`). Não precisa alterar o botão.

## Mudanças

### 1) `src/components/storefront/CartDrawer.tsx` — resumo da revisão

- Bloco "Entrega": destacar o bairro escolhido como linha própria `Bairro: <nome>` (hoje aparece concatenado com endereço) e mostrar `Taxa de entrega: R$ X,XX` logo abaixo. Para retirada/consumo, nada muda.
- Bloco "Itens do pedido": já lista `Taxa de entrega` quando > 0. Adicionar logo abaixo a linha `Total` em negrito para fechar o resumo.
- Corrigir rótulo do `StickySubtotal` (hoje exibe `total` rotulado como "Subtotal") para mostrar:
  - "Subtotal" + `subtotal`
  - quando `deliveryFee > 0`: "Taxa de entrega" + `deliveryFee` em texto menor
  - "Total" + `total` em destaque
- Quando `selectedZone?.min_order_total > 0`, exibir um aviso discreto: "Pedido mínimo neste bairro: R$ X,XX" (já bloqueado em `confirmAddress`, agora visível no review também).

### 2) `src/lib/whatsapp.ts` — mensagem do WhatsApp

- No bloco `*Endereço:*`, adicionar linha explícita `Bairro: <neighborhood>` (separada de rua/número) para destaque.
- Já imprime `Taxa de entrega: R$ X,XX` quando > 0 — manter.
- (Opcional) se a chamada passar um `deliveryZoneName` distinto do bairro, exibir "Zona de entrega: ...". Não é necessário pela estrutura atual; o bairro É a zona.

### 3) `src/lib/receipt-builder.ts` — cupom impresso (preview + impressão real)

- Bloco `Entrega:`: imprimir `Bairro: <neighborhood>` em linha própria (hoje sai como texto solto), e quando `order.deliveryFee > 0` repetir a linha `Taxa entrega  R$ X,XX` dentro do bloco de entrega para ficar próximo ao bairro (o totalizador permanece igual).
- Manter o bloco de totais como está (Subtotal / Taxa entrega / TOTAL já saem corretamente quando `deliveryFee > 0`).
- Não imprimir "pedido mínimo" no cupom — é informação de pré-venda, irrelevante no comprovante já confirmado.

### 4) Sem alterações de código necessárias

- `PrintOrderButton.tsx` e `PrintableOrder.tsx`: já consomem `Order.deliveryFee` e `Order.address.neighborhood`. Após (3) o resultado impresso passa a destacar o bairro + taxa automaticamente.
- Banco/migration: não há mudanças de schema. Os campos já são persistidos.

## Validação manual

1. Loja com zonas cadastradas → checkout entrega → escolher bairro: taxa preenche automaticamente, review mostra "Bairro" + "Taxa de entrega" + "Total".
2. Finalizar pedido → mensagem do WhatsApp inclui linha "Bairro: ..." e "Taxa de entrega: ...".
3. Admin → Pedidos → Imprimir: cupom mostra "Bairro" e "Taxa entrega" no bloco de entrega + totalizador.
