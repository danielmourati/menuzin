## Escopo desta rodada

Seis frentes independentes, todas frontend/admin + reforço de gating server-side já existente. Sem novas migrações estruturais além de um pequeno backfill de assinaturas.

---

### 1. Reforçar degradação Presença + rota WhatsApp

Auditar todos os pontos que oferecem gateway/checkout online e garantir bloqueio quando `plan === 'presenca'`:

- `admin.configuracoes.pagamentos.tsx` → renderizar `UpgradeNotice` (Pro) no topo e desabilitar formulários de MP/PIX/cartão para Presença.
- `admin.pedidos.tsx` → bloquear com `UpgradeNotice` (Start+) e explicar que Presença opera 100% via WhatsApp.
- `admin.cupons.tsx`, `admin.taxas-entrega.tsx`, `admin.avaliacoes.tsx`, `admin.relatorios.tsx` → conferir gates existentes; adicionar onde faltar.
- `CartDrawer` (storefront) → já redireciona para WhatsApp em Presença; adicionar mesmo tratamento em `ProductModal` (botão "Adicionar" → em Presença mostra tooltip "Peça direto pelo WhatsApp" e faz `wa.me` com o item único) para lojas sem cardápio estruturado.
- Confirmar que `createOrder`, `createPayment` e `createTransparentPayment` rejeitam Presença no servidor (`orders.functions.ts` já faz; validar `payments.functions.ts`).

### 2. Dropdown de usuários no login do tenant

Substituir o input de e-mail em `admin.login.tsx` por um `<Select>` listando **usuários vinculados àquele tenant** (admin + atendentes).

- Nova server fn pública `listTenantLoginUsers({ slug })` em `src/lib/account.functions.ts`:
  - Resolve `tenant_id` pelo slug (via `supabaseAdmin`, sem exigir sessão).
  - Retorna `[{ email, full_name, role }]` de `profiles JOIN user_roles` filtrado por `tenant_id`.
  - **Sensibilidade**: expõe e-mails de funcionários; mitigar exigindo que o slug exista e limitando a 20 resultados. Documentar como aceitável (é intra-loja).
- UI: dropdown com nome + papel (ex.: "Daniel — Admin"); campo senha vazio; `autocomplete="new-password"` + `readOnly` inicial removido no primeiro focus para impedir preenchimento automático do navegador.
- Fallback: link "usar outro e-mail" que retorna ao input livre.
- Aplica-se apenas a `/admin/login` (subdomínio/rota do tenant). `/platform` continua com input.

### 3. E-mail de recuperação de senha com identidade Menuzin

Fluxo padrão de auth-emails:

1. `email_domain--check_email_domain_status`.
2. Se não houver domínio → mostrar diálogo `<presentation-open-email-setup>` e parar até o usuário concluir.
3. Se houver → `email_domain--scaffold_auth_email_templates`.
4. Aplicar identidade Menuzin (cores de `src/styles.css`, logo `menuzin-logo.png` via asset URL, tipografia) aos 6 templates gerados, com foco em `recovery.tsx`. Body branco preservado.
5. Copy PT-BR com tom da marca.

### 4. Todas as lojas em `/platform/assinaturas`

Ajustar `adminListSubscriptions` (em `subscriptions.functions.ts`) para retornar `LEFT JOIN` de `tenants` com `tenant_subscriptions`:

- Tenants sem assinatura aparecem com `status = 'sem_assinatura'`, `plan = tenants.plan` (geralmente "presenca").
- UI de `platform.assinaturas.tsx`: nova coluna/badge "Sem assinatura registrada" e ação "Criar assinatura" que abre o dialog já existente pré-preenchido.
- Sem backfill automático — mantém honesto o estado atual e evita mascarar Presenças reais.

### 5. Sidebar admin expandido por padrão

Em `AdminLayout.tsx`, alterar o estado inicial do collapse para `false` (expandido) em desktop. Se houver persistência em `localStorage`, ajustar chave default. Mobile continua com drawer.

### 6. Wizard de cadastro de cardápio (fluxo guiado)

Nova rota `admin.cardapio.novo.tsx` com stepper linear:

```text
Passo 1 — Categoria     (obrigatória; cria 1+ antes de avançar)
Passo 2 — Produto        (form simplificado; lista categorias criadas)
Passo 3 — Adicional (opcional; pode pular)
Passo 4 — Concluído      (CTAs: ver cardápio, adicionar outro produto, ir ao painel)
```

- Usa `saveCategory`, `saveProduct`, `saveAddonGroup` já existentes (respeitam limites do plano).
- Componentes reduzidos (nome, preço, imagem, descrição) — configurações avançadas ficam em `/admin/produtos`.
- Bloqueio contextual permanente em `/admin/produtos`: se `categories.length === 0`, mostra empty-state "Crie uma categoria primeiro" com botão que abre o passo 1 do wizard inline (modal) — impede o form de produto de renderizar.
- Card no dashboard "Cadastro rápido do cardápio" com link para o wizard enquanto `products.count === 0`.

### 7. Ordem de execução sugerida

1. Sidebar expandido (trivial, sem risco).
2. LEFT JOIN em `/platform/assinaturas`.
3. Reforço de gates Presença nas rotas admin + `ProductModal`.
4. Dropdown de usuários no `/admin/login` (nova server fn pública).
5. Wizard de cardápio + bloqueio contextual em `/admin/produtos`.
6. Auth emails Menuzin (depende de domínio configurado — pode gerar diálogo de setup).

---

### Detalhes técnicos

- **Server fn pública `listTenantLoginUsers`**: usa `supabaseAdmin` dentro do handler (via `await import`), sem `requireSupabaseAuth`. Valida `slug` com zod, aplica `LIMIT 20`.
- **Assinaturas LEFT JOIN**: implementar em `subscriptions.functions.ts` com `supabaseAdmin` (tela é `platform_admin`), retornando união `tenants` ↔ `tenant_subscriptions`.
- **Wizard**: `useState` local + `useMutation` por passo; não persiste rascunho em DB (progressivo, cada save é definitivo).
- **Templates de auth**: seguir `authentication-emails-guide` — sem `SEND_EMAIL_HOOK_SECRET`, sem provider externo.
- **Sem alterações de esquema** — apenas ajustes de UI, gates, uma server fn nova e templates.
