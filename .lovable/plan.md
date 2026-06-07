# Plano de melhorias — UI, checkout e impressão

Cinco frentes independentes, implementadas em ordem para minimizar risco no fluxo de impressão atual.

## 1. Fundo branco no login mobile

Arquivo: `src/routes/admin.login.tsx`

- Adicionar `bg-white lg:bg-background` no container principal e na coluna direita (`<div className="flex items-center justify-center ...">`) para garantir `#FFFFFF` apenas no breakpoint mobile.
- Layout, copy, Google button e formulário permanecem iguais. Coluna esquerda (gradient brand) só aparece em `lg:` então não é afetada.

## 2. Footer do checkout mais legível

Arquivo: `src/components/storefront/CartDrawer.tsx` (componente `StickySubtotal`, linhas 484-511) e bloco "Items" da etapa Review (linhas 921-947).

Mudanças tipográficas — sem quebrar grid:
- Subtotal / desconto / taxa de entrega: subir de `text-xs` para `text-sm` e cor `text-foreground/80` (desconto continua `text-success`).
- "Total": label `text-xs uppercase tracking-wide text-muted-foreground`; valor sobe de `text-lg` para `text-2xl font-extrabold` com `text-primary`.
- CTA continua `h-12` para não sobrepor o total.
- Mesmo tratamento no resumo da etapa Review (a linha "Total" passa a destacar o valor em `text-xl font-extrabold text-primary`).

Nenhum cálculo muda. Nenhum token de cor novo.

## 3. Impressoras extras (cozinha / balcão / caixa)

### 3.1 Schema

Nova tabela `public.tenant_printers` (migration separada para aprovação):

```
id uuid pk, tenant_id uuid fk tenants, name text, role text check in
('receipt','kitchen','bar','counter','other'), printer_name text,
paper_width text default '80mm', is_active boolean default true,
is_default boolean default false, created_at, updated_at
```

RLS: somente staff/owner do tenant pode ler/escrever (via `has_tenant_role`); `service_role` total. GRANTs para `authenticated` e `service_role`. Trigger `set_updated_at`.

Migração de dados: ao criar a tabela, NÃO migramos `printer_settings` automaticamente — a impressora padrão continua vindo de `printer_settings` (recibo completo). `tenant_printers` é só para impressoras extras. Isso preserva 100% do fluxo atual.

### 3.2 Server functions

Novo arquivo `src/lib/tenant-printers.functions.ts`:
- `listMyTenantPrinters()` — retorna lista do tenant ativo.
- `saveTenantPrinter({ id?, name, role, printer_name, paper_width, is_active })` — upsert.
- `deleteTenantPrinter({ id })`.

Todas com `requireSupabaseAuth` + `tryResolveEffectiveTenantId`, validação Zod (`name 1-40`, `role` enum, `printer_name 0-80`).

### 3.3 UI

Novo componente `src/components/printer/ExtraPrintersManager.tsx`, incluído ao final do wizard `QzPrinterWizard.tsx` (em uma `Collapsible` "Impressoras adicionais") e também acessível em `src/routes/admin.configuracoes.impressora.tsx`.

Cada linha mostra: nome, papel/role (Select), impressora detectada (Select alimentado por `listQzPrintersWithDefault`), switch ativo, botão "Testar" (usa `printQzTextTest`), botão remover. Botão "Adicionar impressora" cria uma linha em branco. Save persiste via mutation + invalida `["tenant-printers"]`.

Compatibilidade: QZ Tray continua único; cada impressora extra simplesmente envia para um `printer_name` diferente via `printQzReceipt`.

## 4. Impressão de comanda da cozinha

### 4.1 Builder

Novo helper `src/lib/kitchen-ticket.ts` espelhando `receipt-builder.ts` mas omitindo blocos financeiros e dados da loja:
```
buildKitchenTicket(order, cols): string
```
Conteúdo, na ordem:
- Header grande: `COZINHA — PEDIDO #N`
- Tipo: ENTREGA / RETIRADA / MESA X
- Cliente (ou mesa/balcão), horário
- Separador
- Para cada item: `Nx Nome`, variações (tamanho/sabor parseAddonLabel), adicionais com `+`, remoções (se vierem em `note` futuras), observação do item destacada com `>> Obs:`
- Observação geral do pedido (se houver) no rodapé com `>> NOTA GERAL:`
- 3 linhas de feed, corte conforme `cut_type` da impressora escolhida

Sem totais, sem método de pagamento, sem CNPJ, sem PIX.

### 4.2 Helper de impressão

Novo `src/lib/print-kitchen.ts`:
```
printKitchenTicket(order, kitchenPrinter): Promise<{printer}>
```
Resolve `cols` a partir de `paper_width`, monta texto via `buildKitchenTicket`, envia com `printQzReceipt`.

### 4.3 Botão no OrderDetailsDrawer

Arquivo: `src/components/orders/OrderDetailsDrawer.tsx` (linhas 247-256, bloco footer).

- Carregar `tenant-printers` via `useQuery` (só quando autenticado).
- Selecionar a primeira impressora `role='kitchen' AND is_active`.
- Substituir o botão único `PrintOrderButton` por dois botões lado a lado:
  - "Imprimir recibo completo" — atual `PrintOrderButton` (label atualizado).
  - "Imprimir comanda cozinha" — novo. Se cozinha não configurada, fica habilitado mas mostra um `toast` com ação "Configurar" que abre `/admin/configuracoes/impressora`.

Mesmo par de botões também é adicionado em `src/components/orders/OrderCard.tsx` (versão compacta com `size="icon"` em mobile) para impressão direta do card sem abrir drawer.

## 5. Home page profissional

Arquivo: `src/routes/index.tsx`.

### 5.1 Remover "MVP"
Linha 52 — substituir `"Novo · MVP funcional"` por `"Plataforma pronta para vender"`.

### 5.2 Mockup com produtos reais

Substituir o grid `[1,2,3,4].map` (linhas 90-98) por 4 cards realistas com imagens. Estratégia:
- Gerar 4 imagens via `imagegen` (model `standard`, 768×768, jpg) em `src/assets/landing-*.jpg`: hamburguer artesanal, pizza pepperoni, açaí na tigela, hambúrguer combo com batata. Importadas como ES6 modules.
- Cada card: imagem `aspect-square object-cover rounded-lg`, nome ("Smash Duplo", "Pizza Pepperoni", "Açaí 500ml", "Combo Família"), descrição curta (uma linha, `line-clamp-1 text-xs text-muted-foreground`), preço destacado em `text-primary font-bold` e mini CTA "Adicionar" como pill `bg-primary/10`.
- Melhorar o card-loja: badge "Aberta agora" com `bg-success/15 text-success`, sombra `shadow-[var(--shadow-pop)]` mantida, padding maior (`p-7`), barra do carrinho com ícone `ShoppingBag`.

### 5.3 Polimento da seção features
Manter as 4 colunas mas trocar copy para tom comercial ("Cardápio digital", "Pedidos em tempo real", "Integração WhatsApp", "Painel de gestão") e adicionar uma seção curta de social proof acima dos planos: 3 selos (`Multi-loja`, `LGPD`, `Suporte BR`) em uma faixa simples — sem testimonials fake.

Restante do design (planos, footer) preservado.

## Ordem de execução e isolamento

1. Migração `tenant_printers` (requer aprovação).
2. Server functions + UI de impressoras extras.
3. Builder de comanda + botões no drawer/card.
4. Mudanças puramente cosméticas: login mobile, footer do checkout, landing.

Cada passo é independente; impressão atual de recibo completo (`printer_settings` + `printOrderViaQz`) não é tocada.

## Fora do escopo

- Refatorar `printer_settings` para o novo modelo (mantemos as duas fontes coexistindo).
- Mudar layout do recibo completo.
- Alterar fluxo de pedidos, checkout (além da tipografia do footer) ou multi-tenant.
- Testimonials, vídeo ou copy nova além do listado.
