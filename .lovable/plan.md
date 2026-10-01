# Abrir o pedido no Bluefy a partir do aviso no iPhone

## Como funciona hoje (limite do iPhone)
- No iPhone, o aviso só existe porque o Menuzin foi adicionado à Tela de Início. O aviso pertence a esse app, e o iPhone sempre o abre ao tocar. Um site não consegue mandar o iPhone abrir outro navegador direto do aviso.
- **Sem o app na Tela de Início:** o iPhone não deixa ativar avisos (aparece o passo a passo). Avisos já ativados param de chegar se o app for removido. No Android e no computador, o aviso abre o navegador onde foi ativado.

## O que dá para fazer
1. **Botão "Abrir no Bluefy"** na tela de Pedidos, mostrado só no iPhone/iPad quando o painel é aberto pelo app da Tela de Início (principalmente vindo de um aviso).
   - Toque abre o mesmo pedido no Bluefy usando o link de abertura do Bluefy (`bluefy://` seguido do endereço).
   - Se o Bluefy não estiver instalado, mostra o link para baixar na App Store.
2. **Opção "Sempre abrir no Bluefy"** (salva no aparelho): ao abrir um pedido pelo aviso, o painel já tenta pular para o Bluefy sozinho, sem precisar tocar no botão. O iPhone pode pedir confirmação ("Abrir no Bluefy?") na primeira vez.
3. O pedido certo já chega aberto no Bluefy (o endereço leva o número do pedido).

## Pontos a confirmar no teste
- O formato exato do link do Bluefy precisa ser validado num iPhone real; se não funcionar, fica só o botão que copia o endereço e orienta abrir no Bluefy.
- O Bluefy precisa estar conectado à mesma conta (pede login uma vez).

## Detalhes técnicos
- `public/sw-push.js`: notificação de pedido passa a abrir `/admin/pedidos?order=<id>&from=push`.
- `admin.pedidos.tsx`: lê `order` da URL e dispara `open-order-details`; detecta iOS + `display-mode: standalone`; renderiza banner com link `bluefy://open?url=<url codificada>` (fallback para App Store).
- Preferência `menuzin:open-in-bluefy` em localStorage; quando ativa e `from=push`, faz `window.location.href` para o link do Bluefy.
- Ajuste no payload em `push-notifications.server.ts` para incluir o id do pedido na URL.
