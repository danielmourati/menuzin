## O que vai ser feito

### 1. Reimpressão para cozinha em ambos os modais do pedido

**Card pequeno (`OrderCard.tsx`)** — hoje aparece só o ícone de impressora normal no canto. Vou adicionar um segundo ícone, ao lado, usando `PrintKitchenButton` no modo `size="icon"` (mesmo padrão visual do botão de impressão atual). Aparece apenas quando o pedido já foi aceito (`status !== "novo"`), evitando duplicar a impressão automática que ocorre no aceite.

**Modal de detalhes (`OrderDetailsDrawer.tsx`)** — já tem o `PrintKitchenButton`, mas ele só aparece quando o plano libera `kitchenPrinter`. Vou manter o gate de plano (regra de negócio), porém:
- substituir o botão grande "Reimprimir cozinha" por um botão compacto (`size="icon"`) ao lado de "Imprimir pedido completo", liberando espaço horizontal e mantendo a paridade com o card.
- garantir que o tooltip/`title` mostre "Reimprimir cozinha" quando o pedido não está mais novo.

### 2. Overflow do modal de Pedido

Hoje o `DialogContent` usa `max-h-[92vh]`, com header + footer fixos e um `ScrollArea` no meio. Em telas pequenas, o footer (WhatsApp + 3 botões de impressão/fechar + separador + barra de status) fica alto demais e empurra o conteúdo, fazendo a Linha do Tempo "encostar" no rodapé.

Ajustes pontuais:
- `max-h-[92vh]` → `max-h-[92dvh]` para considerar a barra do navegador mobile.
- Reduzir padding do footer (`p-4` → `p-3`) e do separador (`my-1` → remover, usar `gap`).
- Compactar a linha de impressão: `PrintOrderButton` (texto) + `PrintKitchenButton` (ícone) + `Fechar`, em vez de três botões de largura `flex-1 min-w-[140px]` que quebram em duas linhas.
- Garantir `min-h-0` no `ScrollArea` (já existe) e adicionar `overscroll-contain` para evitar scroll do body acidental.

Nada muda na lógica de impressão, gating de plano, ou estrutura de dados — só apresentação.

## Arquivos afetados

- `src/components/orders/OrderCard.tsx` — adicionar `PrintKitchenButton` (icon) na barra de ações dos pedidos não-novos.
- `src/components/orders/OrderDetailsDrawer.tsx` — trocar o botão grande de cozinha por ícone, compactar footer, trocar `vh` por `dvh`.

Sem migrations, sem mudança de API, sem mexer em `PrintKitchenButton.tsx` (já suporta `size="icon"`).