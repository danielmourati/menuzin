## Plano

Três ajustes condicionando recursos de pizza ao tipo de negócio "pizzaria" do tenant, mais remoção do clone de catálogo.

### 1. Modal "Nova categoria" — Pizza só para pizzarias
**Arquivo:** `src/routes/admin.categorias.tsx`
- Adicionar `useQuery` chamando `getMyTenant()` para ler `tenant.business_types`.
- `const isPizzaria = (tenant?.business_types ?? []).includes("pizzaria")`.
- Renderizar os botões "Pizza" e "Oferta do Dia" (oferta também é fluxo de pizza) somente quando `isPizzaria === true`. Para não-pizzaria, apenas "Itens principais" aparece.

### 2. Modal "Novo produto" — aba Tamanhos só para pizzarias
**Arquivo:** `src/routes/admin.produtos.tsx`
- Mesma query `getMyTenant()` para obter `isPizzaria`.
- A aba "Tamanhos" (`TabsTrigger value="tamanhos"`) e o select de categorias-pizza já são contextuais à categoria; o toggle/aba de tamanho será renderizado apenas quando `isPizzaria`. Em lojas não-pizzaria o `<Tabs>` colapsa para apenas "Geral" (sem TabsList quando só há uma aba).
- O bloco de seleção de categoria de pizza no select também ocultado quando não-pizzaria (já fica vazio naturalmente, mas remover o cabeçalho "🍕 Pizza").

### 3. Remover clone de catálogo na criação de tenant
**Arquivo:** `src/routes/platform.tenants.novo.tsx`
- Remover o estado `cloneBurger` e o bloco do `Switch` "Clonar catálogo do Burger Prime" (linhas ~34 e ~235-243).
- Enviar `clone_from_slug: null` fixo no payload (ou remover o campo se opcional no validator de `createTenant`).

### Observações
- Nenhuma mudança de schema/migração.
- Backend `seedCategoriesForBusinessTypes` continua criando a categoria "Pizza" automaticamente para tenants pizzaria — comportamento mantido.
- `getMyTenant` já é usado em `AdminLayout`; reaproveitamos a mesma queryKey para cache compartilhado.
