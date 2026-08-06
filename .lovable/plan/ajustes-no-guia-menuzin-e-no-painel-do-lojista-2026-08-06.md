# Ajustes no Guia Menuzin e no painel do lojista

## 1. Categoria "Espetinhos" não aparece nos chips

Verificado no banco: a categoria `espetinhos` existe e está ativa, mas **nenhum produto** está classificado nela — os itens das lojas com tipo de negócio "espetaria" (ex.: Churrascaria Vila Boêmia, Restaurante O Lorim) ficaram todos em `churrasco`. Como o Guia só mostra categorias com produtos, o chip some.

Correção:

- Na inferência de categoria, o tipo de negócio "espetaria" passa a ter prioridade sobre a regra genérica de churrasco quando o produto é um item de espeto (carne/frango/queijo coalho/linguiça/coração/medalhão/camarão em porção individual).
- Reclassificação dos produtos existentes dessas lojas para `espetinhos`, mantendo em `churrasco` o que é porção/prato (picanha 300g/500g, filé com fritas, carne de sol) e em `bebidas` o que já é bebida.

## 2. Produtos publicados no Guia: sem edição

Na aba `/admin/diretorio`, a lista "Produtos publicados no Guia" perde o toggle de publicar/ocultar. Cada item passa a mostrar apenas imagem, nome, preço e badges (categoria do Guia, "Publicado"/"Oculto" e "em destaque"). O texto de apoio muda para deixar claro que a publicação é automática e a categoria vem do cardápio.

## 3. Lista de destaques com edição

O bloco "Em destaque agora" vira uma lista de destaques ativos com gestão:

- Cada linha mostra imagem, nome do produto, tipo (Grátis ou PIX) e validade.
- Ações por linha: **Trocar produto** (abre o seletor com busca) e **Remover**.
- O destaque grátis continua limitado a 1; ao trocar, o anterior sai.
- Destaques pagos podem ser trocados por outro produto dentro do período contratado, sem novo pagamento; a data de validade é preservada.
- Botão "Adicionar destaque via PIX" abre o fluxo de solicitação já existente.

## 4. Seção "Lojas mais bem avaliadas" no Guia

Nova seção na home do Guia, em grid de cards, ordenando as lojas por nota média das avaliações (estrelas) e, como desempate, por número de avaliações. Cada card mostra logo, nome, nota (ex.: 4,8) e quantidade de avaliações.

Observação sobre os dados: hoje existem apenas 2 avaliações no banco, de 1 única loja. Para a seção não ficar vazia, lojas sem avaliação entram depois das avaliadas, exibindo "Nova" no lugar da nota. A seção entra na lista gerenciável pelo superadmin em `/platform/guia/secoes` (reordenar e ativar/desativar).

## 5. Abrir o produto direto na loja

Hoje o botão "Abrir item na loja" leva à página da loja. Passa a abrir o **modal do produto já aberto**: o link inclui o identificador do produto e a loja abre o item automaticamente ao carregar. O mesmo vale para o botão "Ver loja" quando vindo de um produto e para os cards de produto do Guia.

## Detalhes técnicos

- **Banco**: atualização de `products.directory_category` para os itens de espetaria; inserção da seção `top_rated` em `guia_sections`.
- `src/lib/guia-category-infer.ts`: nova regra priorizando `espetaria` + palavras de espeto antes da regra de churrasco.
- `src/lib/directory.functions.ts`: `listAllStores` passa a agregar `rating_avg` e `rating_count` a partir de `order_ratings`; novo campo no tipo `DirectoryStore`.
- `src/lib/guia-types.ts`: `GuiaSectionId` ganha `top_rated`; `SECTION_LABELS` e `DEFAULT_SECTION_ORDER` atualizados.
- `src/lib/directory-admin.functions.ts`: nova função para trocar/remover o produto de um destaque existente (grátis ou pago, preservando `directory_featured_until` no caso pago) e `listMyDirectoryProducts` devolvendo os destaques ativos já normalizados.
- `src/routes/admin.diretorio.tsx`: `ProductsBlock` sem `Switch`; `SpotlightBlock` reescrito como lista com ações.
- `src/routes/guia.index.tsx`: novo `TopRatedSection` no mapa de seções.
- `src/routes/$slug.tsx`: `validateSearch` com `produto?: string`; efeito que seleciona o produto e abre o `ProductModal` quando o parâmetro está presente.

`src/routes/guia.produto.$id.tsx`: destino passa a ser `/{slug}?produto={product_id}`.  
  
Usar o plano do item 4. Seção "Lojas mais bem avaliadas" no Guia para aplicar na seção famozin na cidade e não implementar "Lojas mais bem avaliadas"  
