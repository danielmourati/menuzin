# Destaques do Guia: modal com rolagem, link para o produto, sem emoji/gradiente

## O que muda

1. **Modal "Novo destaque" (/platform/guia/slots)**
   - Corrigir o transbordo: o conteúdo passa a ter altura máxima (~85% da tela) com rolagem interna; cabeçalho e rodapé (Cancelar/Salvar) ficam fixos.
   - Em telas grandes, o preview fica em coluna própria e "gruda" no topo enquanto o formulário rola.

2. **Produto de referência (novo campo)**
   - Novo input "Link ou slug do produto" no formulário do destaque.
   - Aceita: URL completa do produto (ex.: `https://menuzin.app/burguer-prime?produto=<id>`), link do Guia (`/guia/produto/<id>`), `slug-da-loja` ou `slug-da-loja/<id-do-produto>`.
   - Ao sair do campo, o sistema valida e mostra a loja/produto encontrado (ou um aviso claro se não existir/estiver inativo). Ao salvar, o destaque guarda a loja, o produto e o link final.
   - Botão opcional "Preencher do produto" para copiar nome, foto, preço, promoção e nota do item do cardápio para o card.

3. **Card clicável no Guia**
   - Todos os tipos de card (hero, destaque, banner, coleção, loja em alta, oferta relâmpago) passam a ser clicáveis quando houver link, levando à página do produto no Guia (ou à loja, quando o link apontar só para a loja). Cards sem link continuam estáticos.

4. **Remover emoji e gradiente**
   - Os campos "Emoji" e "Gradiente" saem do formulário.
   - Os cards passam a usar a imagem enviada; sem imagem, exibem um fundo neutro do tema (sem gradientes coloridos aleatórios) com o título.

## Detalhes técnicos

- `src/components/guia/SlotFormDialog.tsx`: `DialogContent` com `max-h-[85vh] overflow-hidden flex flex-col` + área central `overflow-y-auto`; remover estados `emoji`/`gradient`; adicionar `productRef` (string) e estado de resolução.
- Nova server fn em `src/lib/guia-admin.functions.ts` (`adminResolveProductRef`, com `requireSupabaseAuth`): recebe a string, extrai slug/UUID, consulta `tenants` + `products` e devolve `{ tenantId, productId, slug, name, imageUrl, price, promoPrice, rating, href }`.
- `slotInput` ganha `tenantId` e `productId` (já existem as colunas `tenant_id`, `product_id`, `href` em `guia_slots`); `toSlotRow` grava os três. Sem migração de banco.
- `mapSlot` já expõe `href`, `tenantId`, `productId` — nenhuma mudança em `src/lib/guia.functions.ts`.
- `src/components/guia/SlotCard.tsx`: envolver o card num `Link` (`/guia/produto/$id` quando houver `productId`; senão `href` externo/loja) mantendo o markup atual; remover uso de `emoji`/`gradient` e trocar o `bg-gradient-to-*` por `bg-muted`/`bg-card` com borda.
- `DEFAULT_GRADIENTS` deixa de ser usado pelo formulário (mantido no arquivo apenas se ainda referenciado; caso contrário, removido de `guia-types.ts`).
- Registro de clique: reaproveitar o endpoint existente `/api/public/guia-click` quando o destaque apontar para um produto do diretório.
