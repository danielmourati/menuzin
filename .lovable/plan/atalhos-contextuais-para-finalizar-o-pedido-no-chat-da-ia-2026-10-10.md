# Atalhos contextuais para finalizar o pedido no chat da IA

## Objetivo
Reduzir a digitação e deixar o fechamento guiado: o cliente toca em **Finalizar pedido** e passa a escolher recebimento e pagamento por botões exibidos logo após a pergunta da IA.

## Experiência do cliente
- Remover as ações fixas **Ver carrinho**, **Seguir para pagamento** e **Ok, já terminei**.
- Manter somente **Finalizar pedido** quando houver itens no pedido.
- O resumo do pedido continua visível e atualizado na conversa, sem depender do antigo botão **Ver carrinho**.
- Ao tocar em **Finalizar pedido**, a IA verifica o que falta e conduz uma etapa por vez.
- Quando a IA perguntar como o cliente quer receber, mostrar logo abaixo da mensagem apenas as opções habilitadas pela loja: **Entrega**, **Retirada** e/ou **Consumo no local**.
- O toque em uma opção envia a escolha para a conversa e atualiza o rascunho com a mesma validação atual.
- Depois da escolha:
  - **Entrega:** seguir com CEP ou rua, número e bairro, sempre na cidade da loja.
  - **Retirada:** seguir para o próximo dado pendente.
  - **Consumo no local:** solicitar a identificação da mesa antes de avançar.
- Quando chegar à forma de pagamento, mostrar somente os métodos manuais habilitados pela loja: **Dinheiro**, **Pix manual**, **Crédito na maquininha** e/ou **Débito na maquininha**.
- Para dinheiro, a IA continua perguntando por botões/texto se precisa de troco e para quanto; métodos indisponíveis não aparecem.
- Depois de cada toque, ocultar os botões daquela etapa para evitar escolhas duplicadas. O campo de texto permanece disponível para respostas livres e correções.
- Quando todos os dados estiverem completos, manter o resumo final e o botão seguro **Confirmar pedido**; a IA nunca cria o pedido sozinha.

## Configuração da loja
- Enviar ao chat público as modalidades de recebimento e formas de pagamento realmente habilitadas no painel da loja.
- Os atalhos iniciais editáveis do lojista continuam funcionando apenas no começo da conversa; esta mudança afeta as ações de fechamento geradas pelo sistema.

## Detalhes técnicos
- Ampliar as informações públicas do atendente com capacidades seguras da loja, sem expor dados privados de pagamento.
- Em `AiOrderChat.tsx`, substituir o bloco atual de quatro ações por um único botão de finalização e por sugestões contextuais associadas à etapa pendente do rascunho.
- Usar o estado calculado pelo servidor (`draft`, `missing`, `errors`) para decidir a etapa, sem interpretar o texto da IA no navegador.
- Ajustar `api.public.ai-chat.ts` para a IA perguntar uma etapa por vez e reconhecer exatamente as intenções enviadas pelos novos botões.
- Preservar `priceDraft`, `update_draft` e `confirmAgentOrder` como fontes da verdade para endereço, taxa, métodos, valores e criação do pedido.

## Validação
- Testar lojas com combinações diferentes de entrega, retirada, consumo local e pagamentos habilitados.
- Testar entrega completa, retirada, consumo com mesa e dinheiro com/sem troco.
- Confirmar que os botões aparecem depois da pergunta correspondente, somem após a escolha e nunca oferecem opção desativada.
- Confirmar que nenhum toque cria o pedido antes de **Confirmar pedido**.
- Verificar o fluxo em celular com o teclado aberto e fechado, mantendo os atalhos e o campo de texto visíveis.
