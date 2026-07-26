## 1) `/platform/planos` — toggle ativar/desativar refletindo nos tenants

- Em `src/routes/platform.planos.tsx`, adicionar `Switch` de "Ativo/Inativo" direto no card de cada plano (além do que já existe no modal), disparando `adminUpsertPlan` com `active: !p.active` e invalidando `admin-plans` + `my-effective-plan`.
- Nos pontos onde o tenant escolhe/exibe planos, filtrar por `active = true`:
  - `src/routes/admin.assinatura.tsx` (comparativo de planos exibido ao lojista).
  - `src/routes/platform.lojas.tsx` (dropdown de plano ao editar loja) — apenas ativos.
  - `src/routes/platform.assinaturas.tsx` (dropdown de plan_id) — apenas ativos.
- Observação: a mudança no cadastro do tenant continua imediata via `syncSubscriptionFromTenantPlan` / `syncTenantPlanFromSubscription` já existentes; nenhum plano é excluído — apenas oculto para novas seleções.

## 2) Esconder plano Start da home

- Em `src/routes/index.tsx`, remover a entrada `id: "start"` do array `pricingPlans` (linhas 48–65) e ajustar o texto de `Presença → Pro` na seção de planos (linha ~301). Manter em `src/lib/plans.ts` (usado em outros lugares).

## 3) Corrigir fluxo do checkout PIX manual (anexo 1)

- `src/components/storefront/CartDrawer.tsx` linha 1364: o `StickySubtotal` da tela `payment-pix` chama `goTo("customer")`, o que volta para a tela de dados do cliente. Trocar para `goTo("review")` para seguir ao resumo/finalização, coerente com os outros métodos manuais (`cash`, `card_on_delivery`) que caem em `review` em `handleSelectMethod` (linha 588).

## 4) Corrigir quebra de linha do valor no toast de novo pedido (anexo 2)

- `src/components/orders/NewOrderToast.tsx` linhas 47–54: o valor "R$ 7,00" está quebrando entre "R$ 7," e "00". Adicionar `whitespace-nowrap` ao `<span>` do preço e trocar o wrapper `flex items-baseline gap-1` para permitir wrap apenas no rótulo (mantendo o valor íntegro). Também aplicar `whitespace-nowrap` no rótulo `({order.payment})` ou envolver em `<span className="block">` para forçar quebra abaixo do preço.

## 5) Impressão automática ao clicar em "Aceitar" em qualquer tela (anexo 3)

- Hoje o botão "Aceitar" do toast global (`OrdersRealtimeListener`) chama `acceptOrder` do hook `useOrdersRealtime`, que **não** dispara impressão. Só a página `/admin/pedidos` usa `useAcceptOrderWithKitchenPrint`.
- Refatorar `src/components/orders/OrdersRealtimeListener.tsx` para usar `useAcceptOrderWithKitchenPrint(orders, updateOrderStatus)` (obtendo `orders` e `updateOrderStatus` do mesmo `useOrdersRealtime()`), passando o `acceptOrder` retornado como handler do toast. Assim, aceitar pelo toast em qualquer tela dispara a impressão da cozinha (respeitando plano Pro e impressora configurada — comportamento já existente no hook, incluindo o toast de fallback quando não há impressora).

### Detalhes técnicos

- Filtro de planos ativos: usar `plans.filter(p => p.active)` no client (`adminListPlans` já retorna o campo).
- Toggle inline: `Switch` do shadcn com `onCheckedChange` acionando `adminUpsertPlan({ data: { ...p, active: v } })` e `toast.success`.
- `NewOrderToast`: manter estilo, apenas garantir `whitespace-nowrap` no valor; colocar `({order.payment})` numa linha própria abaixo do preço para não competir por espaço.
- `OrdersRealtimeListener`: nenhuma nova prop; toda a lógica fica dentro do componente (chamar dois hooks e combinar handlers).
