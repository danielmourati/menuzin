## Conversão automática para WebP nos uploads

Centralizar a conversão no `uploadTenantImage` (única entrada para uploads de imagens do tenant — logos, capas, produtos, promo modal, etc.). Sem mudanças nos call sites.

### 1. Conversão client-side para WebP (`src/lib/storage.ts`)

Antes do upload, converter `File` → `Blob` WebP via `<canvas>`:

- Pular conversão para `image/svg+xml` e `image/gif` (animados) — sobem como estão.
- Carregar via `createImageBitmap(file)` (mais rápido e sem CORS de `Image`).
- Redimensionar para no máx. **1600px** no maior lado (mantém proporção). Evita megabytes de fotos de celular sem perda visual perceptível em telas.
- Render em `OffscreenCanvas` quando disponível, fallback `HTMLCanvasElement`.
- `canvas.toBlob(blob, "image/webp", 0.82)`.
- Se a conversão falhar (browser sem suporte / erro de decode), faz fallback e sobe o arquivo original.
- Aumenta limite para 10MB **antes** da conversão (arquivo final raramente passa de 300–500KB) e valida 5MB **depois**.
- Caminho final passa a usar extensão `.webp` e `contentType: "image/webp"` quando convertido.
- `cacheControl` sobe para `31536000` (1 ano) — nomes de arquivo já são UUID, então cache imutável é seguro e acelera reaberturas.

### 2. Otimizar abertura/exibição

- Adicionar `loading="lazy"` e `decoding="async"` nos `<img>` de listas pesadas:
  - `src/components/storefront/ProductCard.tsx`
  - `src/components/storefront/FeaturedScroller.tsx`
  - `src/components/storefront/UpsellSuggestions.tsx`
  - Thumbs no `admin.produtos.tsx` e `admin.categorias.tsx`
- Imagens "above the fold" (logo do header, banner da loja, imagem principal do `ProductModal`, imagem do `PromoModal`) recebem `loading="eager"` + `fetchPriority="high"` + `decoding="async"`.

### Arquivos alterados

- `src/lib/storage.ts` — função `convertToWebp()` + integração no `uploadTenantImage`.
- `src/components/storefront/ProductCard.tsx`
- `src/components/storefront/FeaturedScroller.tsx`
- `src/components/storefront/UpsellSuggestions.tsx`
- `src/components/storefront/ProductModal.tsx`
- `src/components/storefront/PromoModal.tsx`
- `src/routes/admin.produtos.tsx`
- `src/routes/admin.categorias.tsx`
- `src/routes/$slug.tsx` (logo/banner header, se aplicável)

### Fora do escopo

- Reprocessar imagens antigas já no bucket (não pediu).
- Servir múltiplas resoluções / `srcset` (exigiria edge transformer; pode ser próximo passo se quiser).
