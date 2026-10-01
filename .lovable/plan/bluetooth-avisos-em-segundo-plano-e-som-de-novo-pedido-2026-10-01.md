# Bluetooth, avisos em segundo plano e som de novo pedido

## 1. "Web Bluetooth não é suportado neste navegador"
Por que acontece: a impressora Bluetooth só funciona com Chrome ou Edge no Android, PC ou Mac. Não funciona no iPhone/iPad (nenhum navegador da Apple permite), no Firefox nem no Samsung Internet. Também não funciona dentro da janela de prévia do editor nem fora de um endereço seguro (https).

O que vamos fazer:
- Trocar a mensagem genérica por uma que diz o motivo exato: "iPhone não permite Bluetooth — use o app de impressão (QZ) ou um aparelho Android", "Abra no Chrome", ou "Abra o site publicado, não a prévia".
- No celular sem suporte, desligar os botões "Parear / Reconectar / Teste" e mostrar esse aviso antes do toque, em vez de mostrar um erro depois.

## 2. "Navegador não suporta" nos avisos em segundo plano
Por que acontece: no iPhone, os avisos só funcionam se o Menuzin for **adicionado à Tela de Início** e aberto por lá (iOS 16.4 ou mais novo). Aberto no Safari comum, o iPhone não tem esse recurso. Também falha dentro da prévia do editor e em navegadores em modo anônimo.

O que vamos fazer:
- No lugar de "Navegador não suporta", mostrar o motivo e o passo a passo: no iPhone, "Toque em Compartilhar > Adicionar à Tela de Início e abra o Menuzin por lá"; na prévia, "Abra o site publicado".
- Revisar a ativação para usar o mesmo registro de avisos do app e mostrar um erro claro quando a permissão for negada.

## 3. Som de novo pedido: só para pedido novo, sem atraso nem repetição
O que encontramos:
- O painel confere os pedidos a cada 10 segundos, então o som pode chegar até 10 s depois.
- Se o aparelho ficou dormindo ou a aba esteve parada, ao voltar ele toca para pedidos que chegaram há muito tempo.
- Com várias abas abertas no mesmo aparelho, cada uma toca sozinha (som repetido).
- Se o navegador bloqueou o som, ele pode tocar mais tarde, fora de hora.

O que vamos fazer:
- Avisar na hora: ouvir os pedidos novos ao vivo, e manter a conferência a cada 10 s só como reserva.
- Tocar só para pedidos criados nos últimos 3 minutos. Pedidos mais antigos aparecem na lista, mas sem som.
- Uma aba só toca por aparelho. As outras abas ficam em silêncio.
- Se o pedido foi aceito em outro aparelho, o som para e o alerta some em todos os aparelhos.
- Nunca repetir o som de um pedido já avisado, nem depois de recarregar a página.
- Som bloqueado pelo navegador: não guardar para tocar depois. Mostrar o aviso "Toque na tela para ativar o som".

## Detalhes técnicos
- `bluetooth-printer.ts`: função `getBluetoothSupport()` que verifica iOS, `navigator.bluetooth`, `isSecureContext` e `window.top !== window.self`. Usada em `DevicePrinterConfig.tsx`/`PrintersManager`.
- `useWebPush.ts` + `admin.configuracoes.pedidos.tsx`: `getPushSupport()` com motivo (`ios-not-installed` via `display-mode: standalone`, `iframe`, `no-sw`). Registrar em `/sw-push.js` para ficar igual ao server.
- `useOrdersRealtime.ts`: canal realtime de INSERT em `orders` filtrado por `tenant_id`, que dispara `tick()`; filtro `createdAt >= now-3min` em `processNewOrders`; IDs vistos guardados em localStorage; trava de som por aparelho via `BroadcastChannel("menuzin-order-alert")` com eleição da aba líder e uma janela de dedupe de 5 s por pedido; `stopNotificationSound` também mandado pelo canal.
- `order-alert-sound.ts`: descartar o som quando `play()` falhar (sem fila) e expor `audioBlocked` para o aviso.

## Validação
Typecheck. Playwright com login e duas abas: criar um pedido de teste e confirmar um só disparo do som (função espiã), e nenhum som ao recarregar.
