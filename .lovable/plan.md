# Som de novo pedido: tocar na hora, sempre que chegar pedido novo

## O que encontramos
1. **O aviso "ao vivo" não funciona.** O painel tenta ouvir os pedidos ao vivo, mas a tabela de pedidos foi tirada do canal ao vivo há meses, por segurança. Na prática, o painel só confere os pedidos **a cada 10 segundos**.
2. **Com a aba em segundo plano, a conferência fica lenta.** O navegador passa a conferir só **1 vez por minuto** (ou para de vez no celular). Quando o pedido aparece, às vezes já passou o limite de "pedido recente" e o som não toca.
3. **O limite de "pedido recente" usa o relógio do aparelho.** Se o relógio do computador ou do celular estiver alguns minutos adiantado, todo pedido parece "antigo" e o som nunca toca.
4. **Quatro partes do painel conferem os pedidos ao mesmo tempo** (sino, lista de pedidos, configurações e o aviso geral). Elas disputam entre si, e às vezes quem "vê" o pedido primeiro não é a parte que toca o som.
5. **O som pode travar em silêncio.** Depois que o aparelho dorme ou a aba fica parada, o navegador bloqueia o áudio de novo. O painel só pede o toque na tela para liberar o som uma vez, e às vezes fica esperando para sempre sem tocar e sem mostrar aviso.

## O que vamos fazer
- **Aviso na hora, com segurança:** quando um pedido é criado, o servidor manda um sinal só para a loja dona do pedido. O sinal leva apenas o número de identificação, sem dados do cliente. O painel recebe o sinal e busca o pedido na hora. A conferência a cada 10 s continua como reserva.
- **Conferir ao voltar:** ao voltar para a aba ou desbloquear o celular, o painel confere os pedidos na hora.
- **Uma conferência só por aba:** as quatro partes do painel passam a usar a mesma conferência, então quem vê o pedido também toca o som.
- **"Pedido novo" sem depender do relógio:** toca para todo pedido que chegou depois que o painel abriu e que ainda não foi avisado, com limite de 10 minutos. Esse limite é medido pelo horário do servidor, não pelo relógio do aparelho. Ao recarregar a página, pedidos antigos continuam sem tocar.
- **Som que não trava:** o painel tenta liberar o áudio de novo a cada toque na tela, não só no primeiro. Se o navegador não liberar o som em 2 segundos, ele toca o som simples gerado pelo próprio navegador. Se esse também falhar, aparece o aviso "Toque na tela para ativar o som".
- **Botão "Testar som"** em Configurações > Pedidos, com um aviso de "Som ativo" ou "Som bloqueado — toque para ativar".

Continua igual: só uma aba toca por aparelho, nenhum pedido toca duas vezes, e o som para em todos os aparelhos quando o pedido é aceito.

## Detalhes técnicos
- `orders.functions.ts` (createOrder, após inserir; e onde o pagamento é aprovado): `supabaseAdmin.channel('tenant-orders:'+tenantId).send({type:'broadcast', event:'order', payload:{id}})`. Sem voltar `orders` para a publicação do canal ao vivo. O sinal só dispara um refetch autenticado (RLS), então um sinal falso não expõe dados.
- `useOrdersRealtime.ts`: um único poller por módulo, com contagem de quem usa (o primeiro inicia e o último para). O canal de broadcast substitui o `postgres_changes` que nunca recebe eventos. Novo `tick()` em `visibilitychange`/`focus`/`online`.
- Frescor: guardar `sessionStartServerMs` (primeiro snapshot = maior `createdAt` visto) e tocar se `createdAt > baseline` e `!seen`. Limite de 10 minutos em relação ao `createdAt` mais novo da lista (relógio do servidor).
- `order-alert-sound.ts`: `resume()` com timeout de 2 s; fallback do HTMLAudio para o chime do AudioContext; listeners de gesto permanentes, que reabrem o áudio quando o estado é `suspended` ou `interrupted`; expor `getAudioState()` para o indicador. Atualizar `scripts/order-alert-sound-tests.mjs`.

## Validação
Playwright com sessão: painel aberto, criar pedido de teste pela loja, confirmar um disparo do som em menos de 2 s (função espiã). Repetir com a aba em segundo plano e com o relógio adiantado em 5 min. Recarregar a página e confirmar que não toca de novo.
