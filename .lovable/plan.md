## Objetivo

Garantir que o conteúdo do modal de detalhes do pedido (`OrderDetailsDrawer`) tenha scroll vertical confiável e visível quando os cards (Itens, Valores e pagamento, Cliente, Observações) não couberem na altura disponível — especialmente em telas baixas (ex.: 1034×503) e dispositivos móveis.

## Diagnóstico

O `ScrollArea` já existe envolvendo o conteúdo, mas:

1. O `ScrollArea` do shadcn (Radix) **esconde a scrollbar até o hover**, dando impressão visual de que o conteúdo está cortado sem possibilidade de rolagem.
2. O `ScrollAreaPrimitive.Viewport` interno aplica `display: table` por padrão, o que em alguns casos quebra a medição de altura do conteúdo filho e impede o overflow de disparar scroll corretamente.
3. O footer ocupa ~60px e o header ~90px; numa janela de 503px isso deixa só ~310px de área útil — sem scrollbar visível o usuário não percebe que pode rolar.

## Mudanças

### `src/components/orders/OrderDetailsDrawer.tsx`
- Substituir o `ScrollArea` (Radix) por uma `div` simples com `flex-1 min-h-0 overflow-y-auto overscroll-contain` no container que envolve o conteúdo do modal. Scroll nativo do navegador → scrollbar sempre visível quando há overflow, comportamento previsível em mobile e desktop, sem o wrapper `display: table` do Radix.
- Remover o import de `ScrollArea` (não usado em outro lugar do arquivo).
- Garantir que o wrapper interno tenha `pb-2` para não colar o último card no footer durante o scroll.
- Manter a estrutura atual: Linha do tempo no topo (full width) + grid `md:grid-cols-[1.4fr_1fr]` com Itens/Valores à esquerda e Cliente à direita. Em telas estreitas o grid já empilha verticalmente e agora rola normalmente.

### `src/components/orders/CancelOrderModal.tsx` (verificação)
- Modal pequeno (Alert + Textarea). Adicionar `max-h-[85dvh] overflow-y-auto` no `DialogContent` apenas se ainda não houver, para o caso de motivos longos em telas muito baixas. Sem outras mudanças visuais.

## Fora de escopo

- `CustomerOrderTracking` (página pública, não é modal).
- Lógica de status, backend, RLS, schema, server functions.
- Mudanças visuais nos cards (cores, espaçamento, tipografia) — apenas comportamento de scroll.
- `OrderStatusTimeline`, `WhatsAppOrderActions`, `PrintOrderButton`, `PrintKitchenButton`, `OrderStatusActions`.

## Detalhes técnicos

```tsx
// antes
<ScrollArea className="flex-1 min-h-0">
  <div className="flex flex-col gap-4 p-5 min-h-0">...</div>
</ScrollArea>

// depois
<div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
  <div className="flex flex-col gap-4 p-5 pb-2">...</div>
</div>
```

O `DialogContent` já tem `flex flex-col h-[92dvh] md:h-auto md:max-h-[92dvh]`, então `flex-1 min-h-0` no novo wrapper continua dando a altura correta ao container rolável.