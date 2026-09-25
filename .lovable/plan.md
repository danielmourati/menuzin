# Robozinho de WhatsApp com IA (Pro)

Um atendente virtual que responde os clientes da loja no WhatsApp, com tom humano e usando dados reais da loja: cardápio, preços, horário, taxas de entrega e formas de pagamento. O lojista vê todas as conversas no painel e pode assumir quando quiser. É exclusivo do plano Pro.

## Como funciona para o lojista

1. **Conectar o WhatsApp**: em Configurações > Robozinho, clica em "Conectar", aparece um QR Code e ele escaneia com o WhatsApp da loja (um número por loja).
2. **Personalizar**: liga/desliga o robô, escolhe o nome do atendente (ex: "Zin"), o tom (descontraído/formal), escreve uma saudação e avisos extras (ex: "não fazemos entrega depois das 23h").
3. **Caixa de conversas** (nova tela "Conversas"): lista de clientes com a última mensagem; ao abrir, vê a conversa inteira, com as mensagens do robô marcadas.
   - Botão **"Assumir atendimento"**: pausa o robô naquela conversa e o lojista responde ali mesmo.
   - Botão **"Devolver ao robô"**.
   - O robô também pausa sozinho quando o lojista responde pelo celular.
4. Loja no plano Presença vê a tela bloqueada com convite para o Pro.

## Como funciona para o cliente

- Manda "oi" no WhatsApp da loja e recebe resposta em poucos segundos, com "digitando..." para parecer natural.
- Pode perguntar: "tem pizza de calabresa?", "quanto é a entrega no bairro Centro?", "vocês aceitam Pix?", "estão abertos?".
- Para pedir, o robô sempre manda o link do cardápio online da loja (o robô não monta pedidos nesta primeira versão).
- Se não souber algo, diz com sinceridade e avisa que um atendente vai responder, marcando a conversa como "precisa de atenção" no painel.
- Nunca inventa preços ou produtos: só usa o que está cadastrado.

## Regras de segurança e custo

- Robô não responde em grupos, nem a mensagens do próprio número.
- Limite de respostas por cliente por minuto para evitar abuso.
- Mensagens seguidas do cliente em poucos segundos são juntadas numa só resposta.
- Se os créditos de IA acabarem, o robô para e a conversa vira "precisa de atenção"; o lojista é avisado.

## O que você precisa providenciar

- Um servidor com a **Evolution API** instalada (VPS com Docker, ex: Hostinger/Contabo, ou Easypanel/Coolify). Depois de pronto, vou pedir de forma segura: o endereço do servidor e a chave de administrador.
- Cada loja conecta o próprio número pelo QR Code; não é preciso nada seu por loja.

## Detalhes técnicos

- **Evolution multi-instância**: uma instância por tenant (`tenant-<id>`), criada via `instance/create` pelo servidor; QR via `instance/connect`; webhook da instância apontando para `/api/public/evolution-webhook/<tenantId>` com token por instância (gerado e guardado criptografado). Reativar `evolution-client.server.ts` (remover `EVOLUTION_DISABLED`), parametrizando a instância.
- **Secrets**: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` (via add_secret após confirmação). IA pelo Lovable AI Gateway (`LOVABLE_API_KEY`), modelo `openai/gpt-6-astra`, Responses API com streaming consumido no servidor, reasoning `low`.
- **Tabelas** (com GRANTs + RLS por `tenant_id` para owner/admin; escrita de mensagens só via servidor):
  - `whatsapp_bot_settings` (tenant_id, enabled, bot_name, tone, greeting, extra_instructions, instance_name, instance_status, webhook_token_enc)
  - `whatsapp_conversations` (tenant_id, customer_phone, customer_name, mode `bot|human`, needs_attention, last_message_at, paused_until)
  - `whatsapp_messages` (conversation_id, tenant_id, direction `in|out`, author `customer|bot|staff`, body, external_id único para idempotência, created_at)
  - Realtime em conversas/mensagens para a caixa atualizar ao vivo.
- **Webhook** (`src/routes/api.public.evolution-webhook.$tenantId.ts`): valida token, ignora grupos/`fromMe` (mas `fromMe` vindo do celular do lojista → modo humano por 30 min), dedup por `external_id`, grava mensagem, aplica debounce curto e responde 200 rápido.
- **Resposta da IA** (`whatsapp-bot.server.ts`): monta contexto com dados reais (categorias/produtos ativos com preços, horário e aberto/fechado, zonas/taxas, métodos de pagamento, endereço, link do cardápio `https://menuzin.app/<slug>`) + últimas ~20 mensagens; tools de consulta (`buscar_produto`, `taxa_entrega_bairro`, `status_loja`) com schemas simples; envia via Evolution com presença "digitando". Erros 402/403/429 do gateway tratados conforme regras (pausa + needs_attention).
- **Server functions** (`whatsapp-bot.functions.ts`, `requireSupabaseAuth` + verificação Pro): conectar/QR, status, desconectar, salvar configurações, listar conversas, mensagens, enviar mensagem do lojista, assumir/devolver.
- **Telas**: `admin.robozinho.tsx` (configurar/conectar) e `admin.conversas.tsx` (caixa), itens no menu lateral com `PlanGate` Pro.
- **Verificação**: teste do webhook com payload simulado, chamada real ao gateway verificando a resposta, e Playwright na caixa de conversas logado.
