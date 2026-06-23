# Mover "Conversar (WhatsApp)" para o card Cliente

## Escopo

Único modal do fluxo de pedidos que exibe esse botão hoje é o `OrderDetailsDrawer.tsx` (usado em `/admin/pedidos` para todos os status: pendente, aceito, preparo, saiu_entrega, pronto_retirada, finalizado, cancelado). Os outros modais (`CancelOrderModal`, toasts) não têm WhatsApp, então mantêm-se inalterados — o "padrão de cores" será consolidado a partir deste.

## Mudanças

### 1. `src/components/orders/OrderDetailsDrawer.tsx` — Card Cliente

No bloco do telefone (linhas 199-202), adicionar o botão "Conversar" ao lado do número:

```text
[📞 ícone]  (11) 99999-9999     [💬 Conversar]
```

- Botão `size="sm"`, variant outline, padrão verde já em uso: `border-success/40 bg-success/10 hover:bg-success/15 text-success`
- Ícone `MessageCircle` à esquerda, label "Conversar"
- `onClick` abre `whatsappLink(order.whatsapp, chatMessage)` com template `"conversa"` (mesma lógica de `WhatsAppOrderActions.handleOpenChat`)
- Acessível: `title="Iniciar conversa no WhatsApp"`, `aria-label` equivalente

### 2. `OrderDetailsDrawer.tsx` — Rodapé reorganizado

Remover o `<WhatsAppOrderActions />` do rodapé. Para preservar a notificação de status (Notificar Aceite/Preparo/Envio/Retirada/Cancelamento), criar um botão dedicado inline no rodapé que só aparece quando `order.status ∈ {aceito, preparo, saiu_entrega, pronto_retirada, cancelado}`, reutilizando `whatsappOrderMessage(templateType, …)`.

Layout final do rodapé (3 linhas, padrão de cores unificado):

```text
Linha 1 — Notificações & Reimpressão (verde + âmbar)
  [💬 Notificar <status>]   [🖨 Reimprimir Cozinha (se preparo)]

Linha 2 — Impressões (laranja + âmbar)
  [🖨 Imprimir Pedido Completo]   [🖨 Imprimir Cozinha (se ≠ preparo)]

Linha 3 — Ações de fluxo & fechar (azul/primário + vermelho)
  [Ações de status do pedido…]   [Fechar]
```

Paleta unificada (já existente no projeto, sem cores novas):
- Verde WhatsApp: `bg-success/10 text-success border-success/40` (outline) ou `bg-success hover:bg-success/90 text-success-foreground` (sólido para "Notificar")
- Âmbar (cozinha): `bg-amber-600 hover:bg-amber-700 text-white border-amber-600`
- Laranja (impressão completa): `bg-orange-600 hover:bg-orange-700 text-white border-orange-600`
- Vermelho (fechar): `bg-destructive hover:bg-destructive/90 text-destructive-foreground`
- Primário (ações de status): variantes default do `OrderStatusActions`

### 3. `src/components/orders/WhatsAppOrderActions.tsx`

- Simplificar: remover o segundo botão "Conversar (WhatsApp)" e a prop `hideStatusButton`.
- Componente passa a renderizar apenas o botão "Notificar <status>" no estilo verde sólido, ou nada quando o status é "pendente"/"recebido".
- Alternativa equivalente: deletar o componente e inlinar a lógica no rodapé do drawer (menos arquivos). Vou pelo refactor in-place para manter o componente reusável.

## Fora de escopo

- Sem mudanças de backend, schema, RLS ou rotas.
- `CancelOrderModal`, `NewOrderToast`, `OrderCard` não têm botão "Conversar" e não serão tocados.
- Lógica de templates de mensagem (`whatsappOrderMessage`) permanece igual.

## Verificação

- Abrir modal em cada status (pendente, aceito, preparo, saiu_entrega, pronto_retirada, finalizado, cancelado) e confirmar:
  - "Conversar" aparece no card Cliente em todos os status.
  - "Notificar <status>" aparece no rodapé apenas nos status notificáveis.
  - Cores consistentes; nenhum botão sobrepõe o X de fechar.
