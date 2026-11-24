# Respeitar horário de fechamento mesmo com a loja aberta manualmente

## O que aconteceu com o pedido #1550
- Loja: Pastelão Sousa. Pedido feito no **sábado, 21/11, às 23:33** (horário de Brasília), pago por Pix Online.
- O horário configurado para sábado é **18:00 às 23:20**, então a loja já devia estar fechada.
- Ela estava no modo **"Aberta" manual**. Nesse modo, o sistema ignora totalmente o horário e a loja continua aberta até alguém fechar à mão.
- Além disso, ao criar o pedido o sistema não confere se a loja está aberta: ele aceita o pedido mesmo que a página da loja estivesse aberta desde antes das 23:20.
- O pedido foi cancelado no dia seguinte ("Item fora de estoque"). Ainda é preciso devolver o Pix ao cliente pelo Mercado Pago, se isso não tiver sido feito.

## O que muda
1. **Abrir manualmente passa a valer só até o fechamento do dia.** Se a loja for aberta antes do horário, ela abre na hora, mas fecha sozinha no horário de fechamento configurado para o dia (no sábado, às 23:20). Em dias marcados como fechados, usa o horário de fechamento cadastrado para aquele dia.
2. **O pedido é conferido na hora de criar.** Se a loja estiver fechada, o pedido é recusado antes de qualquer cobrança, e o cliente vê "A loja fechou às 23:20. Não estamos aceitando pedidos agora." Vale para o checkout da loja e para o atendente de IA. Pedidos agendados continuam funcionando como hoje.
3. **No painel:** o botão "Aberta" mostra "Aberta manualmente até 23:20" e, depois desse horário, mostra a loja como fechada.
4. O PDV (pedidos lançados pela própria loja) não é bloqueado.

## Detalhes técnicos
- `src/lib/store-hours.ts` → `computeStoreOpen`: no modo `open`, se existir horário com fechamento válido para o dia e o horário atual já tiver passado do fechamento, retorna `open:false` com o motivo "Fechou às HH:MM". Se não houver horário cadastrado, mantém o comportamento manual atual.
- `src/lib/orders.functions.ts` `createOrder` (e o caminho de criação do agente de IA): buscar `open, open_mode, hours_schedule` do tenant e chamar `computeStoreOpen`. Se a loja estiver fechada e o pedido não for agendado (`scheduled_for` ausente), lançar erro em pt-BR antes de criar o pedido ou o pagamento. Pular para `source = 'pdv'`.
- Testes em `tests/` para os casos: aberta manualmente às 23:33 com fechamento às 23:20 → fechada; às 17:00 → aberta; às 23:00 → aberta.
