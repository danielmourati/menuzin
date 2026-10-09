# Chat da IA: campo de texto sempre acima do teclado (estilo WhatsApp)

## Problema
No iPhone, o teclado cobre a janela do chat. O campo de digitar fica escondido atras dele e o cliente nao ve o que escreve. Na captura, so aparecem o cabecalho e as mensagens.

## Como vai ficar
- No celular, o chat abre em tela cheia (cabecalho no topo, mensagens no meio, campo de texto embaixo).
- Quando o teclado sobe, o chat encolhe e o campo de texto fica colado logo acima do teclado, sempre visivel, como no WhatsApp.
- Ao fechar o teclado, o chat volta ao tamanho cheio.
- A ultima mensagem continua visivel: a lista rola para o fim quando o teclado abre.
- No computador nada muda (janela flutuante no canto).

## Mudancas (somente `src/components/storefront/AiOrderChat.tsx`)
1. Hook `useVisualViewport`: acompanha a area realmente visivel (acima do teclado) e entrega altura e deslocamento do topo. Atualiza em eventos `resize` e `scroll` da area visivel.
2. Janela no celular: em vez de `bottom-0` + `h-[85dvh]`, usa a altura e o topo da area visivel, ocupando a tela toda. O desktop (`sm:`) continua com tamanho fixo.
3. Trava a rolagem da pagina da loja por tras enquanto o chat esta aberto (restaura ao fechar), para o iOS nao "empurrar" a pagina.
4. Campo de texto com fonte de 16px no celular, evitando o zoom automatico do iOS ao focar. Area segura inferior (`safe-area-inset-bottom`) quando o teclado esta fechado.
5. Remover o foco automatico ao abrir a janela no celular: hoje ele abre o teclado na hora e cobre a conversa e os atalhos. O foco automatico continua no desktop e apos enviar mensagem.
6. Ao focar o campo, rolar a lista de mensagens para o fim.

## Detalhes tecnicos
- `window.visualViewport.height` e `.offsetTop` aplicados por `style` no container fixo (`top`, `height`), apenas abaixo de `640px`.
- Lista de mensagens mantem `flex-1 overflow-y-auto`; formulario fica fora da rolagem (`shrink-0`).
- Sem alteracao de servidor, banco ou regras de seguranca (pedido continua so pelo botao Confirmar).
- `viewport-fit=cover` ja esta configurado no `__root.tsx`.

## Verificacao
- Playwright em viewport de celular, simulando area visivel reduzida, conferindo que o campo fica dentro da area visivel.
- Typecheck.
- Teste real no iPhone (Safari e app instalado) depois de publicar; nao e possivel reproduzir o teclado nativo no navegador de teste.
