## Mover Promoção para Cupons

**Página `/admin/cupons` (renomear):**
- Título do AdminLayout: `Cupons` → `Cupons e Promoções`
- Envolver o conteúdo em `Tabs` com duas abas:
  - **Cupons** — conteúdo atual da página (lista, modal de criação/edição, botão "Novo cupom" continua como action no header, exibido apenas quando a aba Cupons estiver ativa)
  - **Promoções** — card com o mesmo bloco que existe hoje em Configurações > Promoção (título "Modal promocional", descrição e botão `Configurar modal` → `/admin/configuracoes/promocao`)

**Sidebar (`src/components/admin/AdminLayout.tsx`):**
- Label do item `/admin/cupons`: `Cupons` → `Cupons e Promoções` (ícone `Ticket` mantido)

**Configurações (`src/routes/admin.configuracoes.index.tsx`):**
- Remover `<TabsTrigger value="promocao">` e o `<TabsContent value="promocao">` correspondente

**Fora do escopo:** rota `/admin/configuracoes/promocao` continua existindo e funcional (apenas o atalho muda de lugar); nenhuma mudança em backend, schema, RLS ou lógica de cupons/promoção.
