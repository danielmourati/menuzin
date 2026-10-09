# Ações rápidas na conversa do atendente IA

## Objetivo
Deixar o encerramento da conversa mais natural, oferecendo ao cliente caminhos claros para revisar o pedido, completar o pagamento e confirmar quando já terminou de escolher.

## Experiência do cliente
- Exibir ações rápidas amigáveis dentro da conversa, conforme o estado do pedido: **Ver carrinho**, **Seguir para pagamento**, **Ok, já terminei** e **Finalizar pedido**.
- **Ver carrinho** leva o cliente ao resumo atual sem enviar uma mensagem desnecessária; se ainda não houver itens, o atendente responde de forma simpática e ajuda a começar o pedido.
- **Seguir para pagamento** faz o atendente pedir a forma de pagamento e, quando necessário, o valor para troco, mantendo as opções já aceitas pela loja.
- **Ok, já terminei** informa ao agente que não haverá mais itens; ele verifica o que ainda falta e conduz o cliente um dado por vez.
- **Finalizar pedido** mostra o resumo e o botão de confirmação quando tudo estiver completo; se faltar endereço, nome, WhatsApp, recebimento ou pagamento, o agente solicita primeiro o próximo dado necessário.
- Depois de cada alteração, manter as ações visíveis e atualizadas sem duplicar cartões de resumo.

## Segurança e regras do pedido
- A IA continuará sem permissão para criar pedidos diretamente.
- O pedido só será enviado ao Kanban e à impressão após o cliente tocar em **Confirmar pedido** no resumo.
- Valores, taxa, cupom, adicionais e troco continuarão sendo recalculados pelo servidor a partir do cardápio e das regras reais da loja.
- Frases digitadas pelo cliente com o mesmo sentido — como “quero fechar”, “ver meu carrinho”, “ir para pagamento” ou “já terminei” — seguirão o mesmo fluxo dos botões.

## Implementação técnica
- Ajustar o estado da conversa em `AiOrderChat.tsx` para apresentar atalhos contextuais e rolar até o resumo ao escolher **Ver carrinho**.
- Expor no estado público do rascunho os campos pendentes e erros já calculados, para decidir quais ações devem aparecer sem duplicar validações no navegador.
- Enviar as demais ações como intenções curtas pelo fluxo de streaming existente, preservando histórico, foco do campo e indicador de resposta.
- Reforçar as instruções do agente em `api.public.ai-chat.ts` para reconhecer essas intenções, responder no tom configurado pela loja e conduzir o preenchimento sem confirmar sozinho.
- Manter o cartão atual de resumo como única etapa de confirmação final.

## Validação
- Testar pedido vazio, pedido com itens incompletos, pedido aguardando pagamento e pedido totalmente pronto.
- Confirmar que os quatro atalhos exibem a resposta correta e que frases equivalentes digitadas produzem o mesmo resultado.
- Confirmar que nenhum atalho cria pedido antes do toque em **Confirmar pedido**.
- Concluir um pedido de teste e verificar entrada no Kanban, acompanhamento e impressão pelo fluxo já existente.