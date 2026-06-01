## Auditoria — o que ainda é mock

`src/lib/mock-data.ts` exporta dois grupos:

**A. Tipos (contrato de UI)** — usados em ~25 componentes, devem ser preservados (apenas renomeados/movidos):
`Product`, `ProductAddon`, `Category`, `Order`, `OrderItem`, `OrderStatus`, `OrderMode`, `PaymentStatus`, `OrderStatusHistoryEntry`, `Tenant`, `AdminNotification`.

**B. Dados mock ainda em uso**

| Símbolo | Onde é lido | Status no DB |
|---|---|---|
| `store` (loja hard-coded "Burger Prime") | `routes/index.tsx`, `admin.aparencia`, `admin.configuracoes.index`, `admin.dashboard`, `admin.pedidos`, `CartDrawer` | já existe em `tenants` (precisa buscar via `getMyTenant` / slug) |
| `tenants[]`, `getTenantBySlug`, `isSlugAvailable`, `slugify` | `platform.tenants.novo`, helpers | tabela `tenants` no DB; falta serverFn de criar/checar slug |
| `platformStores`, `platformGrowth` | `platform.dashboard`, `platform.lojas` | derivar de `tenants` + `orders` |
| `salesLast7Days`, `ordersByMode`, `topProducts` | `admin.dashboard` | derivar de `orders` + `order_items` |
| `plans` (catálogo de planos da landing) | `routes/index.tsx` | conteúdo estático, **não é mock** — mover para `src/lib/plans.ts` |
| `categories[]`, `products[]`, `orders[]`, `adminNotifications[]` | nenhum import em runtime | dead data — remover |

**C. Não é mock (já está integrado)**
- `useOrdersRealtime` lê do DB via `listOrdersForMyTenant` + realtime no `orders` (notificações em memória são derivadas, não mockadas).
- `useCustomerOrder`, `catalog.functions`, `catalog-admin.functions`, `orders.functions`, `tenants.functions`, `payments.functions` — todos no DB.

---

## Plano de migração — 5 fases

### Fase 1 — Separar tipos dos dados mock
- Criar `src/lib/domain-types.ts` com TODOS os types do bloco A acima.
- Refatorar os ~25 arquivos para `import type { ... } from "@/lib/domain-types"`.
- Mover `plans` para `src/lib/plans.ts` (constante estática de landing).
- Mover `slugify` para `src/lib/utils.ts` (puro, reaproveitável).

Resultado: `mock-data.ts` deixa de ser importado em runtime.

### Fase 2 — Loja única (`store`)

Substituir todos os usos de `store` por dados reais do tenant do admin logado:

- **Admin** (`admin.aparencia`, `admin.configuracoes.index`, `admin.dashboard`, `admin.pedidos`): consumir `getMyTenant()` via React Query. Formulários de configuração passam a salvar via nova serverFn `updateMyTenant({ name, whatsapp, description, address, city, state, delivery_fee, min_order, prep_time, hours, logo_url, theme_from, theme_to, social })` — usa middleware autenticado + RLS (`tenants: owners/admins update own`).
- **Storefront** (`CartDrawer`): receber o tenant carregado em `routes/loja.$slug.tsx` via props/contexto (já é buscado lá), removendo `store.deliveryFee` e `store.address`.
- **Landing** (`routes/index.tsx`): trocar "Demo da loja" por link para uma loja `featured` real (ou esconder se não houver). Critério a confirmar (ver pergunta).

### Fase 3 — Painel da plataforma

- Nova serverFn `listPlatformStores()` (somente `platform_admin`) — agrega por `tenant_id`: nome, slug, cidade/UF, status, plano, `orders_month` (count em `orders` dos últimos 30d) e `revenue_month` (sum `total` aprovado ou finalizado). Usa `supabaseAdmin` com checagem de `is_platform_admin`.
- Nova serverFn `getPlatformGrowth()` — count de tenants criados por mês nos últimos 6 meses.
- `platform.lojas.tsx` e `platform.dashboard.tsx` consomem via React Query; remover imports de mock.

### Fase 4 — Analytics do admin (`admin.dashboard`)

- Nova serverFn `getMyTenantAnalytics({ days: 7 })` retornando:
  - `salesLast7Days`: array `{ day, vendas, pedidos }` agregando `orders` por `date_trunc('day', created_at)` no tenant.
  - `ordersByMode`: count por `mode` (entrega/retirada/consumo_local).
  - `topProducts`: top 5 por `sum(qty)` em `order_items` join `orders` do tenant nos últimos 30d.
- Tela usa `useQuery`; remove imports de mock.

### Fase 5 — Criação de tenant

- Nova serverFn `createTenant(input)` (apenas `platform_admin`): insere em `tenants` + cria `user_roles` (owner) se `owner_user_id` informado. Inclui checagem de slug único no servidor.
- Nova serverFn `isSlugAvailable({ slug })` consultando `tenants`.
- `platform.tenants.novo.tsx` passa a usar `useMutation` + as duas serverFns; remove `tenants.push(...)` em memória.

### Fase 6 — Limpeza

- Deletar bloco B inteiro de `mock-data.ts`. Manter o arquivo apenas se algum re-export de tipos fizer sentido — preferência: remover o arquivo completamente após fase 1.
- Remover asset `prime-burguer-logo.png` se não houver mais referência.
- Rodar typecheck/build.

---

## Detalhes técnicos

- **Segurança**: todas as novas serverFns usam `requireSupabaseAuth` + RLS (defesa em camadas, como já feito em `catalog-admin.functions`). As funções de plataforma checam `is_platform_admin()` antes de qualquer leitura agregada.
- **React Query**: padrão `queryOptions` + `useQuery` em componentes; `useMutation` para writes; invalidação por chave (`["admin","tenant"]`, `["platform","stores"]`, etc.).
- **Sem mudanças de schema** — todas as tabelas necessárias (`tenants`, `orders`, `order_items`, `user_roles`, `profiles`) já existem com RLS adequada.
- **Sem novos secrets** nem novas dependências.

---

## Perguntas para destravar a fase 2

1. **Landing (`/`)**: o botão "Demo da loja" deve apontar para uma loja marcada como `featured`/destaque no DB, para a primeira loja ativa, ou ser removido?
2. **Admin para usuários sem tenant**: se um usuário logado abrir o admin sem `profiles.tenant_id`, mostramos onboarding ("crie sua loja") ou redirecionamos para `/platform/tenants/novo` quando ele for `platform_admin`?

Posso prosseguir com a Fase 1 assumindo defaults (1: primeira loja ativa; 2: tela de "loja não vinculada" com instruções) caso prefira não responder agora.