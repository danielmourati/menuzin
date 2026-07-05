## 1. Anexo 1 — card mobile do tenant (`src/routes/$slug.tsx`)

- Na linha de informações internas, remover a palavra "Entrega" — mostrar só o valor (`R$ 8,00` ou `R$ 8,00 ~ R$ 15,00`) precedido do ícone de moto. Isso encurta o texto e cabe tudo em uma única linha ao lado de `⏱ prep time` e `💰 Mín. R$ …`.
- Trocar `flex flex-wrap` por `flex flex-nowrap` na linha de infos para forçar linha única (e reduzir gaps se necessário: `gap-x-3`).
- Se o tenant tiver `description`, adicioná-la dentro do card, abaixo do bloco de informações, com `line-clamp-2 text-[11px] text-muted-foreground mt-2 border-t pt-2` — mantendo o card clicável (abre o drawer).

## 2. Anexo 2 — nome do produto na visualização em lista (`src/components/storefront/ProductCard.tsx`)

- Trocar o `h3` do modo lista (`line-clamp-1`) por `line-clamp-2` para permitir quebra em até 2 linhas quando o nome for longo, sem virar `...` na primeira palavra.
- Mesmo ajuste no grid view (`line-clamp-1` → `line-clamp-2`) para consistência.

## 3. Anexo 3 — botões menu e lupa no header mobile (`src/routes/$slug.tsx`)

- Reduzir os dois botões de `h-11 w-11` para `h-9 w-9`.
- Ajustar tamanho dos ícones internos (`Menu`, `Search`, `XIcon`) de `h-5 w-5` para `h-4 w-4`.
- Manter o mesmo estilo (menu com borda/card, lupa com fundo primário/redondo).

## Fora do escopo

- Layout desktop.
- Estrutura do drawer "Sobre a loja".
- Mudanças de dados/backend.
