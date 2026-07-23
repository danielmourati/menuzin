## 1. Corrigir erro do plano Presença no checkout

**Bug:** `CartDrawer` já detecta `isPresencaOnly` e mostra "Pedir pelo WhatsApp" na tela do carrinho, **mas** a função `openWhatsappPresenca` (linhas 195–203) usa um texto mínimo (só itens + subtotal). Além disso, se o cliente conseguir avançar por outro caminho, `ensureOrder → createOrder` continua sendo chamado e o backend responde `Esta loja recebe pedidos apenas pelo WhatsApp…`, causando o erro do console.

**Correção em `src/components/storefront/CartDrawer.tsx`:**
- Reescrever `buildWhatsappOrderMessage` usando o helper canônico `buildWhatsAppMessage` de `src/lib/whatsapp.ts` (já monta pedido completo: nº, cliente, modalidade, itens, endereço/mesa, pagamento, taxa, total, observação). O número do pedido usará `Date.now() % 100000` (não há registro no banco).
- Rota alternativa "Presença": em vez de saltar direto do carrinho ao WhatsApp com dados vazios, transformar o fluxo em wizard reduzido — reaproveitar os passos existentes `mode → mode-address/mode-table → customer → review`, e no `review` substituir o botão "Confirmar" por **"Enviar pedido pelo WhatsApp"** que chama a nova versão de `openWhatsappPresenca(orderInput)` sem tocar `createOrder`.
- Guard extra: em `ensureOrder`, se `isPresencaOnly` for true, abortar cedo com `openWhatsappPresenca()` e `return` — nunca deixa cair no backend.

## 2. Bloquear funcionalidades não contempladas no plano Presença

**Impressoras — `src/routes/admin.configuracoes.impressora.tsx`:**
Envolver o `PrinterSettingsPage` com `PlanGate min="pro" featureLabel="Configuração de impressora"`. Hoje só há gate para `multiplePrinters` no `ExtraPrintersManager`; a página principal fica acessível para Presença/Start. `kitchenPrinter`, `autoPrint` e `multiplePrinters` só existem no Pro.

**Pagamentos online — `src/routes/admin.configuracoes.pagamentos.tsx`:**
Envolver `AdminPaymentSettingsPage` com `PlanGate min="start" featureLabel="Configurações de pagamento"` (bloqueia Presença 100%). Dentro da página, manter o bloco atual `!canMP → UpgradeNotice` para o Mercado Pago no Start (só Pro tem `mercadoPago`).

**Cardápio avançado (Presença tem catálogo 20/4):**
Já há limites no backend (`getTenantPlanLimits`) — nenhuma mudança adicional aqui.

## 3. Auditoria de gates por plano

Rodar a matriz `PLAN_FEATURES` contra as rotas do sidebar e aplicar `PlanGate` onde faltar. Estado atual e ação:

| Rota | Feature exigida | Presença | Start | Pro | Ação |
|---|---|---|---|---|---|
| `/admin/dashboard` | `dashboard` | ❌ | ✅ | ✅ | `PlanGate min="start"` |
| `/admin/pedidos` | `ordersPanel` | ❌ | ✅ | ✅ | `PlanGate min="start"` |
| `/admin/relatorios` | `basicReports` | ❌ | ✅ | ✅ | `PlanGate min="start"` |
| `/admin/avaliacoes` | `customerCrm` | ❌ | ✅ | ✅ | `PlanGate min="start"` |
| `/admin/cupons` | `basicCoupons` | ❌ | ✅ | ✅ | já tem gate |
| `/admin/taxas-entrega` | `basicReports` (proxy) | ❌ | ✅ | ✅ | já tem gate |
| `/admin/configuracoes/pagamentos` | `onlinePayment` | ❌ | ❌ | ✅ | novo gate `min="start"` (Presença bloqueado) + gate MP interno |
| `/admin/configuracoes/impressora` | `manualPrint` | ❌ | ✅ | ✅ | novo `PlanGate min="pro"` (impressoras QZ = Pro) |
| `/admin/configuracoes/promocao` | `advancedCoupons` | ❌ | ❌ | ✅ | já tem gate |
| `/admin/adicionais` | `advancedAddons` | ❌ | ❌ | ✅ | novo `PlanGate min="pro"` |
| `/admin/observacoes` | `advancedAddons` | ❌ | ❌ | ✅ | novo `PlanGate min="pro"` |

Rotas sem gate necessário (todos os planos): `produtos`, `categorias`, `cardapio/novo`, `diretorio`, `aparencia`, `configuracoes` (index), `assinatura`, `configuracoes/pedidos`.

Sidebar: adicionar ícone de cadeado ao lado do label quando `!can(feature)` (visual apenas — clique continua indo para a rota que já mostra `UpgradeNotice`).

## 4. Impacto técnico

Arquivos a editar:
- `src/components/storefront/CartDrawer.tsx` — reescrever msg WhatsApp + guard em `ensureOrder` + fluxo review para Presença.
- `src/routes/admin.configuracoes.pagamentos.tsx`, `admin.configuracoes.impressora.tsx`, `admin.dashboard.tsx`, `admin.pedidos.tsx`, `admin.relatorios.tsx`, `admin.avaliacoes.tsx`, `admin.adicionais.tsx`, `admin.observacoes.tsx` — envolver com `PlanGate`.
- `src/components/admin/AdminLayout.tsx` — badge de cadeado nos itens bloqueados (consulta `useTenantPlan().can`).

Nenhuma migração de banco. Nenhum novo pacote.
