# Planos de destaque: uma única fonte da verdade

## O que está acontecendo (verificado)

A tabela de planos de destaque **não existe no banco** (existem apenas `guia_categories`, `guia_promo_requests`, `guia_sections`, `guia_slots`).

Por isso:

- Em `/platform/guia/planos`, o superadmin vê e edita uma lista mantida **na memória do servidor**. Cada criação/edição/exclusão é perdida quando o servidor reinicia e não é compartilhada entre instâncias.
- No painel do lojista (`/admin/diretorio` → "Solicitar destaque"), quando a lista não chega, a tela cai numa **tabela de preços fixa no código**. Resultado: o lojista vê pacotes e preços que não correspondem ao que o superadmin configurou.

## O que vou fazer

### 1. Persistir os planos de destaque no banco
Criar a tabela de planos de destaque com: nome, tipo de destaque (hero, destaque de produto, loja em alta, banner, coleção, oferta relâmpago), duração em dias, preço, descrição, ativo e ordem.

Acesso: leitura liberada para lojistas autenticados (apenas planos ativos) e gestão completa apenas para o superadmin da plataforma. Os 18 pacotes atuais entram como dados iniciais na mesma migração, para nada sumir da tela.

### 2. Ligar as duas telas na mesma fonte
- `/platform/guia/planos` passa a ler e gravar direto no banco — sem fallback em memória. Se algo falhar, aparece erro em vez de "salvo" mentiroso.
- O modal "Solicitar destaque" do lojista passa a listar **somente** os planos ativos vindos do banco, com os preços configurados pelo superadmin.
- Se um tipo de destaque não tiver nenhum plano ativo, ele deixa de aparecer no seletor do lojista (em vez de mostrar preços inventados).

### 3. Validação do valor no pedido
Na criação da solicitação de destaque, o valor cobrado passa a ser recalculado no servidor a partir do plano escolhido, ignorando o valor enviado pelo navegador.

## Detalhes técnicos

- Migração: `create table public.guia_highlight_plans` (+ GRANTs para `authenticated`/`service_role`, RLS: SELECT de ativos para autenticados, ALL para `is_platform_admin()`), trigger `set_updated_at`, e `INSERT` literal dos 18 pacotes de `DEFAULT_HIGHLIGHT_PLANS`.
- `src/lib/guia-admin.functions.ts`: remover `inMemoryHighlightPlans` e os `try/catch` que engolem erro em `adminListHighlightPlans`, `adminUpsertHighlightPlan`, `adminDeleteHighlightPlan`, `listPublicHighlightPlans`; usar os tipos gerados após a migração (sem `as any`).
- `createPromoRequest`: buscar o plano por id/tipo+duração e usar `plan.price` como `amount`.
- `src/routes/admin.diretorio.tsx`: remover o fallback `SLOT_KIND_PRICES`; derivar os tipos de destaque disponíveis dos planos ativos.
- `src/lib/guia-types.ts`: remover `SLOT_KIND_PRICES` e `DEFAULT_HIGHLIGHT_PLANS` do runtime (defaults passam a viver na migração).
