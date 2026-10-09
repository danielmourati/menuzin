# Atendente com IA no cardápio da loja (Pro)

## O que o cliente vê
- Botão "Pedir conversando" no cardápio da loja (só lojas Pro com o atendente ligado).
- Janela de conversa: o cliente escreve como no WhatsApp ("quero 2 pastel de carne grande, um com catupiry, entrega na rua X, pago no pix").
- A IA responde de forma simpática, tira dúvidas (ingredientes, tamanhos, preços, horário, taxa, cupons, promoções do dia), sugere adicionais e avisa quando algo está indisponível, oferecendo alternativa.
- Ao final mostra um **cartão de resumo** (itens, adicionais, observações, endereço, taxa, cupom, troco, forma de pagamento, total) com botões **Confirmar pedido** e **Alterar**.
- Só depois do "Confirmar" o pedido é criado: entra no Kanban, segue o aceite automático e a impressão automática como qualquer pedido do site, e o cliente é levado para o acompanhamento do pedido.
- A conversa fica salva: se o cliente fechar e voltar, continua de onde parou.

## O que o lojista vê
- Configurações > Atendente IA: ligar/desligar, nome do atendente, tom (descontraído / formal), mensagem de boas-vindas e instruções extras ("não fazemos troca de recheio").
- Tela "Conversas" no painel: lista das conversas da loja, leitura completa, e marca de qual virou pedido (com link para o pedido).
- Pedidos vindos da IA ganham o selo "Via atendente IA" no card e na comanda.

## Regras de segurança do pedido
- A IA **nunca define preço**. Ela só escolhe produtos, tamanhos, sabores e adicionais pelo código interno; o servidor recalcula tudo a partir do cardápio real.
- Produtos/adicionais indisponíveis, inativos ou de outra loja são recusados com motivo, e a IA ajusta a conversa.
- Cupom, taxa de entrega (bairro/KM), horário de funcionamento, agendamento, regras de troco e notas de R$100/200 usam exatamente as mesmas validações do checkout.
- Itens obrigatórios (pizzas, vários sabores, quentinhas com grupo obrigatório) só são aceitos com as escolhas completas; a IA pergunta o que falta.
- Nome e WhatsApp são pedidos antes de confirmar (aproveitando o perfil salvo do cliente quando existir).
- Limite de mensagens por conversa/aparelho para evitar abuso e custo.

## Etapas
1. Banco: conversas e mensagens por loja, configurações do atendente, marca de origem do pedido.
2. Ferramentas da IA (lado servidor): consultar cardápio, ver produto, ver cupons/promoções, calcular taxa pelo CEP/endereço, montar/alterar rascunho do carrinho, gerar resumo.
3. Criação do pedido a partir do rascunho confirmado reutilizando a mesma rotina do checkout.
4. Janela de conversa na loja + cartão de resumo.
5. Configurações e tela "Conversas" no painel.
6. Testes ponta a ponta na Burguer Prime e Pastelão Sousa (pastel 2 sabores, entrega por KM, cupom, troco).

## Detalhes técnicos
- Tabelas: `ai_agent_settings` (tenant_id, enabled, name, tone, greeting, extra_instructions), `ai_conversations` (id, tenant_id, customer_device_token, customer_id, status, order_id, draft jsonb), `ai_messages` (id uuid, conversation_id, role, parts jsonb, ai_message_id text). RLS: staff da loja lê as conversas do próprio tenant; cliente acessa só via servidor com o device token já usado em /meus-pedidos. `orders.source` ('site'|'pdv'|'ai_agent').
- Rota de streaming `src/routes/api/public/ai-chat.ts` (valida loja Pro + agente ligado + token do aparelho + rate limit em `rate-limit.server`), AI SDK `streamText` com `openai/gpt-6-astra` via Lovable AI Gateway (Responses API, `store:false`, reasoning `low`), tools com Zod e `stopWhen` adequado.
- Contexto: resumo compacto do cardápio ativo (categorias, produtos, tamanhos, grupos de adicionais com mínimos/máximos, preços), cupons públicos válidos, promoções, horário e modos de entrega; itens inativos listados só por nome para a IA saber recusar.
- Tool `update_draft` grava o rascunho estruturado na conversa; `confirm_order` não existe para a IA — a confirmação vem do botão do cliente, que chama server function que monta o pedido com preços recalculados por `computeUnitPrice`/`product-selection` e chama a lógica comum extraída de `createOrder` (idempotência pela conversa).
- UI com AI Elements (Conversation, Message, PromptInput, Tool recolhido) e identidade própria do atendente (não genérica); markdown nas respostas.
- Erros 402/429 do gateway exibem aviso amigável e o botão "Finalizar pelo cardápio".
