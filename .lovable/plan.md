# Categoria do Guia herdada automaticamente do banco

Hoje, na tela **Produtos publicados no Guia** (`/admin/diretorio`), 27 dos 127 produtos aparecem com o campo "Categoria" vazio (ex.: Coca-cola 1 L, itens de Refri, Sucos, Bebidas, Espetos, Hamburguer). O lojista precisa escolher manualmente item a item, e um produto sem categoria não pode ser publicado no Guia.

## O que muda

- Cada produto passa a ter uma **categoria padrão do Guia derivada da categoria do cardápio** do próprio banco. Ex.: produtos em "Refri", "Sucos", "Bebidas" → Bebidas; "Espetos" → Churrasco; "Hamburguer" → Hambúrguer; "Quentinhas" → Quentinhas.
- Nova categoria **Bebidas 🥤** no Guia (hoje não existe, por isso bebidas ficam sem opção coerente).
- Preenchimento retroativo: todos os produtos hoje sem categoria recebem a categoria inferida, então o seletor abre já preenchido em vez de vazio.
- Produtos novos nascem com a categoria inferida automaticamente ao serem criados/editados no cardápio, sem ação do lojista.
- O lojista continua podendo trocar a categoria manualmente; a escolha manual nunca é sobrescrita.
- No seletor, quando a categoria vier da herança automática, aparece uma marca discreta "sugerido pelo cardápio" para deixar claro que pode ser ajustado.

## Regra de inferência

Ordem de decisão, parando na primeira que casar:
1. Categoria já definida manualmente no produto.
2. Palavras-chave no nome da categoria do cardápio (refri, suco, bebida, água, cerveja → Bebidas; pizza → Pizza; espeto, churrasco, porção → Churrasco; hambúrguer/burger → Hambúrguer; quentinha → Quentinhas; marmitex → Marmitex; açaí → Açaí; sobremesa, doce → Doces; lanche, combo → Lanches).
3. Palavras-chave no nome do próprio produto (mesma tabela).
4. Tipo de negócio da loja (pizzaria → Pizza, hamburgueria → Hambúrguer, etc.).
5. Sem correspondência: continua vazio, exigindo escolha manual.

## Detalhes técnicos

- Migração: inserir `guia_categories` slug `bebidas` (ativa, ordem 9); `UPDATE products SET directory_category = <inferido>` apenas onde `directory_category IS NULL`, usando a mesma tabela de palavras-chave via join com `categories`.
- Novo módulo `src/lib/guia-category-infer.ts` com a tabela de palavras-chave e `inferGuiaCategory({ menuCategoryName, productName, businessTypes })`, compartilhado entre servidor e UI.
- `src/lib/directory-admin.functions.ts`: `listMyDirectoryProducts` passa a retornar também o nome da categoria do cardápio e um `suggested_category` por produto; ao salvar produto sem categoria, aplica o inferido.
- `src/lib/catalog-admin.functions.ts`: ao criar/atualizar produto, define `directory_category` inferido quando estiver nulo.
- `src/routes/admin.diretorio.tsx`: `Select` usa `directory_category ?? suggested_category` como valor exibido, com legenda "sugerido pelo cardápio" quando for sugestão.
