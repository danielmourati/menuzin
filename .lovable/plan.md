## Imagem default para produtos sem foto

Adicionar uma ilustração vetorial cinza (gray food vector) como fallback quando o produto não tiver `image_url` cadastrado, aplicando tanto no storefront quanto no painel admin.

### 1. Gerar o asset
- Criar `src/assets/default-food.svg` — ícone/ilustração vetorial de comida (prato + talheres) em tom cinza neutro (`#9CA3AF` / muted-foreground), fundo transparente, formato quadrado, estilo minimalista/flat.
- Fazer upload via `lovable-assets` para CDN e gerar `default-food.svg.asset.json`.

### 2. Criar helper compartilhado
Novo arquivo `src/lib/product-image.ts`:
```ts
import defaultFood from "@/assets/default-food.svg.asset.json";
export const DEFAULT_PRODUCT_IMAGE = defaultFood.url;
export const productImage = (url?: string | null) =>
  url && url.trim() ? url : DEFAULT_PRODUCT_IMAGE;
```

### 3. Aplicar nos componentes
Substituir usos diretos de `product.image` / `p.image_url` pelo helper:

**Storefront:**
- `src/components/storefront/ProductCard.tsx` (linhas 57 e 120)
- `src/components/storefront/ProductModal.tsx` (linha 278)
- `src/components/storefront/FeaturedScroller.tsx` (linha 50)
- `src/components/storefront/UpsellSuggestions.tsx` (linha 54)

Adicionar também `object-contain` + `bg-muted` quando for o placeholder (para o vetor não ficar cortado por `object-cover`), via classe condicional.

**Admin:**
- `src/routes/admin.produtos.tsx` (linha 220) — trocar o `https://placehold.co/...` pelo `productImage(p.image_url)`.
- `src/components/ui/image-uploader.tsx` (linha 52) — quando `value` for vazio, mostrar o placeholder ao invés de não renderizar preview algum (opcional; melhora UX).

### Comportamento
- Produtos com imagem: renderizam normalmente com `object-cover`.
- Produtos sem imagem: renderizam o SVG cinza centralizado com `object-contain` sobre `bg-muted`, mantendo o mesmo aspect ratio do card.
