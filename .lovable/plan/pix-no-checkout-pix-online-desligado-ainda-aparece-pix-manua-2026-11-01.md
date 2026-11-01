# Pix no checkout: Pix Online desligado ainda aparece, Pix Manual não aparece

## O que encontrei
- No banco, o Pastelão Junin está com **Pix Online desligado**, **Pix Manual ligado** e **Cartão de Crédito Online ligado**. O servidor envia ao checkout exatamente esses valores.
- **Pix Manual não aparece** porque o checkout só o mostra em "Pagar na entrega/retirada". Quando o cliente escolhe "Pagar agora", ele vê só os métodos do Mercado Pago (Pix Online e Cartão Online), mesmo o Pix Manual sendo um pagamento feito na hora.
- **O Pix Online ainda aparece**, mesmo desligado, por um motivo que ainda não confirmei. Suspeitas: o site publicado está com uma versão antiga, a tela de pagamento ficou aberta com as opções antigas, ou é outra loja. Vou reproduzir isso antes de corrigir.
- **O aviso "Aguardando confirmação do Pix pelo Mercado Pago"** aparece no painel ao aceitar um pedido pago online que o Mercado Pago ainda não aprovou. O texto sempre fala em Pix, mesmo quando o pagamento foi com **Cartão Online**. Isso confunde e parece que o Pix Online continua ativo.

## O que vou mudar
1. **Pix Manual em "Pagar agora"**: com o Pix Manual ligado, ele aparece como opção em "Pagar agora", abaixo dos métodos online. Os pedidos continuam entrando como hoje, com a chave Pix e o envio do comprovante.
2. **"Pagar agora" sem métodos online**: o aviso "Nenhum método online ativado" só aparece quando não houver nenhuma opção, nem o Pix Manual.
3. **Pix Online desligado nunca aparece**: as opções de pagamento são recarregadas sempre que o cliente abre a tela de pagamento. Se o cliente já tinha escolhido Pix Online e ele foi desligado, a escolha é apagada. O servidor já recusa Pix Online desligado; isso continua igual.
4. **Aviso certo no painel**: a mensagem diz o método real ("Aguardando confirmação do pagamento online (Cartão) pelo Mercado Pago" ou "…do Pix…"). Ela só aparece para pagamentos online de verdade, nunca para Pix Manual, Dinheiro ou Maquininha.
5. **Testes**: Pix Manual e Dinheiro passam pela trava. Cartão Online não aprovado fica bloqueado com a mensagem de cartão.

## Verificação
- Abrir o checkout do Pastelão Junin no navegador: em "Pagar agora", conferir que Pix Online não aparece e Pix Manual aparece.
- Depois de publicar, conferir também no site no ar.

## Detalhes técnicos
- `PaymentMethodSelector.tsx`: mostrar `pix_manual` dentro do ramo `agora`, e ajustar a condição do aviso de "nenhum método".
- `CartDrawer.tsx`: buscar `getPaymentSettingsBySlug` de novo ao entrar na etapa de pagamento, e limpar `selectedMethod` quando ele não estiver mais habilitado.
- `order-payment-gate.ts`: trocar a constante por `paymentWaitingMessage(label)`; usar em `useAcceptOrderWithKitchenPrint.ts` e `orders.functions.ts`.
- Testes em `tests/order-payment-gate.test.ts`.
