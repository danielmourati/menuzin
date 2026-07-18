
## Objetivo

Migrar a plataforma do modelo atual de 2 planos (`start`, `pro`) para 3 planos: **Presença** (gratuito, só vitrine no Guia Menuzin), **Start** (pedidos organizados) e **Pro** (automação e pagamento online). Aplicar bloqueios de recurso, limites e ajustar landing/admin/checkout.

## Nomenclatura e migração

- Novo enum de plano: `presenca | start | pro`.
- Tenants atualmente em `start` (grátis) precisam ser reclassificados. Assumo migração conservadora: **todos os `start` viram `presenca`**, e o novo `start` passa a ser plano pago. Confirmo antes de rodar a migration se preferir manter os `start` atuais no novo `start` (regra alternativa).
- `pro` mantém o slug, novo conjunto de features.
- Plano `plus` da landing (`src/lib/plans.ts`) removido — hoje é só institucional, não existe no banco.

## Escopo por camada

### 1. Modelo de dados (`supabase/migrations/*.sql`)

- Nova migration:
  - Atualiza `public.tenants.plan` default para `'presenca'` e adiciona `CHECK (plan IN ('presenca','start','pro'))`.
  - `UPDATE public.tenants SET plan = 'presenca' WHERE plan = 'start'` (regra padrão, confirmar).
  - Insere/atualiza linhas em `public.plans` (Presença R$ 0, Start R$ 57,90, Pro R$ 127,90) com `features[]`, `monthly_price`, `annual_price`, `billing_periods`, `sort_order`, `active`.
  - Novos campos em `public.plans` (ou `public.plan_limits` se preferir): `max_products`, `max_categories`, `max_orders_per_month`, `max_users`, `allows_orders_panel`, `allows_online_payment`, `allows_auto_print`, `allows_kitchen_printer`, `allows_pizza_fractional`, `allows_advanced_addons`, `allows_delivery_by_distance`, `allows_full_reports`, `allows_featured_directory`, `hide_menuzin_brand`, `custom_domain`. Uso `plans.limits jsonb` para não explodir o schema (compatível com `plans` atual).
  - GRANTs mantidos; nenhuma nova tabela pública.

### 2. Feature gating (`src/lib/plan-features.tsx`, `src/lib/plan-server.ts`)

- `TenantPlan = 'presenca' | 'start' | 'pro'`.
- `PlanFeature` ganha: `ordersPanel`, `onlinePayment`, `autoPrint`, `pizzaFractional`, `advancedAddons`, `combos`, `distanceDeliveryFee`, `advancedCoupons`, `upsell`, `customerCrm`, `customerRecovery`, `fullReports`, `directoryFeatured`, `hideMenuzinBrand`, `multipleUsers`, `manualPrint`, `basicCoupons`, `orderStatus`.
- Tabela `PLAN_FEATURES` reescrita conforme spec:
  - **Presença**: nada além de `directory` (vitrine).
  - **Start**: `ordersPanel`, `orderStatus`, `basicCoupons`, `manualPrint`, `whatsappOrders`, `dashboard`, `customerCrm` (básico), 2 usuários.
  - **Pro**: tudo.
- `PLAN_LABEL`: `Presença`, `Start`, `Pro`.
- `plan-server.ts`: `getTenantPlan` já lê `plans.slug`, só adiciona `'presenca'` no normalize; nova `requirePlan(tenantId, minPlan)` para checar hierarquia.
- Novo helper `getPlanLimits(plan)` (client) e `getPlanLimitsServer(tenantId)` (server) para limites numéricos (produtos, pedidos/mês).

### 3. Limites aplicados

- **Cardápio**: em `saveProduct` e `saveCategory` (`catalog-admin.functions.ts`) verificar `max_products` / `max_categories` para plano `presenca` (20 / 4). Bloquear com erro amigável.
- **Pedidos/mês**: novo campo virtual — contar `orders` do tenant no mês corrente antes de aceitar novos pedidos (server-side, dentro do `createOrder`/`checkout`). Ao exceder: no `presenca`, storefront degrada para `wa.me` puro (sem gravar pedido no painel); no `start` (400/mês) bloqueia checkout estruturado com mensagem "Limite mensal atingido, faça upgrade".
- **Usuários**: `admin/usuarios` (se existir) valida ao convidar; caso não exista fluxo hoje, apenas expor limite no `PLAN_LIMITS` para próxima iteração.

### 4. Storefront (`src/routes/$slug.tsx` e componentes)

- Tenants `presenca`: storefront renderiza cardápio, botões `Pedir pelo WhatsApp` (mensagem já pronta via `whatsappOrderMessage`), **sem** `CartDrawer` estruturado, sem checkout, sem pagamento online, sem status. Badge/rodapé "Publicado por Menuzin" visível (não removível).
- Tenants `start`: fluxo atual sem pagamento online, sem auto-print, sem taxa por km, sem pizza fracionada avançada, sem cupons avançados. Aplicar gates via `can(...)` já existentes.
- Tenants `pro`: comportamento atual completo.
- Guia Menuzin (`/guia`): destaque pago só para `pro` (`allows_featured_directory`); listagem básica disponível para todos.

### 5. Admin (`src/routes/admin.*`)

- `admin.assinatura.tsx`: adicionar card do plano **Presença**, mostrar comparativo dos 3, CTAs `Fazer upgrade para Start` / `Pro`.
- Rotas com features Pro (`admin.configuracoes.pagamentos`, `admin.configuracoes.impressora`, `admin.cupons` avançado, `admin.taxas-entrega` km, `admin.relatorios` completo): `UpgradeNotice` já usada, ajustar copy para citar Start vs Pro conforme a feature.
- Novo `UpgradeNotice` aceita `requiredPlan?: TenantPlan` para variar título/descrição.
- Bloquear rotas `admin.pedidos`, `admin.dashboard`, `admin.cupons` para `presenca` com tela "Disponível a partir do Start".
- Wizard de novo tenant (`platform.tenants.novo.tsx`): seletor default `Presença`.

### 6. Landing (`src/routes/index.tsx`, `src/lib/plans.ts`, `src/components/landing/LandingSections.tsx`)

- Substituir `plans` estáticos por 3 tiers com preços R$ 0 / R$ 57,90 / R$ 127,90, features do PRD do usuário, CTAs: `Cadastrar grátis`, `Começar a vender`, `Profissionalizar meu delivery`.
- Remover cartão `plus`.

### 7. Superadmin (`src/routes/platform.planos.tsx`)

- Já suporta CRUD; garantir que `sort_order` renderize `presenca < start < pro`. Nada de código extra além do seed pela migration.
- Página `platform.tenants.tsx` (lista): exibir o novo label e permitir alterar plano manualmente (já suportado).

### 8. Guia Menuzin

- `directory_public` já existe; sem alteração de schema.
- Ordenação/destaque no `/guia` respeita `allows_featured_directory` (só `pro`). Tenants `presenca` aparecem no listado orgânico com marca Menuzin obrigatória.

## Detalhes técnicos

```text
tenants.plan enum: presenca | start | pro
plans.slug:       presenca | start | pro
plans.limits (jsonb, novo):
  { max_products, max_categories, max_orders_per_month, max_users,
    features: { ordersPanel, onlinePayment, autoPrint, ... } }
```

- `plan-features.tsx` usa tabela local hardcoded como fallback e sobrescreve com `plans.limits` quando disponível (para permitir tuning via superadmin sem redeploy).
- Contador de pedidos/mês: query em `orders WHERE tenant_id=? AND created_at >= date_trunc('month', now())`; cache 60s no server function.
- Migration: `presenca` como enum implícito via CHECK constraint (sem alterar type Postgres já existente), preservando compat.

## Fora de escopo

- Cobrança/split real dos planos pagos (assinatura já existe via `tenant_subscriptions`; nada muda aqui além do seed dos planos).
- Fluxo de convite de múltiplos usuários (só expõe o limite).
- Domínio personalizado / white-label real (só o flag).

## Riscos e confirmações

- **Reclassificação de tenants existentes**: proponho `start → presenca`. Se algum tenant já tem pedidos configurados e deveria permanecer com painel, precisa lista explícita ou regra "quem tem pedidos nos últimos 30 dias vira `start` pago"; confirmar antes de rodar a migration.
- **Storefront quebrar para tenants em `presenca`**: gate no `CartDrawer` e checkout precisa ser à prova de bala — a home passa a mostrar só "Pedir pelo WhatsApp".
- **Limites duros (produtos/pedidos)** podem surpreender usuários ativos; sugiro banner de aviso 7 dias antes do bloqueio real e liberar carência inicial de 30 dias após migração.
