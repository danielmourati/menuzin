# Abrir o pedido no Bluefy a partir do aviso (somente iPhone/iPad)

## Contexto
- No iPhone, o aviso pertence ao app da Tela de Início, que sempre abre primeiro. Sem o app instalado, o iPhone não permite avisos.
- No Android e no computador nada muda.

## O que será feito
- **Opção "Sempre abrir no Bluefy"** em Configurações > Pedidos, visível só no iPhone/iPad, salva no aparelho.
- Com a opção ligada, ao tocar no aviso de pedido: o app da Tela de Início abre e imediatamente envia o pedido para o Bluefy, que abre a tela de Pedidos com esse pedido aberto.
- O iPhone pode pedir "Abrir no Bluefy?" na primeira vez.
- Se o Bluefy não abrir em cerca de 2 segundos (não instalado), aparece um aviso com link para baixar na App Store, e o pedido continua aberto no app.

## A confirmar no teste
- O formato do link do Bluefy precisa ser validado num iPhone real.
- O Bluefy precisa estar logado na conta da loja (login uma vez).

## Detalhes técnicos
- `push-notifications.server.ts`: URL do aviso de pedido passa a `/admin/pedidos?order=<id>&from=push`.
- `public/sw-push.js` / `public/sw.js`: abrir exatamente essa URL.
- `admin.pedidos.tsx`: lê `order` e dispara `open-order-details`; se iOS + `display-mode: standalone` + `from=push` + preferência `menuzin:open-in-bluefy` ativa, faz `window.location.href = "bluefy://open?url=" + encodeURIComponent(urlSemFromPush)`; timeout com fallback para App Store.
- `admin.configuracoes.pedidos.tsx`: switch da preferência, renderizado só quando a detecção de iOS for verdadeira (após hidratação).
