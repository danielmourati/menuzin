## Visão geral

Entregar 7 frentes mantendo o multi-tenant atual intacto:

1. Plano do tenant (`start` / `pro`) com seleção pelo super-admin.
2. Helper central de feature flags por plano.
3. Restrições de Mercado Pago e múltiplas impressoras no Start.
4. Relatórios básicos no admin do tenant.
5. Saudação dinâmica no dashboard admin.
6. Seção de planos na home pública + remover "MVP" / "Plataforma pronta para vender".
7. Renomear "FoodCatálogo" → "Menuzin" em toda a home pública.

Tudo respeita o tenant ativo. Nenhuma refatoração fora do escopo.

---

## 1. Plano no banco (migração)

A tabela `tenants` já tem coluna `plan` (usada em `claimNewTenant` como `"start"`). Vou:

- Garantir um CHECK/enum simples via CHECK constraint: `plan IN ('start','pro')`.
- Default `'start'`.
- Backfill: `UPDATE tenants SET plan='start' WHERE plan IS NULL OR plan NOT IN ('start','pro')`.

Migração única, sem mexer em RLS existente.

## 2. Helper de feature flags

Novo arquivo `src/lib/plan-features.ts`:

```ts
export type TenantPlan = "start" | "pro";
export const PLAN_FEATURES = {
  start: { reports:true, whatsappOrders:true, dashboard:true, orderStatus:true,
           mercadoPago:false, multiplePrinters:false, prioritySupport:false },
  pro:   { reports:true, whatsappOrders:true, dashboard:true, orderStatus:true,
           mercadoPago:true,  multiplePrinters:true,  prioritySupport:true },
};
export function canUse(plan: TenantPlan | null | undefined, feature) { ... }
```

Hook `useTenantPlan()` (em `src/lib/plan-features.tsx`):
- Lê `getMyTenant` via TanStack Query (já existe).
- Expõe `{ plan, can(feature), isPro }`. Fallback = `start`.

Componente `<UpgradeNotice feature="..." />` com mensagem "Este recurso está disponível no Plano Pro." + CTA placeholder.

## 3. Restrições Start

**Mercado Pago** (`admin.configuracoes.pagamentos.tsx`):
- Se `!can('mercadoPago')`, esconder o card de credenciais e o switch de pagamentos online; manter Pix manual / dinheiro / cartão na entrega.
- Mostrar `<UpgradeNotice />` no lugar.
- Servidor: em `saveMpCredentials` (em `src/lib/payments.functions.ts`) e `updatePaymentSettings` (campos `pix_enabled`, `credit_card_enabled`, `debit_card_enabled`), validar plano do tenant; se Start, lançar erro "Recurso disponível no Plano Pro".

**Múltiplas impressoras** (`ExtraPrintersManager.tsx` + `tenant-printers.functions.ts`):
- UI: se Start, substituir o manager por `<UpgradeNotice />`; a impressora padrão (`printer_settings`) continua funcionando.
- Server: `saveTenantPrinter` bloqueia se plano = start (listar/deletar continua para não quebrar tenants que viram Start).
- Botão "Imprimir comanda cozinha" (`PrintKitchenButton`): se Start, esconder ou mostrar tooltip "Disponível no Plano Pro".

## 4. Relatórios básicos

Nova rota: `src/routes/admin.relatorios.tsx`.

Server fn nova `src/lib/reports.functions.ts` com `getBasicReports({ from, to })` usando `requireSupabaseAuth` + `resolveEffectiveTenantId`. Consulta `orders` + `order_items` filtrando por `tenant_id` e período. Retorna:

- `totalSales`, `ordersCount`, `averageTicket`
- `topProducts` (top 5)
- `ordersByStatus`
- `paymentMethods`
- `ordersByType` (delivery vs retirada vs consumo_local)

UI:
- Filtros: chips "Hoje", "7 dias", "Mês atual" + DatePicker para custom.
- Cards: 3 KPIs no topo.
- Tabelas simples para listas (sem gráficos por enquanto — mantém leve e responsivo).
- Link no menu lateral do admin (`AdminLayout.tsx`).

## 5. Saudação no dashboard

Em `src/routes/admin.dashboard.tsx`, adicionar header:

```tsx
const hour = new Date().getHours();
const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
const name = profile?.full_name?.split(" ")[0];
<h1>{name ? `${greet}, ${name}!` : `${greet}!`}</h1>
```

Lê `profiles.full_name` via `useAuth` ou nova consulta leve. Integrado visualmente com o header existente, sem refatorar o resto.

## 6. Super-admin: seleção de plano

- `src/routes/platform.tenants.novo.tsx`: adicionar `<Select>` Plan (Start / Pro), default Start.
- `src/routes/platform.lojas.tsx`: na edição/listagem, permitir trocar o plano (badge + ação rápida).
- Servidor: ampliar input schema de criação/edição de tenant em `platform.functions.ts` aceitando `plan: z.enum(["start","pro"]).default("start")`. Verificação: só `platform_admin` pode alterar.

## 7. Home pública (`src/routes/index.tsx`)

- Remover badge "Plataforma pronta para vender" e qualquer texto "MVP".
- Substituir "FoodCatálogo" por "Menuzin" em todo o arquivo (título, hero, mockups, footer, meta tags).
- Atualizar `head()` (title/description/og) para Menuzin.
- Nova seção `<Pricing>` com 2 cards (Start grátis destaque suave; Pro destaque forte com badge "Recomendado"):
  - Start: produtos ilimitados, dashboard completo, gestão de status, WhatsApp, relatórios básicos.
  - Pro: tudo do Start + Mercado Pago, múltiplas impressoras, suporte personalizado.
  - CTA: "Começar agora" → `/admin/login` (signup).
- Atualizar `src/lib/plans.ts` para refletir os 2 planos novos (remover Plus) ou criar dados locais na seção — vou usar dados locais na seção para não impactar outros consumidores.

## 8. Out of scope

- Pagamento real do upgrade (CTA só leva ao admin).
- Gráficos avançados (Recharts) — fica para depois.
- Migração de tenants existentes para Pro automaticamente.
- Mudanças em RLS ou em fluxos de checkout/pedido.
- Renomear o produto fora da home (admin, e-mails, etc.).

## Ordem de execução

1. Migração `plan` em tenants (CHECK + default + backfill).
2. `plan-features.ts` + hook + `UpgradeNotice`.
3. Server guards em payments e tenant-printers.
4. UI gating em pagamentos, impressoras extras e botão cozinha.
5. Relatórios: server fn + rota + link no menu.
6. Saudação no dashboard.
7. Plano no fluxo super-admin (form + server).
8. Home: rename, remover MVP/badge, seção Pricing.
