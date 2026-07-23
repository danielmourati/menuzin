## Objetivo
Restaurar o login tradicional por e-mail + senha em `/admin/login`, removendo o fluxo atual de "Loja (slug) → dropdown de usuários".

## Mudanças

**`src/routes/admin.login.tsx`**
- Remover o toggle "Por loja / Admin Menuzin" (modo único).
- Remover: campo de slug, `debouncedSlug`, `useQuery` de `listTenantLoginUsers`, dropdown de usuários e imports não utilizados (`Select*`, `useQuery`, `listTenantLoginUsers`).
- Voltar aos dois inputs simples: **E-mail** (`Input type="email"`) e **Senha** (`PasswordInput`).
- Manter: redirect pós-login já autenticado, submit via `supabase.auth.signInWithPassword`, link "Esqueci minha senha", painel esquerdo com gradiente.

**Sem outras mudanças**
- `listTenantLoginUsers` em `src/lib/account.functions.ts` permanece (não quebra nada; podemos remover em limpeza futura se desejado).
- Nenhuma mudança em rotas, auth-context, ou backend.

## Resultado
Tela de login volta ao formato clássico: e-mail + senha + "Esqueci minha senha". Funciona igual para lojistas e admin da plataforma — o `AuthProvider` já resolve o papel e o redirect faz o resto.
