# "Ver todos" na seção "Que tal uma bebida?" do carrinho

## O que muda
1. **Categoria Refri como padrão**: as sugestões passam a mostrar primeiro os itens da categoria cujo nome contém "Refri" (Refri, Refrigerantes). Só quando não houver Refri disponível, caem para as demais categorias de bebida (sucos, águas, cervejas), como hoje.
2. **Link "Ver todos"** à direita do título "Que tal uma bebida?". Ao tocar:
   - fecha o carrinho;
   - leva até a categoria Refri no cardápio da loja (ou à primeira categoria de bebida, se não houver Refri), rolando a página até ela.
3. O carrossel continua com até 4 itens; o link só aparece se houver mais itens na categoria do que os exibidos ou se houver outras categorias de bebida.

## Detalhes técnicos
- `src/components/storefront/UpsellSuggestions.tsx`: ordenar categorias de bebida com prioridade `/refri/i`; montar sugestões a partir da categoria Refri primeiro, completando com outras bebidas até 4.
- Receber prop `onViewAll(categoryId)` do `CartDrawer.tsx` (dois usos) que fecha o drawer e rola até a seção da categoria no storefront (reutilizar o mesmo mecanismo/âncora usado pela barra de categorias da loja).
