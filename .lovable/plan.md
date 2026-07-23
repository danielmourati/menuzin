## Objetivo
Tornar o **tipo de negócio (business_types)** visível e editável em toda a plataforma, agrupar as lojas por esse tipo na lista do superadmin e garantir que, ao trocar o tipo para/de `pizzaria`, os fluxos de criação de categoria já reagem corretamente (o guard `isPizzaria` que decide o picker Pizza/Oferta do Dia já está pronto — só precisa consumir o campo atualizado).

## Escopo

### 1. `platform.functions.ts`
- `PlatformStoreRow` passa a expor `business_types: string[]`.
- `listPlatformStores`: adicionar `business_types` no `select` do tenants e propagar no map.
- `UpdateTenantInput` (admin): aceitar `business_types: z.array(z.enum(BUSINESS_TYPES)).optional()` e persistir junto do `patch`.

### 2. `src/lib/tenants.functions.ts`
- `UpdateTenantInput`: aceitar `business_types: z.array(z.enum(BUSINESS_TYPES)).max(5).optional()` para permitir que o admin da loja edite o próprio tipo.

### 3. Superadmin — `src/routes/platform.lojas.tsx`
- **Agrupar por category-kind (business_types)**:
  - Derivar grupos a partir de `stores`: para cada tipo em `business_types` classificar a loja; tenants sem tipo caem em "Sem categoria".
  - Renderizar cada grupo com header (`BUSINESS_TYPE_LABELS[type]` + contagem) e as cards atuais dentro. Manter contador total no topo.
  - Cards ganham `Badge` com o(s) tipo(s) ao lado de plano/status.
- **`EditTenantDialog`**: adicionar campo "Tipo de negócio" (multi-select simples via checkboxes ou combobox reaproveitando `BUSINESS_TYPES`/`BUSINESS_TYPE_LABELS`) entre o bloco cidade/UF e plano/status. Estado inicial vindo de `store.business_types`; enviar no `adminUpdateTenant`.

### 4. Admin — `src/routes/admin.configuracoes.index.tsx`
- Aba **Dados**: novo bloco "Tipo de negócio" (mesmo componente de multi-select da tela do superadmin) alimentado por `tenant.business_types`.
- Ampliar `FormState` com `business_types: BusinessType[]`, inicializar no `useEffect` e enviar em `updateMyTenant`.
- Após salvar, a `queryKey ["my-tenant"]` já é invalidada — `admin.categorias.tsx` e `admin.cardapio.novo.tsx` recomputam `isPizzaria` automaticamente e o picker Pizza/Oferta passa a aparecer/desaparecer sem código extra.

### 5. Componente compartilhado
- Criar `src/components/admin/BusinessTypesField.tsx` (grid de chips selecionáveis usando `BUSINESS_TYPES` / `BUSINESS_TYPE_LABELS`) para reuso em `platform.lojas` e `admin.configuracoes`. Props: `value`, `onChange`, `max?`.

## Fora de escopo
- Não mexer no wizard `/comece-agora` (já coleta o tipo).
- Sem mudanças em schema/RLS (colunas `business_types` já existem).
- Sem novo seeding automático de categorias ao editar o tipo depois da criação (só cria-se no cadastro inicial, comportamento atual).
