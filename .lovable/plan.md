# Testar e corrigir o som de novo pedido ao vivo

## O que vamos fazer
1. **Reproduzir o seu teste na prévia:** abrir o painel de pedidos com uma sessão de lojista e fazer um pedido real pela loja em outra janela. Vamos medir se o painel recebe o sinal na hora, se o pedido aparece na lista e se o som é disparado.
2. **Descobrir em que etapa falha.** Vamos conferir cada uma, nesta ordem:
   - O servidor envia o sinal quando o pedido é criado (registro do servidor e resposta do envio).
   - O painel está inscrito no canal da loja e recebe o sinal.
   - O pedido chega com status "novo". Pedidos com Pix online podem chegar com outro status, ou só ficar "novos" depois do pagamento, e aí hoje o som não toca.
   - A regra "pedido novo" deixa o pedido passar: horário de referência, lista de já vistos e trava entre abas.
   - O som em si: áudio liberado, arquivo carregado e som de reserva.
3. **Corrigir a causa encontrada.** Se o pedido só vira "novo" depois do Pix, também mandamos o sinal quando o pagamento é aprovado.
4. **Validar de novo de ponta a ponta:** com a aba aberta, com a aba em segundo plano e depois de recarregar a página. Neste último caso, o pedido antigo não deve tocar.

## Detalhes técnicos
- Playwright com sessão injetada em `/admin/pedidos`. Substituir `playNotificationSound` por uma função espiã via `window` e escutar o canal `tenant-orders:<tenant>`. Criar o pedido pela loja do tenant de teste.
- Conferir `signalNewOrder` (`/realtime/v1/api/broadcast` com chave `sb_secret` e só o header `apikey`; checar o status HTTP e registrar a falha). Confirmar se o canal público aceita mensagens enviadas pela REST.
- Chamar `signalNewOrder` também no webhook ou na confirmação do pagamento aprovado. Revisar `runTick`/`processNewOrders`: o filtro `status === "novo"` e o caso em que `globalBaselineMs` vale 0 quando a lista está vazia.
- Cancelar os pedidos de teste no final.
