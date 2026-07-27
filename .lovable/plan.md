## Plano

### 1. Badge de upgrade sempre sugere PRO quando plano Start estiver inativo
Arquivo: `src/routes/admin.assinatura.tsx`
- No card de comparação, quando `currentPlan === "presenca"` e o plano Start estiver inativo/oculto, o botão "Fazer upgrade" do card PRO deve aparecer com label **"Upgrade PRO"** (com ícone `Crown`).
- A lista `allPlans` já filtra por `active !== false`, então se Start estiver desativado ele nem aparece — garantir que o cálculo `isUpgrade` e o CTA do card PRO continuem funcionando corretamente nesse cenário (mostrar "Upgrade PRO" ao invés de apenas "Fazer upgrade" quando for o único upgrade disponível).

### 2. Modal "Loja configurada!" só aparece se ainda não há cardápio
Arquivo: `src/routes/admin.configuracoes.index.tsx`
- Buscar contagem de categorias/produtos do tenant via query existente (`getMyMenu` ou similar em `catalog-admin.functions.ts`).
- Em `saveMut.onSuccess` (linha 110-114), só chamar `setNextStepOpen(true)` quando `categories.length === 0 && products.length === 0`. Caso contrário, apenas mostrar o toast de sucesso.

### 3. Chips de categorias só quando houver produtos
Arquivo: `src/routes/$slug.tsx` (linhas 511-…)
- Envolver o bloco sticky de chips em uma condicional: renderizar apenas quando `products.length > 0`.
- Assim lojas sem produtos cadastrados não exibem uma barra sticky vazia.

### 4. Cards de planos — destaque do Presença com badge "Grátis"
Arquivo: `src/routes/admin.assinatura.tsx` (seção "Compare os planos", linhas 151-238)
- Ajustar a lógica visual dos cards:
  - **Presença**: badge verde "Grátis" no topo direito; borda/gradiente sutil para destacar como ponto de entrada.
  - **Pro**: manter destaque atual "Recomendado" com coroa.
  - Padronizar altura, espaçamento e ordem visual (Presença → Start → Pro), mantendo o card atual em destaque quando for o do usuário.
- Ajustar tipografia do preço (Grátis em verde para Presença), CTAs com largura uniforme, e listar até 6 features com espaçamento consistente.

### 5. Próxima etapa (não implementar agora)
- Registrar a persistência de pedidos de convidado (arquivo `menuzin-guest-order-persistence-prompt-2.md`) como próximo escopo em `.lovable/plan.md`, sem alterar código de backend ainda.

### Detalhes técnicos
- Item 2 requer nova `useQuery` em `admin.configuracoes.index.tsx` chamando o loader de menu já usado em `admin.categorias.tsx`/`admin.produtos.tsx` (verificar `catalog-admin.functions.ts` para função reutilizável).
- Item 4 usa apenas classes Tailwind existentes + tokens semânticos (`emerald-*` já aceito no projeto para status).
- Nenhuma migração de banco necessária.

---

## Próxima etapa (backlog)

Implementar persistência de pedidos de convidado conforme especificação em `user-uploads://menuzin-guest-order-persistence-prompt-2.md`:
- Tabelas `guest_customers` e `guest_magic_links` no Supabase
- Colunas `guest_customer_id` e `source` em `orders`
- Fluxo de recuperação cross-device via magic link entregue por WhatsApp
- Identidade soft por telefone (E.164), sem cadastro/senha
