## Correções pontuais

### 1. Corrigir erro de cadastro (enum `tenant_status`)
- Em `src/lib/signup.functions.ts`: trocar `status: "ativo"` por `status: "ativa"` (valores válidos do enum: `ativa | teste | suspensa`).

### 2. Modal "Criar meu cardápio grátis" — scroller + viewport
- Em `src/components/landing/QuickSignupModal.tsx`: ajustar `DialogContent` para respeitar a altura da viewport e permitir rolagem interna:
  - Adicionar `max-h-[90vh] overflow-hidden flex flex-col p-0`.
  - Mover o `DialogHeader` para topo fixo com padding.
  - Envolver o formulário em `<div className="overflow-y-auto px-6 pb-6">` para rolagem.
  - Manter o botão de submit dentro do scroller (evita sumir em telas baixas) com margem superior.

### 3. Remover/substituir ícones `Sparkles`
Substituir por ícones semanticamente melhores (mantendo `lucide-react`):
- `src/routes/comece-agora.tsx` → usar `Rocket` (hero/CTA).
- `src/components/landing/QuickSignupModal.tsx` → usar `Store`.
- `src/routes/admin.assinatura.tsx` → usar `Crown`.
- `src/routes/admin.diretorio.tsx` → usar `Star`.
- `src/routes/admin.dashboard.tsx` → usar `Rocket`.
- `src/routes/admin.configuracoes.index.tsx` → usar `PartyPopper`.
- `src/routes/$slug.tsx` → usar `Star`.
- `src/components/admin/PlanUsageCard.tsx` → usar `Crown`.
- `src/lib/plan-features.tsx` → usar `Crown`.
Remover imports órfãos de `Sparkles` em cada arquivo.

### Arquivos afetados
- EDITAR: `src/lib/signup.functions.ts`
- EDITAR: `src/components/landing/QuickSignupModal.tsx`
- EDITAR: `src/routes/comece-agora.tsx`
- EDITAR: `src/routes/admin.assinatura.tsx`
- EDITAR: `src/routes/admin.diretorio.tsx`
- EDITAR: `src/routes/admin.dashboard.tsx`
- EDITAR: `src/routes/admin.configuracoes.index.tsx`
- EDITAR: `src/routes/$slug.tsx`
- EDITAR: `src/components/admin/PlanUsageCard.tsx`
- EDITAR: `src/lib/plan-features.tsx`
