# Categoria nos cards de produto da loja

Produtos com o mesmo nome (ex.: "2 Sabores") ficam indistinguíveis, principalmente na busca e em Destaques/Promoções, onde aparecem fora do título da categoria.

## O que muda
- Card de produto do storefront mostra o nome da categoria em fonte menor e opaca logo abaixo do nome (ex.: "2 Sabores" / "Pastéis Simples (Monte seu)").
- Dentro da lista normal agrupada por categoria, o rótulo aparece só quando há busca ativa ou em seções mistas (Destaques, Promoções), evitando repetição do título da seção.
- Busca dinâmica da loja passa a considerar apenas o nome do produto (hoje inclui a descrição), mostrando somente itens cujo nome corresponde ao termo.

## Técnico
- `src/routes/$slug.tsx`: filtro em ~linha 453 passa a usar só `p.name`; passar prop `showCategory` aos cards quando `search` não vazio e nos carrosséis de destaque/promo.
- Componente de card do produto: nova prop opcional `showCategory`, renderiza `product.category` com `text-xs text-muted-foreground truncate`.
