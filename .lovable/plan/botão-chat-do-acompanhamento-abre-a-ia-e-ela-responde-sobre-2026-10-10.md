# Botão "Chat" do acompanhamento abre a IA e ela responde sobre o pedido

## O que muda para o cliente
- Na tela "Pedido #1053", o botão **Chat** abre o chat da IA da loja (mesma janela do cardápio), já falando sobre aquele pedido, em vez de abrir o WhatsApp.
- A IA abre com algo como: "Oi, Pedro! Seu pedido #1053 está **Em preparo** desde 01h28. Posso ajudar em algo?"
- O cliente pode perguntar "meu pedido já saiu?", "quanto falta?", "qual o total?", "qual endereço?" e a IA responde com dados reais: status atual, linha do tempo, previsão de entrega/retirada, itens, total, pagamento/troco, endereço, entregador (quando despachado) e agendamento.
- Em conversa comum do cardápio, se o cliente perguntar sobre um pedido, a IA usa os pedidos já feitos naquela conversa ou neste aparelho (os mesmos de "Meus pedidos").
- Se a loja não tiver a IA ativa (não Pro ou desligada), o botão continua abrindo o WhatsApp como hoje.
- O atendente humano (fone) segue disponível no chat do pedido; o atendente vê no painel "Conversa sobre o pedido #1053".

## Regras
- A IA só lê o pedido; não cancela, não altera nem promete prazos além da previsão configurada. Pedidos de cancelamento/troca são encaminhados ao atendente humano.
- O cliente só vê o pedido que ele mesmo tem acesso (link privado do pedido); a IA nunca busca pedido por número digitado de outra pessoa.
- No chat de pedido, a IA não inicia um novo pedido a menos que o cliente peça.

## Detalhes técnicos
- `AiOrderChat.tsx`: exportar `AiOrderChatWindow` com prop opcional `orderId`; conversa separada salva em localStorage por pedido (`ai-chat:<slug>:order:<id>`). `CustomerOrderTracking.tsx`: Chat vira botão que abre a janela quando `getAgentPublicInfo` indica IA ativa; senão mantém link WhatsApp.
- Conversa: ao criar, gravar `ai_conversations.order_id` com o UUID do pedido (só aceito se o pedido pertence ao tenant do slug; o UUID funciona como chave privada, igual ao link de acompanhamento).
- `api.public.ai-chat.ts`: quando a conversa tem `order_id`, carregar via `supabaseAdmin` o pedido + `order_status_history` + entregador e injetar bloco "PEDIDO DO CLIENTE" nas instruções (recarregado a cada mensagem, então o status é sempre atual). Adicionar instrução de tom e de encaminhar cancelamentos ao humano.
- Conversas sem `order_id`: incluir pedidos já criados por essa conversa (status `ordered`) e uma lista opcional de IDs de pedidos do aparelho enviada pelo cliente, validada contra o tenant (máx. 5, últimos 2 dias).
- Saudação inicial do chat de pedido gerada no cliente com status/horário já carregados pela tela de acompanhamento.
- Painel `admin.atendente-ia.tsx`: mostrar selo "Sobre o pedido #N" (já existe join `orders(number)`).
- Sem mudanças de preço/criação de pedido; regra de confirmação pelo cliente permanece.
