
# Controle de Assinaturas Menuzin

Implementação completa em uma entrega: schema de planos/assinaturas, painel super-admin, área "Minha Assinatura" do tenant, cobrança PIX via Mercado Pago da plataforma, webhook de confirmação, bloqueio automático e fallback de cortesia para tenants existentes.

## 1. Banco de dados (migration única)

Novas tabelas (`public`):

- **plans** — `id, name, slug, description, monthly_price, annual_price, billing_periods text[], features jsonb, active, created_at, updated_at`. Seed inicial: `start` (R$ 0, cortesia) e `pro` (R$ 79/mês).
- **tenant_subscriptions** — `id, tenant_id (unique), plan_id, status (ativa|pendente|vencida|tolerancia|bloqueada|cancelada|teste|cortesia), billing_period, amount, start_date, due_date (nullable), grace_days, auto_block_enabled, blocked_at, unblocked_at, notes, created_at, updated_at`.
- **subscription_payments** — `id, tenant_id, subscription_id, plan_id, amount, billing_period, reference_month date, due_date, paid_at, payment_status (pending|approved|rejected|cancelled|refunded|expired|manual), mercado_pago_payment_id (unique nullable), mercado_pago_preference_id, mercado_pago_external_reference, raw_response jsonb, created_at, updated_at`.
- **subscription_events** — `id, tenant_id, subscription_id, event_type, description, metadata jsonb, created_by, created_at`.

Cada tabela: GRANT + RLS. Policies:
- `plans`: SELECT para `authenticated` (lista pública dos planos); INSERT/UPDATE/DELETE só `is_platform_admin()`.
- `tenant_subscriptions` / `subscription_payments` / `subscription_events`: SELECT para usuários com `has_tenant_role(uid, tenant_id, '{owner,manager,platform_admin}')`; ALL para `is_platform_admin()`; INSERT/UPDATE bloqueado para o tenant (mudanças via server functions com `supabaseAdmin`).
- Triggers `set_updated_at`.

Fallback de cortesia: na própria migration, INSERT em `tenant_subscriptions` para todo tenant existente com plano `start`, status `cortesia`, `due_date NULL`, `auto_block_enabled=false`.

## 2. Server functions (`src/lib/subscriptions.functions.ts`)

Todas autenticadas via `requireSupabaseAuth`; carregam `supabaseAdmin` dentro do handler.

**Tenant (self-service):**
- `getMySubscription()` — assinatura + plano + últimos 10 pagamentos.
- `createSubscriptionCharge()` — gera cobrança PIX no MP da plataforma para a próxima mensalidade do tenant logado. Cria row `pending` em `subscription_payments`. Retorna `qr_code, qr_code_base64, ticket_url, payment_id`.
- `getChargeStatus({ paymentId })` — poll opcional para UI.

**Super-admin (gated por `has_role(uid,'platform_admin')`):**
- `listPlans` / `upsertPlan` / `togglePlanActive`.
- `listSubscriptions({ filter })` — filtros: ativos, vencendo_5d, vencidos, bloqueados, plan_slug.
- `updateTenantSubscription` — plano, valor, período, due_date, grace_days, auto_block, notes.
- `extendDueDate({ subscription_id, days })`.
- `blockTenant` / `unblockTenant`.
- `registerManualPayment` — cria payment `manual/approved` e renova due_date.
- `changeTenantPlan`.
- Todas gravam evento em `subscription_events`.

## 3. Mercado Pago da plataforma

Secret novo via `add_secret`: `MENUZIN_MP_ACCESS_TOKEN` (separado do MP por tenant — não confundir). Helper `src/lib/menuzin-mp.server.ts` com `createPixCharge(payment, payer)` chamando `POST https://api.mercadopago.com/v1/payments` (type `pix`, `notification_url` apontando para o webhook abaixo, `external_reference` = `subscription_payment_id`).

## 4. Webhook (`src/routes/api.public.menuzin-mp-webhook.ts`)

Server route pública. Fluxo:
1. Lê `data.id`, busca pagamento na API MP com `MENUZIN_MP_ACCESS_TOKEN` (valida autenticidade).
2. Resolve `subscription_payment` por `mercado_pago_payment_id` ou `external_reference`. Idempotência por unique constraint.
3. Atualiza `payment_status` + `raw_response`. Se `approved`:
   - marca `paid_at`,
   - calcula próxima `due_date` (start_date/atual + período),
   - status da subscription → `ativa`, limpa `blocked_at`,
   - registra evento `payment_approved` / `auto_unblocked`.
4. Sempre 200 (evita reentrega infinita), erros internos logados.

## 5. Lógica de status e bloqueio

Helper `computeSubscriptionStatus(subscription, now)` em `src/lib/subscription-status.ts` (puro):
- `cortesia` → sempre liberado.
- `due_date` futura > 5d → `ativa`.
- `due_date` em ≤ 5d → `ativa` + flag `expiring_soon`.
- Vencida e dentro de `grace_days` → `tolerancia`.
- Vencida fora da tolerância → `vencida` ou `bloqueada` (se `auto_block_enabled`).
- `cancelada` manual mantém.

Cron job (pg_cron diário 03:00 UTC) chama `/api/public/subscriptions-tick` que percorre subscriptions, recalcula status, marca `blocked_at` quando apropriado e registra evento.

## 6. Gate de acesso ("Tudo bloqueado")

Conforme escolhido: storefront público também sai do ar.

- Server function `getMyTenant` já usada pelo admin passa a retornar `subscription_status` e `subscription_blocked`.
- Novo helper `src/lib/tenant-access.server.ts: assertTenantNotBlocked(tenantId)` consultado em:
  - `loja.$slug.tsx` loader (storefront) → se bloqueado, renderiza tela "Loja temporariamente indisponível".
  - `orders.functions.ts` `createOrder` → recusa pedidos.
  - `admin/AdminLayout` → se bloqueado, esconde menu e renderiza componente `SubscriptionBlockedScreen` com botão "Pagar assinatura agora" (única rota liberada: `/admin/assinatura`).
- Banner amarelo persistente quando `expiring_soon` ou `tolerancia` no `AdminLayout`.

## 7. UI Super-admin

Nova rota `src/routes/platform.assinaturas.tsx` no `PlatformLayout`:
- Tabela de tenants com colunas: loja, plano, valor, período, status (badge), próximo vencimento, dias restantes, último pagamento, ações.
- Filtros (chips): Todos, Vencendo em 5d, Vencidos, Bloqueados, Por plano.
- Drawer de edição: trocar plano, alterar valor/período, prorrogar (input dias), bloquear/desbloquear, registrar pagamento manual, ver histórico de pagamentos + eventos.
- Nova rota `src/routes/platform.planos.tsx` para CRUD de planos.
- Adicionar links na nav do `PlatformLayout` ("Assinaturas", "Planos").

## 8. UI Tenant — "Minha Assinatura"

Nova rota `src/routes/admin.assinatura.tsx` + item no `AdminLayout`:
- Card resumo: plano atual, recursos incluídos, valor, período, próximo vencimento, status (badge), dias restantes.
- Alerta visual conforme status (`expiring_soon`, `tolerancia`, `vencida`, `bloqueada`).
- Botão "Pagar assinatura via PIX" → modal com QR code + copia-e-cola + polling de status a cada 5s.
- Tabela histórico de pagamentos (data, valor, período, status, ID MP).
- Se plano `start`: card "Fazer upgrade para Pro" com CTA que abre fluxo de upgrade (atualiza subscription para `pro` em status `pendente` e gera cobrança).

## 9. Badges e visual

Componente `SubscriptionStatusBadge` reutilizado em ambas as áreas. Cores: ativa=success, vence_em_breve=warning, tolerancia=warning, vencida=destructive/outline, bloqueada=destructive, cortesia=secondary, teste=info, cancelada=muted.

## 10. Detalhes técnicos

- Não tocar em `tenants.plan` para preservar compatibilidade — passa a derivar de `tenant_subscriptions.plan_id` via helper `getTenantPlan` (server) e `useTenantPlan` (client) atualizados para LEFT JOIN com subscription. Plano efetivo = `subscription.plan.slug` quando existe, senão `tenants.plan`.
- `MENUZIN_MP_ACCESS_TOKEN` solicitado via `add_secret` antes da implementação do helper MP.
- Toda a UI em português, mantendo o design system atual (sem refator visual).
- Não altera fluxo de MP por tenant (pedidos online) — namespaces separados (`store_payment_settings` continua intocado).

## Resultado

Super-admin gerencia planos/assinaturas, tenants pagam via PIX direto no admin, MP confirma via webhook, bloqueio automático após tolerância, tenants atuais ficam em cortesia sem interrupção.
