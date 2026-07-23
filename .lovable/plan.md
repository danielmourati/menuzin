
## Diagnóstico (confirmado por query)

- **Pizza D'Primeira** não tem linha em `tenant_subscriptions` (por isso aparece como "SEM ASSINATURA" e sem ações). A listagem em `/platform/assinaturas` gera uma linha "virtual" (`id = "virtual-..."`), e a coluna Ações esconde os botões justamente porque `isVirtual === true`.
- **Comparativos**: Burger Prime (Pro, ativa), Churrascaria Vila Boêmia (Presença, ativa) e Restaurante O Nêgo (Presença, ativa) têm todos linha real em `tenant_subscriptions`.
- **Bônus observado (fora do escopo)**: `Restaurante O Nêgo` tem `tenants.plan = 'pro'` mas assinatura Presença — divergência real de plano; posso corrigir num passo separado se você confirmar.

## Correção proposta

### 1. Backfill + trigger no banco (migração)
- **Backfill**: para todo tenant sem `tenant_subscriptions`, criar uma linha:
  - `plan_id` = plano `presenca`
  - `status` = `ativa`, `billing_period` = `mensal`, `amount` = 0
  - `due_date` = `null`, `grace_days` = 0, `auto_block_enabled` = false
  - `notes` = "Criado automaticamente (plano Presença)"
- **Trigger `AFTER INSERT` em `public.tenants`**: cria automaticamente a mesma linha para novos tenants, garantindo que nunca mais apareça "sem assinatura".

Isso resolve o caso de Pizza D'Primeira criando uma assinatura real Presença/ativa, idêntica em forma às demais.

### 2. Remover fallback "virtual" na listagem
- Em `src/lib/subscriptions.functions.ts` (`adminListSubscriptions`): remover o bloco que sintetiza linhas `virtual-*`. Como o trigger garante 1 linha por tenant, a lista fica consistente.

### 3. Habilitar Ações uniformes na tabela
- Em `src/routes/platform.assinaturas.tsx`:
  - Remover a condicional `!isVirtual` — botões **Editar** e **Histórico** aparecem para todas as linhas.
  - Remover o chip "SEM ASSINATURA" (não haverá mais linhas virtuais).
  - Manter o label "Ativa (grátis)" para plano Presença.

## Detalhes técnicos

**SQL (esboço da migração):**
```sql
INSERT INTO public.tenant_subscriptions (tenant_id, plan_id, status, billing_period, amount, notes)
SELECT t.id, p.id, 'ativa', 'mensal', 0, 'Criado automaticamente (plano Presença)'
FROM public.tenants t
CROSS JOIN LATERAL (SELECT id FROM public.plans WHERE slug='presenca' LIMIT 1) p
WHERE NOT EXISTS (SELECT 1 FROM public.tenant_subscriptions s WHERE s.tenant_id = t.id);

CREATE OR REPLACE FUNCTION public.create_default_subscription_for_tenant() ...
CREATE TRIGGER trg_tenant_default_subscription AFTER INSERT ON public.tenants ...
```

**Arquivos afetados:**
- Migração nova (backfill + função + trigger)
- `src/lib/subscriptions.functions.ts` (remover bloco virtual)
- `src/routes/platform.assinaturas.tsx` (remover `isVirtual` gate nas Ações e o chip)

## Confirmar antes de prosseguir
Corrijo também o mismatch de `Restaurante O Nêgo` (tenant.plan='pro' vs assinatura Presença) no mesmo passo? Se sim, digo qual é a fonte-de-verdade (assinatura vence).
