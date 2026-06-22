## Diagnóstico

Tenants atuais: `burgerprime` (hamburgueria), `vilaboemia` (espetaria) e `restauranteonego` (churrascaria). Comparando o que cada um tem:

| Recurso | burgerprime | vilaboemia | restauranteonego |
|---|---|---|---|
| hours_schedule | ✓ | ✓ | ✓ |
| logo / tema | ✓ | ✓ | ✓ |
| printer_settings | ✓ | ✓ | ✓ |
| tenant_printers (QZ) | ✓ | – | ✓ |
| store_payment_settings | ✓ | ✓ | ✓ |
| addon_groups | 2 | 8 | 2 |
| delivery_zones | 2 | – | – |
| cupons | 1 | – | – |
| prep_time / min_order / delivery_fee | preenchidos | preenchidos | parcial (delivery_fee=0) |
| accepts_delivery/takeout/dinein, open_mode, delivery_mode, pos_paper_width | configurado | configurado | configurado |

Hoje o `adminCreateTenant` (em `src/lib/platform.functions.ts`) só faz seed mínimo de categorias por business_type. Não cria `store_payment_settings`, nem `printer_settings`, nem garante `accepts_*`, `hours_schedule`, `pos_paper_width`, etc.

## Estratégia

Tenant de referência **por tipo de negócio** (escolha do usuário) com **merge não-destrutivo** (só preenche o que está faltando):

```text
business_types contém     →  template
─────────────────────────────────────────
hamburgueria, lanchonete,    burgerprime
pastelaria, food_truck,
marmitaria, padaria,
cafeteria, conveniencia
─────────────────────────────────────────
espetaria, churrascaria,     vilaboemia
bar, restaurante, sushi,
acaiteria, sorveteria,
pizzaria (fallback)
```

Regra de merge: cada campo / linha só é tocada quando o tenant alvo está vazio/nulo. Catálogo (categorias, produtos, addons existentes) **nunca** é sobrescrito; só completa o que falta.

## Backend

### 1. Novo módulo `src/lib/tenant-template.server.ts`
Helper server-only com `applyTenantTemplate(tenantId)`:

1. Carrega tenant alvo + referência (resolvida pelo business_types).
2. **Tabela `tenants` (UPDATE parcial — só campos nulos/zero/string vazia):**
   `prep_time`, `min_order`, `delivery_fee`, `pos_paper_width`, `open_mode`, `delivery_mode`, `accepts_delivery`, `accepts_takeout`, `accepts_dinein`, `hours_schedule`, `theme_from`, `theme_to`. `logo_url`, `name`, `whatsapp`, `description` nunca tocados.
3. **`store_payment_settings`**: se não existir linha para o tenant, clona a do tenant de referência (sem segredos de gateway — só métodos aceitos e flags).
4. **`printer_settings`**: idem; cria linha default se ausente.
5. **`addon_groups` + `addon_options` + `addon_group_targets`**: só cria grupos cujo `name` ainda não existe no alvo (case-insensitive). Targets só são copiados quando conseguem ser remapeados para uma categoria/produto existente do alvo (mesmo nome).
6. **`categories`**: completa apenas as categorias `kind = standard|pizza` do template que faltam por nome (reaproveita `seedCategoriesForBusinessTypes` já existente).
7. **Não copia**: `products`, `coupons`, `delivery_zones`, `tenant_printers` (são dados específicos do dono / impressora física).

Retorna um relatório `{ updated: string[], created: string[], skipped: string[] }`.

### 2. Server functions em `src/lib/platform.functions.ts`
- `adminApplyTenantTemplate({ tenant_id })` — chama o helper. Requer `requireSupabaseAuth` + `ensurePlatformAdmin`.
- `adminApplyTemplateToAll()` — itera todos os tenants existentes e aplica o merge. Mesmo gate.
- `adminCreateTenant` — ao final do fluxo de criação, chamar `applyTenantTemplate(tenant.id)` automaticamente (depois do `seedCategoriesForBusinessTypes`, antes do return). Assim **todo novo tenant** nasce no padrão.

## Frontend

### 3. `src/routes/platform.lojas.tsx`
- Botão "Aplicar template padrão" em cada linha da tabela de lojas → chama `adminApplyTenantTemplate` e mostra toast com o relatório.
- Botão no topo "Padronizar todas" → chama `adminApplyTemplateToAll`, com confirmação.

Nenhuma mudança em `platform.tenants.novo.tsx` — o merge automático no backend basta.

## Execução manual (one-shot)

Após o deploy, rodar `adminApplyTemplateToAll` uma vez pelo botão para já alinhar `restauranteonego` (vai herdar de `vilaboemia` por ser churrascaria).

## Arquivos

- `src/lib/tenant-template.server.ts` (novo)
- `src/lib/platform.functions.ts` (edit: 2 novas server fns + chamada no create)
- `src/routes/platform.lojas.tsx` (edit: botões)

Sem migrations; sem mudança de schema.
