## Modal promocional da loja

Modal de cantos arredondados, com imagem full, configurado pelo admin do tenant, exibido na abertura da storefront uma vez por sessão e com CTA "EU QUERO!" que abre o `ProductModal` do produto vinculado.

### 1. Banco de dados (migration)

Nova tabela `public.promo_modals` (uma campanha ativa por tenant):

```
id uuid PK
tenant_id uuid FK tenants(id) ON DELETE CASCADE
enabled boolean default false
image_url text not null
cta_label text default 'EU QUERO!'
product_id uuid FK products(id) ON DELETE SET NULL
schedule_mode text check in ('window','recurring')
-- janela única:
starts_at timestamptz null
ends_at timestamptz null
-- recorrência (TZ America/Sao_Paulo):
weekdays smallint[] null   -- 0=Dom..6=Sáb
time_start time null
time_end time null
created_at, updated_at timestamptz
unique (tenant_id)
```

GRANTs: `SELECT` para `anon` + `authenticated` (leitura pública para storefront); `INSERT/UPDATE/DELETE` para `authenticated` via RLS por `tenant_id` (admin/owner do tenant); `ALL` para `service_role`. RLS habilitada. Trigger `set_updated_at`. Validação por trigger (em vez de CHECK) garantindo coerência (`window` exige datas; `recurring` exige weekdays + horas).

### 2. Backend (server functions)

`src/lib/promo-modal.functions.ts`:
- `getActivePromoModal({ tenantId })` — público, usa client publishable; retorna apenas se `enabled`, dentro da janela/recorrência (avaliado server-side em America/Sao_Paulo) e com produto válido/ativo. Devolve `{ id, imageUrl, ctaLabel, product: { id, slug, name } }` ou `null`.
- `getPromoModalAdmin()` / `upsertPromoModal(input)` / `deletePromoModal()` — protegidos por `requireSupabaseAuth` + checagem `has_tenant_role` (admin/owner).

### 3. Admin UI

Nova aba em `src/routes/admin.configuracoes.index.tsx` (ou novo arquivo `admin.configuracoes.promocao.tsx`): "Modal promocional".

Campos:
- Toggle "Ativar modal"
- Upload de imagem (bucket `tenant-assets`, pasta `promo-modals/<tenant>/`)
- Select de produto (lista produtos ativos do tenant)
- Input do texto do CTA (default "EU QUERO!")
- Radio "Tipo de agendamento": Janela única | Recorrente
  - Janela: DatePicker início + fim (com hora)
  - Recorrente: checkboxes dias da semana + dois TimePicker (início/fim)
- Botão Salvar; preview do modal ao lado

### 4. Storefront

`src/components/storefront/PromoModal.tsx`:
- Dialog do shadcn com `rounded-2xl`, imagem `object-cover` ocupando o card, botão "EU QUERO!" sobreposto na base com gradiente.
- Botão fechar (X) no canto, sem sobrepor o CTA.

Em `src/routes/loja.$slug.tsx`:
- Após carregar tenant e produtos, chamar `getActivePromoModal({ tenantId })` via `useQuery`.
- Exibir 1x por sessão: `sessionStorage.getItem(`promo_seen_${id}`)`.
- CTA: fecha modal, marca sessão, abre `ProductModal` existente com o produto carregado (reutiliza o mesmo handler de clique do `ProductCard`).
- Se produto inativo/removido: não exibe modal.

### 5. Arquivos afetados

- migration nova (tabela + grants + RLS + trigger)
- `src/lib/promo-modal.functions.ts` (novo)
- `src/components/admin/PromoModalSettings.tsx` (novo)
- `src/routes/admin.configuracoes.index.tsx` (adicionar seção/aba) ou nova rota
- `src/components/storefront/PromoModal.tsx` (novo)
- `src/routes/loja.$slug.tsx` (montar PromoModal + integração com ProductModal)

Sem mudanças em fluxo de pedidos/pagamentos. Frequência: 1 vez por sessão.
