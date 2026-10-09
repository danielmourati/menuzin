# Atalhos editáveis e chamada de atendente humano no chat da IA

## 1. Mensagens de atalho editáveis pelo lojista
- Em Atendente IA, nova aba **Atalhos**: criar, editar, apagar, ligar/desligar e ordenar (setas) as sugestões que aparecem no início da conversa ("O que vocês têm hoje?", "Quais os mais pedidos?", "Tem cupom?").
- Cada atalho tem: texto do botão e mensagem enviada (opcional; se vazia, envia o próprio texto).
- Lojas sem atalhos cadastrados continuam vendo os três atuais como padrão.
- Limite de 8 atalhos ativos e 80 caracteres por texto.

## 2. "Ver carrinho" só com itens
- O botão **Ver carrinho** some enquanto o pedido estiver vazio (como no print) e aparece assim que o primeiro item entra. Os demais atalhos de fechamento seguem a mesma regra atual.

## 3. Chamar atendente humano (não existe hoje)
Cliente:
- Botão **Falar com atendente** no topo da conversa; frases como "quero falar com uma pessoa" fazem a IA oferecer o mesmo.
- Ao chamar: aviso "Chamamos alguém da loja, aguarde um instante 🙂", a IA para de responder nessa conversa e as mensagens do cliente ficam guardadas para a loja.
- Opção de abrir o WhatsApp da loja já com o resumo do carrinho, para não ficar sem resposta.

Lojista:
- Aviso no sino do painel, som curto e notificação no celular (push já existente): "Cliente pediu atendimento humano".
- Em Atendente IA > Conversas: selo **Aguardando atendente**, filtro, e na conversa o lojista pode responder por escrito, **Devolver para a IA** ou **Encerrar**.
- Respostas do lojista aparecem no chat do cliente quase em tempo real.

Regras mantidas: o pedido continua sendo criado só pelo botão **Confirmar pedido** do cliente, com preços recalculados pela loja.

## Detalhes técnicos
- Migração: tabela `ai_quick_replies` (tenant_id, label, message, active, sort_order) com GRANT + RLS (staff do tenant gerencia; leitura pública só via server function por slug). Em `ai_conversations`: `handoff_status` ('none'|'requested'|'human'|'closed'), `handoff_requested_at`. Em `ai_messages`: role 'staff' permitido.
- `ai-agent.functions.ts`: CRUD autenticado de atalhos; `getAgentPublicInfo` retorna atalhos ativos; `requestHumanHandoff` (accessKey); `listMyHandoffs`, `sendStaffReply`, `setHandoffStatus`.
- `api.public.ai-chat.ts`: se `handoff_status` ≠ 'none', salva a mensagem e não chama o modelo; nova tool `request_human` para a IA marcar o pedido.
- `AiOrderChat.tsx`: atalhos vindos do servidor, "Ver carrinho" condicionado a `priced.lines.length`, botão de handoff e polling (5s) das novas mensagens enquanto aguardando/humano.
- Aviso ao lojista: canal realtime de `ai_conversations` no painel + push via `push-notifications.server.ts`.
