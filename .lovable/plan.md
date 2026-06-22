## Problema

O alerta sonoro e o toast de novo pedido não funcionam corretamente:

1. **Toast nunca aparece** — em `useOrdersRealtime.ts`, o `globalNewOrderAlert` é declarado e lido pelo `OrdersRealtimeListener`, mas **nunca é atribuído** quando um pedido novo chega no polling de 10s. Só toca o som (linha 87) e atualiza a lista, mas não dispara o alerta visual.
2. **Notificações na sineta também ficam vazias** — `globalNotifications` nunca recebe um item quando um pedido novo é detectado.
3. **Som pode falhar silenciosamente** por política de autoplay do navegador quando o usuário ainda não interagiu com a página — o `.catch` apenas loga `warn`, sem fallback.

## Correção

Editar **somente** `src/hooks/useOrdersRealtime.ts`, no bloco de polling (`tick`):

- Quando `hasNew` for verdadeiro, identificar os pedidos realmente novos (`ui.filter((o) => !known.has(o.id))`), ordenar pelo `createdAt` desc e:
  - Atribuir o mais recente a `globalNewOrderAlert`.
  - Adicionar uma entrada em `globalNotifications` para cada pedido novo (`{ id, type: "new_order", orderId, title, message, createdAt, read: false }`, respeitando o tipo `AdminNotification`).
  - Chamar `notifyListeners()` para propagar para todas as instâncias do hook (a sineta e o `OrdersRealtimeListener`).
- Manter `playNotificationSound()` como hoje, mas adicionar tentativa de "desbloquear" o áudio no primeiro clique/toque do usuário (listener `pointerdown` global one-shot que chama `audio.play().then(() => audio.pause())`), garantindo que o `Audio` esteja autorizado a tocar quando o pedido chegar.

A deduplicação de toast permanece garantida pelo `notifiedIdsRef` já existente em `OrdersRealtimeListener`, então múltiplas instâncias do hook que detectem o mesmo pedido não geram toasts duplicados.

Nenhuma mudança em backend, RLS, server functions ou outros componentes.

## Arquivos alterados

- `src/hooks/useOrdersRealtime.ts` (atribuição do alert, push de notification, unlock de áudio)
