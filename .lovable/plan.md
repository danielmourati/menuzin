# Plano: Acesso de Platform Admin às Lojas

## Problema
1. `admin.login.tsx` sempre redireciona para `/admin/dashboard` — para `dmouraphb@gmail.com` (platform_admin sem `tenant_id`) isso cai em `OnboardingClaim` indevidamente.
2. ServerFns admin resolvem tenant via `profiles.tenant_id` do próprio usuário. Platform admin não tem tenant_id → não consegue acessar painel de nenhuma loja.

## Solução

### 1. Redirecionamento por papel no login
**`src/routes/admin.login.tsx`**: Após `signInWithPassword` / OAuth callback, consultar `user_roles` do usuário. Se contiver `platform_admin` → redirect `/platform/dashboard`. Senão → `/admin/dashboard`.

### 2. Tenant ativo (impersonação)
**Novo `src/lib/active-tenant.ts`**: helpers `getActiveTenantId()` / `setActiveTenantId(id|null)` / `clearActiveTenant()` usando `localStorage` + `useSyncExternalStore` para reatividade. Hook `useActiveTenantId()`.

### 3. Anexar header em serverFns
**Novo `src/lib/active-tenant-attacher.ts`**: middleware client que injeta `X-Active-Tenant: <id>` em todas as chamadas serverFn quando `getActiveTenantId()` retorna valor.
**`src/start.ts`**: append do attacher em `functionMiddleware` (preservar `attachSupabaseAuth` existente).

### 4. Resolução server-side validada
**Novo `src/lib/active-tenant.server.ts`**:
```ts
resolveEffectiveTenantId({ userId, supabase, supabaseAdmin }): Promise<string>
```
- Lê header `x-active-tenant` via `getRequestHeader`.
- Se presente: verificar via `supabaseAdmin` que (a) usuário tem role `platform_admin` em `user_roles` e (b) tenant existe. Se válido, retorna o id.
- Caso contrário: fallback para `profiles.tenant_id` (comportamento atual).
- Lança erro claro se nenhum tenant resolvido.

**Refatorar serverFns admin** para usar `resolveEffectiveTenantId` em vez de ler `profiles.tenant_id` diretamente:
- `src/lib/catalog-admin.functions.ts`
- `src/lib/tenants.functions.ts` (apenas onde aplicável)
- `src/lib/analytics.functions.ts`
- `src/lib/orders.functions.ts` (admin reads/updates)
- demais que seguem o mesmo padrão (settings, addons, etc.)

### 5. Botão "Acessar painel" em `/platform/lojas`
**`src/routes/platform.lojas.tsx`**: em cada card de loja adicionar botão que chama `setActiveTenantId(store.id)` + `queryClient.invalidateQueries()` + `navigate({ to: '/admin/dashboard' })`.

### 6. AdminLayout: banner de impersonação
**`src/components/admin/AdminLayout.tsx`**:
- Se `isPlatformAdmin` e sem `tenant_id` próprio e sem `activeTenantId` → mostrar tela "Selecione uma loja em /platform/lojas" (não `OnboardingClaim`).
- Se `activeTenantId` setado → banner amarelo no topo: "Acessando como admin: <nome da loja>" + botão "Sair da loja" que chama `clearActiveTenant()` + navega para `/platform/lojas`.
- Usuários comuns: comportamento inalterado.

### 7. Guarda em `/platform/*`
**Novo `src/components/platform/PlatformLayout.tsx`** (ou inline nas rotas): verifica `useAuth().isPlatformAdmin`. Se falso → redirect `/admin/dashboard`. Aplicar em `platform.dashboard.tsx`, `platform.lojas.tsx`, `platform.tenants.novo.tsx`.

## Sem migrações
RLS atual já cobre platform_admin via `is_platform_admin()`. Validação server-side do header é obrigatória (usuário comum não pode forjar acesso a outro tenant).

## Fora de escopo
- Auditoria/histórico de impersonação
- Login como usuário específico (apenas seleção de loja)
- Múltiplas lojas ativas simultaneamente

## Arquivos
**Novos:** `src/lib/active-tenant.ts`, `src/lib/active-tenant-attacher.ts`, `src/lib/active-tenant.server.ts`, `src/components/platform/PlatformLayout.tsx`.
**Editados:** `src/start.ts`, `src/routes/admin.login.tsx`, `src/components/admin/AdminLayout.tsx`, `src/routes/platform.dashboard.tsx`, `src/routes/platform.lojas.tsx`, `src/routes/platform.tenants.novo.tsx`, `src/lib/catalog-admin.functions.ts`, `src/lib/tenants.functions.ts`, `src/lib/analytics.functions.ts`, `src/lib/orders.functions.ts`.
