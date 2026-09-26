# Preço "A partir de" para produtos com vários tamanhos

## O que muda
Em todas as lojas, quando um produto tem tamanhos com preços diferentes (ex.: Pequeno R$ 11,00 e Grande R$ 15,00):
- **Card do produto no cardápio**: mostra "A partir de R$ 11,00" no lugar do preço único.
- **Topo da janela do produto** (onde hoje aparece "R$ 11,00/UN"): antes de o cliente escolher o tamanho, mostra "A partir de R$ 11,00". Depois da escolha, mostra o preço do tamanho escolhido.
- Produtos com um só preço, ou com todos os tamanhos pelo mesmo valor, continuam como estão.
- As opções de tamanho continuam mostrando o preço de cada uma.

## Detalhes técnicos
- Criar um utilitário `getPriceRange(product)` que calcula o menor e o maior preço positivo de `product.sizes`.
- Usar em `ProductCard.tsx` (nas duas variações de card) e no cabeçalho de `ProductModal.tsx`.
- O rótulo "A partir de" aparece quando menor < maior.
- Nada muda no banco de dados nem no cálculo do carrinho.
