# Endereço na cidade da loja e atalhos padrão editáveis

## 1. Endereço de entrega pela IA
- Quando o cliente escolher **entrega**, a IA pede o **CEP** ou, se ele não souber, **rua, número e bairro** (complemento e referência opcionais), um dado por vez.
- A cidade e o estado são sempre os da loja: a IA não pergunta a cidade e avisa com carinho que só entregamos em [cidade da loja] se o cliente citar outra.
- Ao receber o CEP, a loja busca rua/bairro automaticamente e a IA só confirma com o cliente e pede o número.
- Se o CEP ou bairro for de outra cidade, ou fora da área de entrega, a IA explica e oferece retirada.

## 2. Atalhos padrão editáveis
- Em Atendente IA > Atalhos, os 3 padrões ("O que vocês têm hoje?", "Quais os mais pedidos?", "Tem cupom?") aparecem como atalhos normais, que podem ser editados, desligados, apagados ou reordenados.
- Ao abrir a aba sem nenhum atalho, a loja recebe esses 3 já salvos. Botão **Restaurar padrões** para voltar a eles.

## Detalhes técnicos
- `ai-agent.server.ts` `priceDraft`: força `address.city/state` = cidade/UF da loja; se o CEP vier preenchido, consulta ViaCEP no servidor para completar rua/bairro e rejeita (erro em `errors`) quando a cidade do CEP for diferente da loja.
- `api.public.ai-chat.ts`: instruções com a cidade/UF da loja e o fluxo CEP → número, ou rua → número → bairro.
- `ai-agent.functions.ts`: `listQuickReplies` insere `DEFAULT_QUICK_REPLIES` quando o tenant não tem nenhum; nova ação `restoreDefaultQuickReplies`. `getAgentPublicInfo` mantém o fallback.
- `admin.atendente-ia.tsx`: remove o texto "Usando os padrões…" e adiciona "Restaurar padrões".
