
# Fase 1 — UX do admin (Sidebar + Pedidos + Modal + Impressão)

Escopo restrito ao que você marcou. Cupons, relatórios, taxas e motoboys ficam para fases seguintes (planejo cada um depois desta entrega aprovada).

## 1) Sidebar recolhível com rodapé fixo

`src/components/admin/AdminLayout.tsx` hoje usa uma `<aside>` própria com largura fixa `w-64`. Vou trocar pelo componente `shadcn/ui Sidebar` para ganhar collapse nativo + persistência:

- Envolver o admin em `SidebarProvider` com `defaultOpen={false}` (sempre inicia recolhida).
- Reescrever `SidebarInner` como `<Sidebar collapsible="icon">` com três seções:
  - `SidebarHeader` — logo Menuzin + card “Loja conectada”.
  - `SidebarContent` — itens de navegação (mesmos 7 itens atuais).
  - `SidebarFooter` — “Ver loja pública” + “Sair”, fixos no rodapé.
- Adicionar `<SidebarTrigger />` no header do admin para abrir/recolher.
- No modo recolhido, manter somente ícones (com `tooltip` mostrando o label).
- Manter o `Sheet` mobile já existente, agora alimentando o mesmo conteúdo.

## 2) Página `/admin/pedidos` em cards retangulares

Hoje a tela usa `OrdersKanbanBoard` (linhas horizontais com cards finos) ou lista vertical. Vou substituir a visualização desktop por um **grid de cards quadrados/retangulares** agrupados por status, no estilo dos dashboards de referência:

- Novo componente `OrdersStatusGroups` que renderiza, em ordem:
  1. **Novos** (status `novo`) — destaque com borda primária e pulsar.
  2. **Aceitos / Lidos** (`aceito`).
  3. **Em preparo** (`preparo`).
  4. **Prontos / Despachados** (`pronto_retirada`, `saiu_entrega`, `servido`).
  5. **Finalizados / Cancelados** (recolhido por padrão, em accordion).
- Cada grupo: título + contador + grid `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4`.
- Novo `OrderCard` retangular (substitui o atual “linha”): nº do pedido, modalidade (badge), nome do cliente em destaque, horário relativo + absoluto, total grande, badge de status, e CTA principal contextual: “Ler pedido” (novo), “Abrir” (em preparo), “Aceitar/Cancelar” (novo), botão de impressão como ícone secundário. Sem overflow horizontal; truncamento controlado.
- Mantém filtros e busca atuais. Visualização Kanban antiga vira opcional via toggle existente (Lista x Cards).
- Mobile: continua usando `OrdersMobileTabs` mas alimentado pelo novo `OrderCard`.

## 3) Modal centralizado de detalhes

Hoje `OrderDetailsDrawer` usa `Sheet` (drawer lateral). Vou converter para `Dialog` centralizado:

- Renomear para `OrderDetailsDialog` (mantém o arquivo, reexporta com nome novo; admin.pedidos passa a importar o novo).
- `DialogContent` com `max-w-3xl`, `max-h-[90vh]`, layout em duas colunas no desktop (esquerda: cliente + itens + observações; direita: timeline + valores + pagamento) e empilhado no mobile.
- Footer com `OrderStatusActions` (já existe) → aceitar, cancelar, imprimir, marcar pronto, saiu entrega, finalizar. Botão imprimir e WhatsApp continuam.
- Acionado por “Ler pedido”/“Abrir”/“Aceitar” do card.

## 4) Atalho “Configurar impressora” na página de pedidos

- No header de `/admin/pedidos` (ao lado de “Simular Pedido”), adicionar botão “Configurar impressora” (ícone `Printer`).
- Em vez de levar para a rota `/admin/configuracoes/impressora`, vou abrir um **modal** com o painel de configuração:
  - Extrair o miolo da rota atual `admin.configuracoes.impressora.tsx` para um componente `PrinterSettingsPanel`.
  - Novo `PrinterSettingsDialog` envolve esse painel em `Dialog` (mantém também a rota dedicada funcionando, sem duplicar lógica).
  - Tutorial QZ Tray dentro de `<Collapsible>` recolhido por padrão; botão “Salvar” explícito no rodapé do modal.
- Tipos suportados continuam: térmica via QZ Tray + genérica via `window.print()` (sem mudança de regras).

## Detalhes técnicos

- Sem mudanças de schema, autenticação, tenants ou checkout.
- Sem novos pacotes — uso `Sidebar`, `Dialog`, `Collapsible`, `Tabs` já presentes.
- Tokens semânticos (`bg-card`, `border-border`, `text-primary` etc.) — sem hex em componente.
- `_qz.websocket.connection.sendData` e demais regras de impressão permanecem como estão.

## Arquivos previstos

- editar `src/components/admin/AdminLayout.tsx` — adotar `Sidebar` + `SidebarProvider defaultOpen={false}` + `SidebarFooter`.
- criar `src/components/orders/OrdersStatusGroups.tsx` — grid agrupado por status.
- reescrever `src/components/orders/OrderCard.tsx` — layout retangular.
- editar `src/components/orders/OrderDetailsDrawer.tsx` → renomear para `OrderDetailsDialog.tsx` (Dialog centralizado, conteúdo 2 colunas).
- criar `src/components/printer/PrinterSettingsPanel.tsx` — extração do conteúdo da rota.
- criar `src/components/printer/PrinterSettingsDialog.tsx` — wrapper Dialog.
- editar `src/routes/admin.configuracoes.impressora.tsx` — passa a renderizar o novo painel.
- editar `src/routes/admin.pedidos.tsx` — usar `OrdersStatusGroups`, `OrderDetailsDialog`, botão “Configurar impressora”.

## O que não muda

- Lógica de `useOrdersRealtime`, polling, RLS, criação de pedidos, impressão QZ.
- `OrdersKanbanBoard` antigo continua disponível (mantenho como opção via toggle).
- Demais rotas/admin/menu — apenas a sidebar muda visualmente.
