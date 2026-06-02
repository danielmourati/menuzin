# Plano — evolução multi-tenant Menuzin

Pacote grande (12 itens). Vou agrupar em 7 fases entregáveis. Cada fase tem migração + serverFns + UI. Nada é destrutivo até o usuário aprovar.

---

## Fase 1 — Admin global da plataforma (`dmouraphb@gmail.com`)

**Banco (migração):**
- Inserir `user_roles(role='platform_admin')` para o usuário cujo `auth.users.email = 'dmouraphb@gmail.com'` (idempotente; cria se já houver auth user, senão cria via trigger no primeiro signup).
- Trigger `on_auth_user_created`: se `new.email = 'dmouraphb@gmail.com'`, inserir `platform_admin` em `user_roles` automaticamente.

**Rotas/UI:**
- Layout `/platform/*` separado do `/admin/*` (já existe parcialmente em `platform.dashboard.tsx`, `platform.lojas.tsx`, `platform.tenants.novo.tsx`). Criar guard `_platform.tsx` (pathless) usando `is_platform_admin()`.
- Novas telas:
  - `/platform/tenants` (lista + busca, já existe parcial em `platform.lojas`)
  - `/platform/tenants/$id` (editar dados de qualquer tenant)
  - `/platform/tenants/$id/impersonar` (define `tenant_id` ativo na sessão de admin → libera ver/editar dados daquele tenant via RLS `is_platform_admin()`, que já cobre)
  - Botão "Entrar como" em cada linha da lista.
- ServerFns novas: `adminUpdateTenant`, `adminDeleteTenant` (cascata), `adminListTenants` (já temos `listPlatformStores`).

---

## Fase 2 — Tenant modelo "Burger Prime" + limpeza

**Banco (migração):**
- Garantir que existe um tenant `slug='burgerprime'` com nome `Burger Prime` (criar se não existir, com categorias/produtos padrão).
- `DELETE` em cascata de todos os demais tenants e dependências (`order_items`, `order_status_history`, `orders`, `product_addons`, `products`, `categories`, `store_payment_settings`, `user_roles.tenant_id`). Apenas Burger Prime sobrevive.

**ServerFn:**
- `adminCreateTenant` evolui para aceitar `clone_from_tenant_id` (default = Burger Prime): copia `categories`, `products`, `product_addons`, `store_payment_settings` (sem credenciais MP) e configurações visuais (`theme_*`, `hours`, etc).

---

## Fase 3 — Slug sem `/loja`

**Roteamento:**
- Renomear `src/routes/loja.$slug.tsx` → `src/routes/$slug.tsx` (idem `acompanhar` e `pedido-confirmado`).
- Atualizar todos os `<Link to="/loja/$slug">` para `/$slug`.
- Adicionar lista de slugs reservados (`admin`, `platform`, `api`, `login`, `assets`, `loja`) — validação no `isSlugAvailable` e `adminCreateTenant`.
- Manter `/loja/$slug` como redirect 301 para `/$slug` (1 turno de compatibilidade).

---

## Fase 4 — Catálogo avançado (produtos, pizzas, complementos)

**Banco (migração nova — grande):**

```
ALTER TABLE products
  ADD COLUMN type text NOT NULL DEFAULT 'standard',   -- 'standard' | 'pizza'
  ADD COLUMN max_flavors int,                          -- só p/ pizzas
  ADD COLUMN allow_observations boolean DEFAULT true;

CREATE TABLE product_sizes (
  id uuid PK, product_id uuid FK, name text, price numeric, sort_order int
);

CREATE TABLE product_flavors (
  id uuid PK, product_id uuid FK,                      -- pizza-pai
  name text, description text, price_delta numeric DEFAULT 0,
  available boolean DEFAULT true, sort_order int
);

CREATE TABLE addon_groups (
  id uuid PK, tenant_id uuid, name text,
  min_select int DEFAULT 0, max_select int DEFAULT 1,
  required boolean DEFAULT false, sort_order int
);

CREATE TABLE addon_options (
  id uuid PK, group_id uuid FK, name text,
  price numeric DEFAULT 0, active boolean DEFAULT true, sort_order int
);

-- vínculo grupo ↔ categoria OU grupo ↔ produto
CREATE TABLE addon_group_targets (
  id uuid PK, group_id uuid FK,
  category_id uuid NULL, product_id uuid NULL,
  CHECK ((category_id IS NULL) <> (product_id IS NULL))
);
```

GRANTs + RLS (mesmo padrão das tabelas atuais: leitura pública do ativo, escrita por staff do tenant).

`product_addons` antigo (lista simples por produto) é mantido por compatibilidade, mas as telas novas usam `addon_groups`/`addon_options`.

**UI admin (`/admin/produtos`):**
- Modal de produto com abas: **Geral** | **Imagem** | **Tamanhos** | **Sabores** (visível se `type='pizza'`) | **Grupos de complementos**.
- Toggle "Tipo: Padrão / Pizza".
- Para pizza: `max_flavors` (1/2/3), lista de sabores com `price_delta`.
- Grupos de complementos com `min/max/required`.

**Nova tela `/admin/complementos`:**
- CRUD de `addon_groups` + `addon_options`.
- Vincular grupo a uma ou mais **categorias** (aplica a todos os produtos da categoria) ou a **produtos** específicos.

**Storefront (`ProductModal`):**
- Suportar seleção de tamanho, múltiplos sabores (limite `max_flavors`), grupos obrigatórios validados antes do "Adicionar".
- Cálculo de preço: `tamanho.price + max(sabor.price_delta)` (regra "maior preço entre sabores", padrão do mercado) + soma de complementos × qty.
- Bloqueia botão "Adicionar" se algum grupo `required` ou pizza sem N sabores.

---

## Fase 5 — Upload de imagem + logo do tenant

**Storage (migração):**
- Bucket `tenant-assets` (público), com policies: leitura pública; upload/update/delete apenas por staff do tenant (path `{tenant_id}/...`).

**UI:**
- Campo de imagem do produto: dois modos (Upload / URL), em tabs ou radio.
- Em `/admin/aparencia`: remover seção de banner; adicionar uploader de logo (`tenants.logo_url`).
- Storefront (`loja/$slug` → `$slug`): mostrar `logo_url` no topo no lugar do banner.

---

## Fase 6 — Impressão POS 55/80mm

**Banco:**
- `ALTER TABLE tenants ADD COLUMN pos_paper_width text NOT NULL DEFAULT '80mm';` (`'55mm'|'80mm'`).

**UI:**
- `/admin/configuracoes` → seletor de largura do papel.
- `PrintableOrder.tsx`: ler largura do tenant; aplicar CSS `@page { size: 55mm auto }` / `80mm auto`, fontes menores e layout vertical para 55mm.
- Conteúdo do cupom: logo textual + número + data/hora + cliente + telefone + endereço (se entrega) + modo + itens (com sabores/complementos/obs) + taxa + pagamento + total + status.

---

## Fase 7 — Som `alert.mp3` + alerta visual

- Subir `alert.mp3` para `src/assets/alert.mp3` (via Lovable Assets se preferir, mas como é áudio pequeno e usado direto, ficará em `public/sounds/alert.mp3` para evitar bundler issues com mp3).
- `useOrdersRealtime` / `OrdersRealtimeListener`: instanciar `new Audio('/sounds/alert.mp3')` (pré-carregado) e tocar `audio.play()` em novo pedido, junto com o toast atual.
- Tratar política de autoplay: tocar apenas após primeira interação (já é o caso pois admin está logado e interagindo).
- Adicionar toggle "Som de novos pedidos" em `useNotificationPrefs`.

---

## Detalhes técnicos

- **RLS:** todas as novas tabelas seguem o padrão atual — `tenant_id` direto ou via join, policies usando `has_tenant_role` / `is_platform_admin`. GRANT a `authenticated` e `service_role`; `anon` apenas para leitura pública de catálogo (produtos/categorias/grupos ativos).
- **Migração destrutiva (Fase 2)** será apresentada em uma migração isolada, com a descrição deixando explícito que apaga todos os tenants exceto Burger Prime — usuário aprova antes de rodar.
- **Sem novas dependências** no front. Sem novos secrets.
- **Compatibilidade `/loja/$slug`:** mantida por 1 versão via redirect, depois removida.

---

## Perguntas antes de executar

1. **Regra de preço da pizza com múltiplos sabores**: usar **maior preço entre os sabores** (padrão de mercado) ou **média**? Eu sugeriria "maior preço".
2. **Burger Prime atual**: posso usar o tenant existente com slug parecido, ou devo recriá-lo do zero com catálogo demo (categorias: Hambúrgueres, Pizzas, Bebidas, Sobremesas; ~6 produtos)?
3. **Fase 2 (destrutiva)**: confirma que posso apagar TODOS os demais tenants e seus pedidos do banco? (Backup não é restaurável depois.)
4. **Ordem de execução**: posso fazer tudo em sequência num único ciclo, ou prefere aprovar fase a fase?

Posso assumir defaults (1: maior preço; 2: recriar Burger Prime se não existir, caso contrário usar o atual; 3: sim, apagar; 4: tudo em sequência) e seguir, caso prefira não responder agora.
