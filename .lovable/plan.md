# Refatoração de cores dos modais de pedido

## Problema atual

O footer do `OrderDetailsDrawer` empilha botões em cores fortes concorrentes — laranja (imprimir), âmbar (cozinha), verde (WhatsApp), azul/verde/amarelo (status), vermelho (fechar/cancelar). Cada botão grita pelo mesmo nível de atenção, gerando poluição visual e aparência amadora. O mesmo padrão aparece em `CancelOrderModal` e em ações de status. Falta hierarquia clara: primária / secundária / destrutiva / neutra.

## Princípios (UX/UI)

1. **Uma ação primária por contexto** — só o próximo passo do fluxo recebe preenchimento sólido na cor da marca (`primary`).
2. **Secundárias = `outline` neutro** — imprimir, reimprimir cozinha, conversar/notificar WhatsApp deixam de ser botões sólidos coloridos; viram `outline` com ícone colorido (cor = significado, não preenchimento).
3. **Destrutiva = `ghost`/`outline` discreto** — "Fechar" não é destrutivo, vira `ghost`; "Cancelar pedido" mantém `outline` vermelho (não sólido).
4. **Tokens semânticos** — remover hex/utilitários crus (`bg-orange-600`, `bg-amber-600`, `bg-blue-600`) e usar tokens (`primary`, `success`, `warning`, `destructive`, `muted`). Apenas o **ícone** carrega a cor de categoria.
5. **Footer agrupado por hierarquia**, não por funcionalidade — linha única quando couber: `[secundárias à esquerda] … [primária à direita]`.

## Escopo

Apenas frontend/apresentação. Sem mudanças em lógica, schema, RLS, server functions, templates de WhatsApp, fluxo de impressão.

Arquivos afetados:
- `src/components/orders/OrderDetailsDrawer.tsx` (footer + card cliente)
- `src/components/orders/WhatsAppOrderActions.tsx`
- `src/components/orders/OrderStatusActions.tsx`
- `src/components/orders/PrintOrderButton.tsx` (apenas remoção do default sólido laranja, se houver)
- `src/components/orders/PrintKitchenButton.tsx` (idem)
- `src/components/orders/CancelOrderModal.tsx` (ajuste do Alert e botões)

Fora do escopo: `OrderCard`, `OrdersKanbanBoard`, `OrdersStatusGroups`, `NewOrderToast`, badges de status (mantêm cor para leitura rápida no kanban).

## Mudanças por arquivo

### 1. `OrderDetailsDrawer.tsx` — footer

Substituir o bloco atual (3 linhas, cores competindo) por **uma faixa única** com hierarquia:

```text
[Fechar (ghost)] [Imprimir pedido (outline)] [Reimprimir cozinha* (outline)] [Conversar/Notificar (outline verde)]   ───   [Ação primária do status (primary sólido)]   [Cancelar (outline destructive)]
```

- "Fechar" → `variant="ghost"` (sem destaque, sem vermelho).
- "Imprimir pedido completo" → `variant="outline"`, ícone `Printer` em `text-foreground/70`. Sem `bg-orange-*`.
- "Reimprimir cozinha" (só em `preparo`) → `variant="outline"`, ícone `ChefHat` em `text-warning`. Sem `bg-amber-*`.
- "Notificar <status>" (WhatsApp) → `variant="outline"` com borda `border-success/30`, ícone `MessageCircle` em `text-success`. Remove preenchimento verde sólido.
- Ação de status (Aceitar / Iniciar Preparo / Saiu para Entrega / Pronto para Retirada / Finalizar) → único botão **sólido** no footer, usando `variant="default"` (primary da marca) com ícone. Remove `bg-success`, `bg-warning`, `bg-blue-600`.
- "Cancelar pedido" → mantém `outline` destructive (já está correto).

Card Cliente (linha 198-221): botão "Conversar" continua, mas alinha à paleta — `variant="outline"` com ícone verde, sem fundo verde (`bg-success/10` sai). Fica visualmente leve ao lado do telefone.

Bloco "Observações gerais" (linha 159): remover paleta âmbar customizada (`bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50`). Usar `bg-muted/40 border-border` com ícone/indicador `text-warning` na borda esquerda (`border-l-2 border-l-warning`) — sinal sutil, sem invadir a leitura.

Obs por item (linha 151): mesma lógica — trocar `border-amber-400 text-amber-700` por `border-l-warning text-foreground/70`.

### 2. `WhatsAppOrderActions.tsx`

- Trocar classes sólidas `bg-success hover:bg-success/90 text-success-foreground` por `variant="outline"` com `border-success/30 text-success hover:bg-success/10`. Mantém o ícone `MessageCircle` em `text-success`.

### 3. `OrderStatusActions.tsx`

- Remover branches `bg-success`, `bg-warning`, `bg-blue-600` no modo "full". Todos os botões de avanço de status passam a usar `variant="default"` (primary). O ícone carrega a semântica (Flame, Truck, PackageCheck, etc.).
- Modo `compact` (usado em listas/cards) **mantém** as cores fortes — ali a cor ajuda a escanear status rapidamente. Não mexer.
- "Recusar/Cancelar" mantém `outline` destructive.

### 4. `PrintOrderButton.tsx` / `PrintKitchenButton.tsx`

- Se tiverem `className` default colorido, trocar para `variant="outline"` por padrão. Permitir override via `className` do consumidor (mas o drawer não vai mais sobrescrever).

### 5. `CancelOrderModal.tsx`

- Alert de pagamento online: substituir `bg-destructive/10 border-destructive/20 text-destructive dark:text-red-400` por uso direto do `Alert variant="destructive"` já estilizado pelo design-system (remove o override redundante e o `dark:text-red-400` cru).
- Botões do footer já estão corretos (`outline` + `destructive`). Sem mudança.

## Resultado esperado

- Modal "Em preparo" abre com **um único botão preenchido** (a ação de avançar status). Demais ações são reconhecíveis pelo ícone colorido + outline neutro.
- Mesma linguagem em todos os modais do fluxo: foco visual no próximo passo, ferramentas auxiliares discretas.
- Sem regressão funcional: todos os handlers, props e fluxos permanecem idênticos.

## Detalhes técnicos

- Não criar tokens novos em `src/styles.css`; `primary`, `success`, `warning`, `destructive`, `muted`, `border` já existem.
- Substituições devem usar `cn(...)` quando combinarem `variant` + className do consumidor para não vazar `bg-*` antigo.
- Verificar visualmente o modal `[Em preparo]` (rota `/admin/pedidos`, abrir um pedido em preparo) após a build para confirmar hierarquia.
