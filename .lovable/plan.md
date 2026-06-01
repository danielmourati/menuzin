## Objetivo

Tirar o app do `mock-data.ts` e colocá-lo sobre Lovable Cloud (Supabase) com:

- Multi-tenant real (cada loja isolada por `tenant_id`)
- Auth do painel admin (email/senha + Google)
- Catálogo persistente (lojas, categorias, produtos, addons)
- Pedidos persistentes (orders + order_items)
- Dashboard da plataforma lendo dados reais
- Seed com as 3 lojas + cardápio + pedidos do mock atual

## Fases

### Fase 1 — Ativar Lovable Cloud

Habilitar a integração (provisiona Supabase, gera `src/integrations/supabase/*`).

### Fase 2 — Schema (1ª migration)

```text
tenants (lojas)
  id, slug (uniq), name, city, whatsapp, logo_url, cover_url,
  primary_color, accent_color, plan, status, created_at

profiles                          user_roles
  id (=auth.users.id)              user_id → auth.users
  tenant_id → tenants              tenant_id → tenants (null = platform)
  full_name, avatar_url            role: app_role enum
  created_at                       (owner | admin | staff | platform_admin)

categories                       products
  id, tenant_id, name, sort       id, tenant_id, category_id,
                                  name, description, price, image_url,
                                  active, sort

addon_groups                     addons
  id, product_id, name,           id, group_id, name, price
  min_select, max_select

orders                           order_items
  id, tenant_id, number (uniq      id, order_id, product_id,
   por tenant), customer_name,     name_snapshot, qty,
   whatsapp, mode, address,        unit_price, addons (jsonb),
   payment_method, subtotal,       note
   delivery_fee, total, status,
   created_at, updated_at

platform_metrics (view)
  agrega tenants / orders / receita para o /platform/dashboard
```

**Segurança:**

- `app_role` como enum + função `has_role(_user_id, _role)` SECURITY DEFINER (evita recursão).
- Função `current_tenant_id()` SECURITY DEFINER lendo de `profiles`.
- RLS em todas as tabelas:
  - `tenants/products/categories/addons`: SELECT público (`USING true`) para a vitrine `/loja/$slug`; INSERT/UPDATE/DELETE só para `has_role('owner'|'admin', tenant)`.
  - `orders/order_items`: INSERT público (cliente final cria pedido); SELECT/UPDATE só do próprio tenant.
  - `profiles/user_roles`: usuário lê o próprio; `platform_admin` lê tudo.
- GRANTs explícitos por tabela (`anon` SELECT só nas públicas; `authenticated` CRUD; `service_role` ALL).
- Trigger `handle_new_user` cria `profiles` automaticamente no signup.

### Fase 3 — Seed (2ª migration, dados)

Insere via `INSERT`:

- 3 tenants do `platformStores` (burger-prime, pizzaria-napoli, acai-tropical)
- Categorias + produtos + addons da `burger-prime` (mock atual)
- Alguns pedidos de exemplo

### Fase 4 — Auth

- `supabase--configure_social_auth` com `["google"]` (broker Lovable).
- Layout `src/routes/_authenticated.tsx` com `beforeLoad` checando `context.auth.isAuthenticated`.
- Mover rotas `admin.*` para `_authenticated/admin.*`; rotas `platform.*` para `_authenticated/_platform.*` (gate de role `platform_admin`).
- `admin.login.tsx` real: email/senha + botão "Entrar com Google" via `lovable.auth.signInWithOAuth("google", ...)`.
- `src/start.ts`: adicionar `attachSupabaseAuth` ao `functionMiddleware`.
- `__root.tsx`: `onAuthStateChange` único invalidando router + queryClient.

### Fase 5 — Camada de dados (server functions)

Criar em `src/lib/*.functions.ts` (arquivos finos, só `createServerFn`):

```text
tenants.functions.ts      → getTenantBySlug (público, supabaseAdmin scoped por slug)
catalog.functions.ts      → getCatalog(slug) — vitrine pública
admin/products.functions.ts, categories.functions.ts
                          → CRUD com requireSupabaseAuth + tenant do profile
orders.functions.ts       → createOrder (público), listOrders, updateOrderStatus
platform.functions.ts     → métricas agregadas (gate platform_admin)
```

Loaders de rotas públicas (`/loja/$slug`, confirmação, acompanhar) chamam server fns públicas (sem `requireSupabaseAuth`). Rotas admin usam loaders sob `_authenticated/` chamando fns protegidas.

### Fase 6 — Refatorar componentes

- Trocar todos os imports de `@/lib/mock-data` por server fns + TanStack Query (`queryOptions` + `useSuspenseQuery`).
- `CartContext` continua client-side; `checkout` passa a chamar `createOrder` server fn.
- `OrdersRealtimeListener` agora usa `supabase.channel('orders').on('postgres_changes')` real.
- Manter `mock-data.ts` apenas como types compartilhados (ou apagar e usar tipos gerados de `integrations/supabase/types`).

### Fase 7 — Verificação

- Rodar `scripts/ssr-smoke-test.mjs` contra preview.
- Testar: signup admin → cria tenant → cadastra produto → cliente faz pedido em `/loja/<slug>` → admin vê em `/admin/pedidos` em realtime.

## Detalhes técnicos importantes

- **Sem Edge Functions** para lógica do app — tudo via `createServerFn`. Edge functions atuais do Mercado Pago ficam como estão (são webhooks externos).
- **Imports server-only**: `client.server.ts` só dentro de `*.functions.ts` (evitar vazamento para o bundle do cliente — vide `tanstack-supabase-import-graph`).
- **Loaders isomórficos**: nunca chamar `supabaseAdmin` direto em loader; sempre via server fn.
- `**getUser()` no servidor** para validar JWT (não `getSession()`).
- **GRANTs** em toda tabela `public` na mesma migration que a cria.
- **Reset password**: criar rota `/reset-password` pública.

## Fora deste plano

- Storage de imagens de produto (continua URL externa por enquanto — pode ser fase 2).
- Pagamentos Mercado Pago (já existem edge functions; integrar com `orders` numa próxima iteração).
- Convites de usuários para uma loja existente (owner adiciona staff) — modelar agora, UI depois.

Posso seguir e executar tudo isso assim que você aprovar.