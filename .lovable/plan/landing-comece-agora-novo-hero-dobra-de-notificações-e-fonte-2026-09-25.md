# Landing /comece-agora: novo hero, dobra de Notificações e fonte Museo Sans Rounded

## 1. Hero refatorado (inspirado no anexo 4)
- Fundo em degradê laranja da paleta (laranja escuro → laranja principal), texto todo em branco.
- Mantém selo "14 dias grátis", título, subtítulo, lista de garantias, a ilustração atual do produto e os botões CTA (botão principal em branco com texto laranja para contrastar).
- Layout em duas colunas no computador (texto à esquerda, imagens à direita) e empilhado no celular.
- Cabeçalho segue acima, sem mudanças.

## 2. Nova dobra "Notificações push" (inspirada no anexo 1)
- Lado esquerdo: painel ilustrativo "Disparo de notificações" com gráfico de barras arredondadas por dia da semana (tons de laranja) e um cartão flutuante de resultado (ex.: "+R$ 12.480 em vendas das campanhas", ↑32%). Números ilustrativos.
- Lado direito: selo "Notificações push", título "Traga o cliente de volta com um toque", texto curto e acordeão com 3 itens:
  1. Campanhas ilimitadas — envie para todos os clientes que ativaram notificações.
  2. Cupom na notificação — botão "Ver cupom" direto no aviso.
  3. Mensagens personalizadas — título, texto e imagem da sua loja.
- Posição: logo após a seção de telas do produto, antes da tabela de preços.

## 3. Fonte Museo Sans Rounded em todo o projeto
- Você envia os arquivos licenciados (.woff2 ou .ttf; idealmente pesos 300, 500, 700, 900).
- A fonte passa a valer para títulos e textos de todo o site (landing, loja, painel), substituindo Inter e Plus Jakarta Sans.
- Enquanto os arquivos não chegam, uso uma alternativa arredondada gratuita (Nunito) como reserva automática.

## Detalhes técnicos
- Fontes: arquivos em `public/fonts/`, `@font-face` no topo de `src/styles.css`, tokens `--font-sans`/`--font-display` apontando para "Museo Sans Rounded", Nunito como fallback; remover o link do Google Fonts de Inter/Jakarta em `__root.tsx`.
- Degradê: novo token `--gradient-hero` em `src/styles.css` (oklch a partir de `--primary`), usado no hero de `comece-agora.tsx`.
- Nova seção `PushNotificationsSection` em `CroSections.tsx`, acordeão com o componente shadcn existente, animações respeitando "reduzir movimento".
- Validar em celular e desktop via screenshot.

## Pendente de você
- Arquivos da fonte Museo Sans Rounded.
