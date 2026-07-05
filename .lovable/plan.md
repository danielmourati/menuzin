## Escopo

Anexo 1 — Card da loja no storefront (`src/routes/$slug.tsx`, ~L350-390):
- Hoje a ordem interna do card é: cabeçalho (logo + nome + status) → linha de infos (Bike/Clock/Wallet) → descrição da loja.
- Inverter para: cabeçalho → **descrição da loja** → **linha de infos** (Bike/Clock/Wallet).
- Ajustar as bordas `border-t`/paddings entre os dois blocos para manter o mesmo respiro visual do anexo (a linha de infos passa a ficar por baixo da descrição, com divisor sutil no topo).

Anexo 2 e 3 — Chevron de voltar em `/mais-vendidos`, `/destaques`, `/promocoes` disparando "Erro ao carregar a loja: Cannot read properties of undefined (reading 'filter')" (`src/routes/$slug.destaques.tsx`, também usado por `$slug.promocoes.tsx`):
- Causa: `FeaturedList` usa `useQuery` com a **mesma queryKey** `["catalog", slug]` do storefront principal, mas com um `queryFn` que retorna uma forma reduzida (`{tenant, products}` sem `categories`, `pizzaSizes`, `pizzaDoughs`, `pizzaCrusts`). Quando o usuário volta para `/$slug`, o `useSuspenseQuery(catalogQueryOptions(slug))` lê o cache já sobrescrito e o `StorePage` executa `categories.filter(...)` sobre `undefined`, quebrando a página.
- Correção: reutilizar `catalogQueryOptions` (exportado de `src/routes/$slug.tsx`) dentro do `FeaturedList` em vez de declarar um `queryFn` local. Isso mantém a mesma forma de dados em cache e a navegação de volta funciona sem recarregar.
- Como `catalogQueryOptions` hoje é privado do módulo, exportá-lo de `$slug.tsx` e importar em `$slug.destaques.tsx`. `FeaturedList` passa a derivar `items` de `(data?.products ?? []).filter(filter)` sem mudar comportamento.
- O chevron continua com `<Link to="/$slug" params={{ slug }}>` — nenhuma mudança de rota necessária.

## Fora de escopo

- Estilo/tema, textos, cálculo de valores, outros pontos do checkout.
- Rotas administrativas.

## Critério de conclusão

- Card da loja mostra a descrição imediatamente abaixo do cabeçalho e a linha "Entrega ~ / Tempo / Mín." logo abaixo da descrição.
- Ao clicar no chevron de voltar em `/mais-vendidos`, `/destaques` e `/promocoes`, o storefront carrega normalmente, sem o erro "reading 'filter'".
- Build e typecheck passam.
