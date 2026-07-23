## Plano

### 1) Corrigir status em `/platform/assinaturas` (anexo 1)

Hoje a tabela mostra duas etiquetas incoerentes para lojas Ativas no plano **Presença**:
- Loja com assinatura real (Churrascaria Vila Boêmia) → badge verde **"Ativa"**.
- Loja sem assinatura persistida (Pizza D'Primeira) → chip **"SEM ASSINATURA"** + badge cinza **"gratuito"**.

Como **Presença** é gratuito por definição, o status efetivo deve ser o mesmo nos dois casos.

**Correção em `src/routes/platform.assinaturas.tsx` (linha ~113):**
- Remover o ramo `isVirtual ? "gratuito"` e sempre renderizar `SubscriptionStatusBadge`.
- Quando `s.plan?.slug === "presenca"` (ou o tenant não tem sub paga), forçar `effective = "ativa"` e rótulo **"Ativa (grátis)"** — passar via prop `label` já suportada por `SubscriptionStatusBadge`.
- Manter o chip pequeno "SEM ASSINATURA" ao lado do nome (só marca origem virtual), sem afetar o status.
- Coluna Vencimento/Dias: quando Presença virtual, exibir "—" (já é o comportamento).

### 2) Retornar telas de escolha Entrega/Retirada no fluxo (Presença + demais)

O passo `step === "mode"` existe em `CartDrawer.tsx`, mas para o plano **Presença** o botão "Continuar" do carrinho vai para `mode` corretamente — porém há relatos de que o usuário não vê Entrega/Retirada. Causa provável: os flags `acceptsDelivery`/`acceptsTakeout` vindos do tenant Presença podem chegar `false` (loja não configurou modalidades).

**Correção em `src/components/storefront/CartDrawer.tsx`:**
- Para `isPresencaOnly`, ignorar os flags `acceptsDelivery/Takeout/Dinein` e **sempre** renderizar as três opções na etapa `mode` (a loja Presença não configura pedidos no admin, então precisamos garantir que a modalidade apareça na mensagem do WhatsApp).
- Título do header no fluxo Presença: manter "Opções de pedido" (mais neutro).
- Após seleção: `entrega` → `mode-address` (formulário livre, sem validação de taxa/zona porque Presença não cobra), `retirada` → `customer`, `consumo_local` → `mode-table`. Já é o fluxo — apenas garantir que `feeResolution` não seja exigido para Presença (curto-circuitar `deliveryAvailable = true` quando `isPresencaOnly`).
- Incluir a modalidade escolhida + endereço/mesa no texto enviado ao WhatsApp (já ocorre em `buildPresencaMessage`).

### 3) Card "Enviar comprovante PIX via WhatsApp" — plano Start

No plano **Start**, `onlinePayment` é `false` (gateway MP é só Pro), mas o lojista pode aceitar PIX manual (chave estática). Hoje o cliente escolhe "PIX" e finaliza sem canal claro para enviar o comprovante.

**Implementação em `src/components/storefront/CartDrawer.tsx` (tela de confirmação/`review` quando `paymentMethod` inclui "PIX" e o plano do tenant é Start):**
- Após finalizar o pedido, na tela de sucesso (ou como bloco final no `review` antes de finalizar), renderizar um **card destacado** com:
  - Ícone PIX + título "Envie o comprovante".
  - Instrução curta ("Após pagar, envie o comprovante ao lojista para agilizar a confirmação").
  - Botão primário **"Enviar comprovante via WhatsApp"** que abre `wa.me/<whatsapp_da_loja>` com mensagem pré-formatada: `"Olá! Segue comprovante do PIX do pedido #<numero> — <nome do cliente>. Total: R$ X,XX."`
- Gate: renderizar apenas quando `tenantPlan === "start"` **e** método selecionado começa com "PIX" (ou seja, PIX manual — não o fluxo MP do Pro).
- Reaproveitar `whatsappLink()` de `src/lib/whatsapp.ts`.

Também expor esse mesmo card na página `/loja/$slug/pedido-confirmado` quando o pedido tem método PIX e tenant é Start, para o cliente que voltar depois.

### Escopo de arquivos
- `src/routes/platform.assinaturas.tsx` — status unificado.
- `src/components/storefront/CartDrawer.tsx` — modalidade sempre visível em Presença + card PIX Start.
- `src/routes/loja.$slug.pedido-confirmado.tsx` (e/ou `$slug.pedido-confirmado.tsx`) — card PIX Start pós-checkout.

Sem alterações de schema, RLS ou server functions.
