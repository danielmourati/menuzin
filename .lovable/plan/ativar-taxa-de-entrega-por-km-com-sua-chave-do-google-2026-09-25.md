# Ativar taxa de entrega por KM com sua chave do Google

## Situação atual
O cálculo por KM já está pronto no sistema: ele mede a distância entre o endereço da loja e o do cliente, cobra a taxa base até os km incluídos, soma o valor por km extra (arredondado para cima) e bloqueia acima do limite máximo. Só falta a chave do Google — sem ela, o carrinho cobra apenas a taxa base.

## O que vou fazer
1. **Guardar sua chave com segurança** — vou abrir um formulário seguro no chat para você colar a chave (não envie a chave em texto no chat). Ela fica só no servidor, nunca aparece no site.
2. **Mensagens mais claras quando o Google recusar** — se a chave estiver sem permissão ou com restrição errada, o registro mostra o motivo exato (ex.: "API não liberada nesta chave"), em vez de só cair na taxa base em silêncio.
3. **Evitar custo repetido** — guardar por alguns minutos a distância já calculada para o mesmo endereço, para que o cliente editando o carrinho não gere várias cobranças no Google.
4. **Testar de ponta a ponta** — colocar uma loja no modo "por KM", informar um endereço real no carrinho e conferir que a taxa bate com a conta (base + km extras).

## O que preciso de você (na sua chave, no Google Cloud)
- **Distance Matrix API** ativada (e de preferência também a **Geocoding API**).
- Restrição de aplicativo: **Nenhuma** ou **Endereços IP** — não use "Referenciadores HTTP", pois a consulta é feita pelo servidor e seria bloqueada.
- Faturamento ativo no projeto do Google.

## Detalhes técnicos
- Secret: `GOOGLE_MAPS_API_KEY` via `add_secret` (já lido em `src/lib/delivery-zones.functions.ts`).
- Chamada direta a `maps/api/distancematrix/json` com `region=br&language=pt-BR`; tratar `REQUEST_DENIED`/`error_message` com log específico.
- Cache em memória por (tenant, endereço normalizado) com TTL ~10 min.
- Atualizar `.env.example`.
