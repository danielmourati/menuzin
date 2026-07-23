## Plano

1. **Auditar os pontos de renderização de produto**
   - Revisar `ProductCard`, `FeaturedScroller`, listagens do storefront, páginas de destaques/promoções e modal de produto.
   - Confirmar se o problema aparece em grade, lista, carrossel horizontal ou detalhe do produto.

2. **Corrigir badges/elementos indevidos**
   - Remover qualquer renderização remanescente de `Destaque`, `Oferta` ou similares associada ao produto.
   - Manter apenas badges funcionais necessários, como `Indisponível`, se fizer sentido para disponibilidade.

3. **Ajustar consistência visual dos cards**
   - Garantir que imagem, título, descrição, preço e botão de adicionar fiquem alinhados em grid, lista e carrossel.
   - Evitar sobreposição de textos, badges, preço ou botão `+`.
   - Preservar o tratamento da imagem padrão (`object-contain`) e imagens reais (`object-cover`).

4. **Verificar no storefront**
   - Conferir a renderização em lista e grade.
   - Conferir também carrosséis de “Mais vendidos” e “Promoções”, porque usam outro componente.

## Detalhes técnicos

- Arquivos principais envolvidos:
  - `src/components/storefront/ProductCard.tsx`
  - `src/components/storefront/FeaturedScroller.tsx`
  - `src/components/storefront/ProductModal.tsx`
  - `src/routes/$slug.tsx`
  - `src/routes/$slug.destaques.tsx`
  - `src/routes/$slug.promocoes.tsx`

- Já foi localizado um ponto remanescente relacionado a produto: o modal ainda renderiza a etiqueta `Destaque` quando `product.featured` está ativo. Essa correção será incluída junto da revisão dos cards.