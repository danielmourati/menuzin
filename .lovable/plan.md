# Plano

## 1. Remover botão central (hambúrguer) da bottom nav mobile

Arquivo: `src/routes/guia.index.tsx` (linhas 322–331)

- Remover o `<div>` do círculo central com o emoji 🍔.
- Ajustar o container para distribuir os 4 tabs restantes uniformemente (`justify-around` no lugar de `justify-between`).
- Resultado: navbar mobile com 4 ícones (início, busca, pedidos, conta).

## 2. Drag and drop das seções do Guia (exceto Hero)

Seções ordenáveis na home `/guia`:
1. Categorias
2. Destaques da semana (featured)
3. Lojas em alta (top_stores)
4. Ofertas relâmpago (flash_offer)
5. Banner 1
6. Coleções
7. Banner 2
8. Em destaque agora (featured reais do banco)
9. CTA publique seu cardápio

Hero fica **fixo no topo**, fora da lista ordenável.

### Estado da ordem (mock, superadmin)
Adicionar em `src/lib/guia-mock.ts`:
- Tipo `GuiaSectionId` com os ids acima.
- Campo `sectionOrder: GuiaSectionId[]` no `State` (persistido no localStorage junto com o resto).
- Seed com a ordem atual.
- Hook `useGuiaSectionOrder()` e ações `guiaActions.moveSection(id, dir)` e `guiaActions.setSectionOrder(list)`.

### Configuração no painel superadmin
Nova aba/página `src/routes/platform.guia.secoes.tsx`:
- Lista as seções na ordem atual, cada uma com nome/descrição e handle de arrastar.
- Drag and drop com `@dnd-kit/core` + `@dnd-kit/sortable` (instalar).
- Também botões ↑/↓ como fallback acessível.
- Botão "restaurar ordem padrão".
- Adicionar link "Seções" no `platform.guia.tsx` (layout com abas).

### Home pública `/guia`
- Refatorar `GuiaHome` para montar um map `sectionId -> ReactNode` com o conteúdo atual de cada seção.
- Renderizar `sectionOrder.map(id => map[id])` abaixo do Hero.
- Se uma seção não tiver conteúdo (array vazio), continua sendo omitida como hoje.

## 3. Reduzir arredondamento dos cards

Padrão atual: `rounded-3xl` (24px) em muitos cards, `rounded-2xl` (16px) em outros.
Novo padrão: **`rounded-xl` (12px)** para cards grandes e **`rounded-lg` (8px)** para elementos pequenos/badges internos.

Arquivos e substituições:
- `src/components/guia/SlotCard.tsx` — trocar todos `rounded-3xl` → `rounded-xl`; `rounded-2xl` internos → `rounded-lg`.
- `src/routes/guia.index.tsx`:
  - Hero wrapper `rounded-3xl` → `rounded-xl`.
  - Card de categoria `rounded-2xl` → `rounded-lg`.
  - Container "lojas em alta" `rounded-3xl` → `rounded-xl`; item interno `rounded-2xl` → `rounded-lg`.
  - Cards "em destaque agora" `rounded-2xl` → `rounded-lg`.
  - CTA final `rounded-3xl` → `rounded-xl`.
  - Search bar e chips de verticals mantêm `rounded-2xl` (são controles, não cards) — **não alterar**.
- `src/routes/guia.$categoria.tsx` e `src/routes/guia.produto.$id.tsx`: aplicar o mesmo downgrade nos cards principais para manter consistência.

Sem mudanças em botões, inputs, drawers ou modais — apenas cards/banners/destaques do guia público e seus equivalentes no preview.

## Detalhes técnicos

- Nova dependência: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (via `bun add`).
- `sectionOrder` versionado no `STORAGE_KEY` existente; fallback seguro quando localStorage não tem o campo (usa seed).
- Sem mudanças em backend, RLS ou server functions — tudo continua no mock client-side.
- Typecheck após as mudanças.
