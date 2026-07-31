# Auditoria e consolidação de planos

## O que está acontecendo (verificado no banco)

Para a loja **Brazeiro Assados Gourmet**:

- `tenants.plan` = **pro** (o que o superadmin vê em /platform/lojas)
- a assinatura da loja aponta para o plano **Presença** (status ativa)

Como o plano efetivo usado no painel do lojista é lido primeiro da assinatura, o admin vê "Plano atual: Presença" e continua bloqueado. Os dois registros estão dessincronizados. Não há nenhum evento de troca de plano registrado para essa loja, então a divergência nasceu na criação da loja (a assinatura padrão "Presença" foi criada e a sincronização com o plano escolhido não surtiu efeito) — a rotina de sincronização existe mas está dentro de um bloco que engole erros silenciosamente.

Segundo problema: o plano **Start está desativado** em /platform/planos, mas as telas bloqueadas ainda dizem "Plano Start" (ex.: Dashboard: "Painel administrativo — Plano Start"), porque o rótulo do bloqueio é fixo no código.

## O que vou fazer

### 1. Uma única fonte da verdade do plano
- O plano efetivo passa a considerar a assinatura **e** `tenants.plan`, resolvendo divergência sempre pelo registro mais recente/consistente e **auto-corrigindo** o outro lado na hora da leitura (self-healing), em vez de deixar os dois brigando.
- Sincronização deixa de falhar em silêncio: na criação e na edição de loja o erro passa a ser propagado (a operação avisa em vez de terminar "ok" com plano errado).
- Sincronizar também quando o superadmin salva o mesmo plano (hoje um "re-salvar" não conserta nada, porque só sincroniza se o valor mudou) — isso dá ao superadmin uma forma manual de reparo.

### 2. Correção dos dados atuais
- Migração de reconciliação: para toda loja com divergência, alinhar a assinatura ao `tenants.plan` (caso do Brazeiro → Pro), ajustando também o valor da assinatura para o preço vigente do plano.

### 3. Rótulos coerentes com planos ativos
- Os avisos de bloqueio deixam de citar planos desativados. O texto passa a apontar para o menor plano **ativo** que libera o recurso (com Start desativado, tudo que exigia Start passa a exibir "Plano Pro").
- Mesmo tratamento no cartão de uso/upgrade e no /admin/assinatura.

### 4. Auditoria dos pontos de exibição
Revisar e padronizar plano/rótulo em: /platform/lojas (editar loja), /platform/assinaturas, /admin/assinatura, sidebar/Dashboard e todos os bloqueios (Pedidos, Relatórios, Cupons, Taxas de entrega, Pagamentos, Observações, Pop-up promocional).

## Detalhes técnicos

- `src/lib/plan-server.ts`: `getTenantPlan` com reconciliação (comparar `tenant_subscriptions.plan.slug` × `tenants.plan`, corrigir divergência e retornar o plano vigente); `syncSubscriptionFromTenantPlan` também atualiza `amount` pelo preço atual do plano.
- `src/lib/platform.functions.ts`: remover o `try/catch` silencioso em `adminCreateTenant`; em `adminUpdateTenant`, sincronizar sempre que `patch.plan` vier definido.
- `src/lib/plan-features.tsx`: novo helper que resolve "plano mínimo exigido" para o menor plano ativo (lista de planos vinda de `listPlans`), usado por `PlanGate`/`UpgradeNotice`.
- `src/components/subscription/PlanGate.tsx`: rótulo dinâmico em vez de `min === "start" ? "Start" : "Pro"`.
- Migração SQL de reconciliação única para as lojas divergentes.
