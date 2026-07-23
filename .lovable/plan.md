## Escopo

Quatro ajustes independentes conforme anexos.

### 1. Nomenclatura de planos em `/platform/lojas` (anexo 1)
`src/routes/platform.lojas.tsx` (linhas 262–333) e `src/lib/platform.functions.ts` (linha 471) ainda listam `"max"` no Select e no schema Zod. O modelo atual só tem **Presença / Start / Pro** (`src/lib/plan-features.tsx`).

- Trocar as opções do `<Select>` para `presenca | start | pro` com rótulos "Presença", "Start", "Pro".
- Ajustar tipo do cast em `adminUpdateTenant` para `"presenca" | "start" | "pro"`.
- Atualizar o Zod enum de `adminUpdateTenant` em `platform.functions.ts` para os mesmos três slugs.
- Exibir o badge do plano em `platform.lojas.tsx` (linha 159) usando `PLAN_LABEL` em vez do slug cru.

### 2. Modal criar/editar loja com scroller (anexo 1)
O `DialogContent` de `EditTenantDialog` (e do dialog de nova loja em `platform.tenants.novo.tsx`, se aplicável) não limita altura — em viewports pequenos o formulário estoura.

- Aplicar `max-h-[90vh] flex flex-col` no `DialogContent`.
- Envolver o corpo do formulário num `<div className="overflow-y-auto -mx-6 px-6 flex-1">`, mantendo `DialogHeader` e `DialogFooter` fixos (mesmo padrão já usado em `admin.taxas-entrega.tsx` linha 332).

### 3. Agrupar bairros duplicados por faixa de CEP em `/admin/taxas-entrega` (anexo 2)
Hoje "Boa Esperança 1" e "Boa Esperança 2" aparecem como itens separados. O objetivo é consolidar visualmente entradas com o mesmo bairro (normalizado sem sufixo numérico/acento) na mesma cidade/UF, listando as faixas de CEP como sub-itens agregados — sem alterar schema nem dados.

- Criar helper local `normalizeNeighborhoodKey(name, city, uf)`: strip de acentos, lowercase, remoção de sufixo `\s+\d+$` (ex.: "Boa Esperança 1" → "boa esperanca|parnaiba|pi").
- Agrupar `list` por essa chave antes de renderizar (linha 286). Quando o grupo tiver 1 item, manter o card atual. Quando tiver 2+:
  - Card único com o nome base ("Boa Esperança") e badge "N faixas".
  - Cada faixa listada abaixo com seu próprio CEP range, taxa, mín. e ações (editar/excluir/toggle) individuais — nenhuma operação em lote nesta iteração.
  - Alerta discreto quando as taxas divergirem entre faixas do mesmo grupo ("Taxas diferentes cadastradas para este bairro").
- Toggle "Agrupar bairros duplicados" (default ligado) para permitir voltar à visão plana em caso de necessidade.

Sem migração de dados; a mudança é somente de apresentação/UX.

### 4. Bloqueio efetivo das funções por plano (anexo 3)
Já existem `PLAN_FEATURES`, `canUse`, `useTenantPlan`, `requirePlanAtLeast` e algumas quebras (checkout Presença → WhatsApp, limites de criação em `catalog-admin.functions`). Falta cobrir as áreas que hoje ficam acessíveis mesmo em Presença/Start.

Auditar e aplicar gates nestes pontos (frontend + servidor):

| Recurso | Plano mínimo | Frontend | Servidor |
|---|---|---|---|
| Painel de pedidos (`/admin/pedidos`, realtime, impressão) | Start | Bloquear rota com card "Disponível no Start" + CTA upgrade | `orders.functions` já rejeita criação em Presença — manter |
| Cupons (`/admin/cupons`) | Start | Idem | `coupons.functions` valida `requirePlanAtLeast(tenantId,"start")` em create/update |
| Taxas de entrega (`/admin/taxas-entrega`) | Start | Idem | `delivery-zones.functions` valida no upsert |
| Pagamento online / Mercado Pago (`/admin/configuracoes/pagamentos`) | Pro | Bloquear rota | `payments.functions` + `store_payment_settings` upsert com `requireProPlan` |
| Impressão automática / QZ / impressoras extras | Pro | Ocultar toggle "auto imprimir" e wizard QZ, mantendo impressão manual | `printer-settings.functions` rejeita habilitar auto sem Pro |
| Destaques no Guia (opt-in em `/admin/diretorio` marcando como destaque) | Pro | Toggle de destaque desabilitado com tooltip | `directory-admin.functions` valida |
| Avaliações agregadas / relatórios avançados | Pro | Gate na rota `/admin/relatorios` (bloquear métricas Pro-only) | `reports.functions` filtra métricas |
| Promoções recorrentes / promo modal | Start | Gate no `/admin/configuracoes/promocao` | `promo-modal.functions` valida |

Padrão a seguir para cada gate:

```tsx
// componente de rota
const { plan, atLeast } = useTenantPlan();
if (!atLeast("start")) return <PlanLockedCard required="start" current={plan} />;
```

```ts
// server function
await requirePlanAtLeast(tenantId, "start");
```

- Criar componente reutilizável `src/components/subscription/PlanLockedCard.tsx` com título, descrição, lista de features do plano alvo (`PLAN_FEATURES`) e botão "Fazer upgrade" → `/admin/assinatura`.
- Nas telas listadas, manter o `AdminLayout` e trocar apenas o conteúdo pelo `PlanLockedCard` quando o plano não atender ao mínimo.
- Não alterar RLS nem a estrutura das server functions — só somar `await requirePlanAtLeast(...)` no topo do handler correspondente.

### Detalhes técnicos

- Todas as edições ficam em código de rota / componentes / server functions existentes; nenhuma migração de banco.
- Nenhum novo pacote.
- `platform.functions.ts::adminUpdateTenant` já usa `supabaseAdmin` e não valida plano — só ajustar enum.
- Manter compatibilidade: tenants antigos com `plan="max"` no banco (se existirem) passam por `normalizePlan` que já cai em `"presenca"`; não haverá crash, mas ao editar o Select mostrará "Presença" — aceitável e corrige o dado ao salvar.
