## 1. Corrigir alteração de plano pelo superadmin (anexos 1 e 2)

**Diagnóstico:** hoje o plano efetivo do tenant é derivado de `tenant_subscriptions.plan.slug` (ver `src/lib/plan-server.ts` → `getTenantPlan`), mas:
- Em `/platform/lojas`, `adminUpdateTenant` só grava `tenants.plan` — a assinatura fica com o plano antigo, então gates server-side não mudam.
- Em `/platform/assinaturas`, o update da assinatura muda `tenant_subscriptions.plan_id`, mas `tenants.plan` (usado pelo hook client `useTenantPlan` → `getMyTenant`) fica desatualizado.
- `useTenantPlan` lê `tenants.plan` direto, não o plano efetivo da assinatura → UI destoa do server.
- Quando o admin do tenant paga um upgrade via PIX (`createSubscriptionCharge` com `plan_id` diferente), o webhook (`approveAndRenew`) só renova `due_date`/`status` — **não troca `plan_id` nem `amount`** da assinatura, então o "upgrade pago" não vira efetivo.

**Ações:**
1. `src/lib/platform.functions.ts` (`adminUpdateTenant`): quando `patch.plan` mudar, resolver `plan_id` via `plans.slug`, atualizar `tenant_subscriptions` (`plan_id`, `amount = plans.monthly_price`) e registrar `subscription_events` (`event_type: "plan_changed"`, `metadata: { from, to, by: "platform_admin" }`). Escrever `tenants.plan` no mesmo update para manter consistência.
2. `src/lib/subscriptions.functions.ts` (`adminUpdateSubscription`): após update da assinatura, propagar `tenants.plan` para o slug do novo plano. Mesmo evento `plan_changed`.
3. `src/lib/subscription-renewal.server.ts` (`approveAndRenew`): ao aprovar, ler `subscription_payments.plan_id` e, se diferir do `tenant_subscriptions.plan_id`, atualizar `plan_id` + `amount` da assinatura e `tenants.plan` (via slug). Adicionar evento `plan_upgraded` (ou `downgraded`).
4. `src/lib/plan-features.tsx` (`useTenantPlan`): trocar a fonte de `plan` para o slug efetivo. Criar server fn leve `getMyEffectivePlan` (em `src/lib/plan-features.functions.ts`) que retorna `{ plan: getTenantPlan(tenantId) }` usando `requireSupabaseAuth` + `tryResolveEffectiveTenantId`; usar essa query no hook (com `staleTime: 30_000`). Isso garante mudança imediata assim que o superadmin salva ou o webhook aprova.
5. Invalidação imediata:
   - `/platform/lojas` e `/platform/assinaturas`: após `mutate` de plano, `qc.invalidateQueries` em `["admin-tenants"]`, `["admin-subs"]`, `["my-tenant"]`, `["my-effective-plan"]`.
   - Webhook MP: não há client — o polling / próximo `staleTime` cobre; hook usa `refetchOnWindowFocus: true` para reconhecer volta do PIX.
6. Gates de plano: `PlanGate`, `UpgradeNotice`, `useTenantPlan` já centralizam — nenhuma UI adicional muda, mas passam a refletir o plano efetivo real, respeitando bloqueio/liberação.

## 2. Card do produto estilo iFood (anexo 3)

Editar `src/components/storefront/ProductModal.tsx`:
- Substituir o botão flutuante atual (`ArrowLeft`) por um botão redondo com fundo `bg-black/50 text-white` e ícone `ChevronDown` (recolher) no canto superior esquerdo da imagem — mantém a ação `onOpenChange(false)`.
- Adicionar um "badge da loja" flutuante sobre a base da imagem (padrão iFood):
  - Container `absolute inset-x-3 bottom-3 rounded-xl bg-background/95 shadow-lg backdrop-blur px-3 py-2 flex items-center gap-3`.
  - Logo circular (`tenant.logo_url` ou inicial), nome da loja + selo Pro (se `plan === "pro"`), linha secundária `★ rating (count) · prep_time · pedido mínimo` usando dados que já vêm em `tenant` (adaptar via nova prop `storeInfo`).
- Passar `storeInfo` do storefront (`src/routes/$slug.tsx` / `loja.$slug.tsx`) para o modal com `{ name, logoUrl, rating, ratingCount, prepTime, minOrder, isPro }` derivado do catálogo/tenant existente.
- Ao clicar no badge, abrir o `StoreAboutDrawer` (reaproveitar callback já existente na página) — opcional se dados prontos.

## 3. Aba Aparência

Em `src/routes/admin.aparencia.tsx`:
- Remover blocos "Cor principal" (paleta) e "Tema" (Claro/Escuro), estados `color`/`dark` e a constante `palette`.
- Manter apenas upload de Logo + Imagem de fundo. Preview usa apenas `coverUrl` (com fallback para gradiente neutro `bg-muted`).
- Persistir `theme_from`/`theme_to` com valor padrão fixo (ex.: `#FF4F1F`) para não quebrar consumidores existentes; ou remover do payload se `updateMyTenant` aceitar parciais (verificar antes de tocar).

## Detalhes técnicos

- Novo arquivo: `src/lib/plan-features.functions.ts` com `getMyEffectivePlan` (server fn) chamado pelo hook `useTenantPlan`.
- `adminUpdateTenant` / `adminUpdateSubscription` / `approveAndRenew`: helper local `syncTenantPlanFromSubscription(tenantId, planId)` em `src/lib/plan-server.ts` para evitar duplicação.
- Nenhuma migração de schema — colunas já existem (`tenant_subscriptions.plan_id`, `tenants.plan`, `subscription_events`).
- `ProductModal`: novos campos opcionais em props, sem breaking change para outros consumidores.
- Aparência: se `theme_from` for obrigatório no `updateMyTenant`, manter default silencioso; não expor UI.

## Escopo fora
- Sem mudança de RLS, sem mudança de fluxo de pagamento MP em si (apenas o hook de aprovação passa a promover plano).
- Sem novos ícones/telas além do card iFood.
