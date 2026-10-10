# Atendimento humano no chat, pedidos por áudio e localização do cliente

## 1. Corrigir: pedido de atendente do Pedro Henrique não aparece
O pedido de atendimento do Pedro chegou e está salvo no sistema (às 01:29), numa conversa nova, aberta depois do pedido #1053. A lista de Conversas mostra só a conversa antiga com o pedido, então o aviso some.
- Conversas aguardando atendente sempre aparecem no topo da lista, com selo vermelho, mesmo que o cliente tenha outra conversa com pedido.
- O sino e o som do painel avisam assim que alguém chama, e o aviso abre direto na conversa.
- O cliente pode chamar pelo ícone de headphone **ou** escrevendo no chat ("quero falar com alguém", "atendente"). A loja reconhece essas frases mesmo se a IA não chamar a ferramenta.

## 2. Atendente assume a conversa
- Ao abrir uma conversa aguardando, o atendente vê **todo o histórico** (mensagens do cliente, respostas da IA, carrinho atual com itens, endereço, pagamento e total).
- Botão **Assumir atendimento**: marca "Com a loja", o cliente recebe "Fulano da loja entrou na conversa" e a IA para de responder.
- Depois disso o atendente responde pelo campo de texto; as respostas chegam ao cliente em poucos segundos.
- Botões **Devolver para a IA** e **Encerrar** continuam.
- Correção junto: textos da IA com **negrito** passam a aparecer formatados no painel (hoje aparecem os asteriscos).

## 3. Pedido por áudio
- Botão de microfone no campo de mensagem do chat (segurar/tocar para gravar, até 60 s).
- O áudio é transcrito e entra na conversa como mensagem do cliente ("🎤 transcrição: ..."), e a IA segue o pedido normalmente.
- Durante atendimento humano, o áudio também é transcrito e guardado para o atendente ler (com opção de ouvir o original).
- Regras mantidas: a IA só escolhe itens do cardápio, preços calculados pela loja, pedido só criado pelo botão **Confirmar pedido** do cliente.

## 4. Receber a localização do cliente
- Botão **Enviar minha localização** (alfinete) no chat e nas opções de entrega.
- Com a permissão do celular, a loja recebe as coordenadas, encontra rua, bairro e CEP aproximados, e a IA confirma com o cliente e pede só o número/complemento.
- Ponto fora da cidade ou da área de entrega: aviso gentil e oferta de retirada.
- O ponto exato fica salvo no pedido; na comanda e no painel aparece link "Abrir no mapa" para o entregador. A taxa por km usa esse ponto quando disponível.

## Detalhes técnicos
- Lista de conversas: ordenar por `handoff_status in ('requested','human')` primeiro, depois `updated_at`; `HandoffAlert` navega com `?conversa=<id>`.
- Detecção de intenção humana em `api.public.ai-chat.ts` por regex antes de chamar o modelo; chama `notifyHandoff`.
- Migração: `ai_conversations.handoff_staff_id`, `handoff_accepted_at`; `ai_messages.parts` aceita parte `audio` (path no bucket privado novo `ai-chat-audio`) e `location`; `orders.delivery_lat/lng` (se ausentes).
- `acceptHandoff` (auth, staff do tenant) grava staff + mensagem de sistema; painel renderiza com `react-markdown`.
- Áudio: gravação WAV no navegador, upload para rota `/api/public/ai-chat-audio` (valida accessKey, limite 2 MB/60 s, rate limit), transcrição via Lovable AI (`openai/gpt-transcribe`, `/v1/audio/transcriptions`), texto devolvido e enviado como mensagem.
- Localização: `navigator.geolocation` → rota pública valida accessKey e geocodifica reverso com a chave Google já configurada; resultado preenche `draft.address` + coordenadas, validadas por cidade/zona em `priceDraft`.
