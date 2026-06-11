# Plano de implementação

## 1. Admin > Produtos: hierarquia Pizza → subcategorias
No filtro de categorias da tela `admin.produtos.tsx`, agrupar todas as categorias `kind === "pizza"` sob um item pai "Pizza" com as subcategorias (Tradicionais, Doces, Especiais…) listadas indentadas abaixo. Selecionar "Pizza" filtra todos os produtos de qualquer subcategoria pizza; selecionar uma subcategoria filtra só ela. Mesma lógica de agrupamento já existente no storefront (`$slug.tsx`) será reutilizada visualmente.

## 2. Tamanhos de pizza: ocultar zerados e renderização
Em `ProductModal.tsx` (storefront), na seção de tamanhos de pizza:
- Filtrar tamanhos cujo menor preço entre os sabores disponíveis seja `0` ou inexistente — não exibir.
- Corrigir o cálculo "A partir de" para usar o menor preço real entre os sabores irmãos para aquele `category_size_id` (hoje pode estar caindo em 0 quando há sabor sem preço cadastrado).

## 3. Travar preço quando múltiplos sabores selecionados
Quando o tamanho aceita 2+ sabores e o usuário já escolheu o 1º sabor:
- O preço unitário fica fixado no valor do 1º sabor escolhido (regra "maior preço entre os escolhidos" já existe; vamos manter "maior preço" como política, mas travar visualmente).
- Na lista de sabores sugeridos, ocultar/esmaecer os valores dos demais sabores (mostrar apenas nome + descrição), deixando claro que escolher outro sabor não altera o total.
- Badge "Valor não muda" próximo à lista.

## 4. Upsell de bebida durante o pedido
Novo componente `UpsellDrawer` exibido **ao abrir o carrinho** (`CartDrawer.tsx`) **uma única vez por sessão de carrinho**:
- Se o carrinho NÃO contém nenhum produto cuja categoria tenha nome contendo "bebida", "refri", "suco" (case-insensitive), sugerir até 4 produtos disponíveis dessas categorias do mesmo tenant.
- Card compacto com imagem, nome, preço e botão "+ Adicionar". Adiciona direto ao carrinho sem abrir modal (produtos simples).
- Se não houver bebida cadastrada, não exibe nada.

## 5. Pizza com adicional grátis (borda/refri grátis)
No cadastro do produto pizza (`admin.produtos.tsx` aba Preço ou Classificação):
- Novo bloco "Brinde incluso" com:
  - Switch "Esta pizza inclui um brinde grátis"
  - Tipo: `Borda` ou `Produto` (ex.: refrigerante)
  - Se Borda → select com as bordas da categoria pizza (de `category_pizza_crusts`)
  - Se Produto → select dos produtos do tenant
- Persistir em 2 colunas novas em `products`: `free_gift_kind` (`crust|product|null`) e `free_gift_ref_id` (uuid).
- No storefront `ProductModal.tsx`: quando o produto tem brinde de borda, pré-selecionar e travar a borda correspondente com preço 0 e label "Grátis". Quando brinde de produto, ao adicionar a pizza ao carrinho, adicionar também o produto-brinde como item separado com `basePrice: 0` e nota "Brinde".

Migration necessária: adicionar colunas em `public.products`.

## 6. Substituir logo em todo o projeto
- Subir `/mnt/user-uploads/logo_v1.png` via Lovable Assets → `src/assets/menuzin-logo.png.asset.json`.
- Substituir todas as ocorrências do logotipo/wordmark atual nos componentes: `AdminLayout` (sidebar), `admin.login`, `index.tsx` (home), `platform.dashboard`, headers públicos, favicon meta no `__root.tsx`.
- Ajustar tokens de cor no `src/styles.css` para alinhar com a paleta do novo logo: primary laranja `#F26522` e dark navy `#143C5A` (oklch equivalentes), mantendo contraste e dark mode. Atualizar `--primary`, `--primary-glow`, `--accent` e gradiente.

## Arquivos afetados (principais)
- `src/routes/admin.produtos.tsx` (1, 5)
- `src/components/storefront/ProductModal.tsx` (2, 3, 5)
- `src/components/storefront/CartDrawer.tsx` + novo `UpsellSuggestions.tsx` (4)
- `src/lib/catalog-admin.functions.ts`, `src/lib/catalog.functions.ts`, `src/lib/db-adapters.ts`, `src/lib/domain-types.ts` (5)
- Migration Supabase (5)
- `src/assets/menuzin-logo.png.asset.json` + componentes com logo (6)
- `src/styles.css` (6)

## Perguntas antes de implementar
1. **Upsell**: mostrar como **drawer/modal ao abrir o carrinho** (1x por sessão) ou como **seção fixa dentro do CartDrawer** ("Que tal adicionar?") sempre visível?
2. **Brinde grátis tipo Produto**: o produto-brinde deve ser **adicionado automaticamente ao carrinho** junto com a pizza, ou apenas **exibido como aviso** "Você ganhou 1 Refri 350ml" e o atendente entrega manualmente?
3. **Cores do logo**: posso atualizar a paleta primária do app para o **laranja #F26522 + navy #143C5A** do logo, ou prefere manter as cores atuais e apenas trocar a imagem?
