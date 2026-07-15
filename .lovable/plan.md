## Objetivo
Deixar a home do `/guia` mais viva mesmo sem lojas reais cadastradas: exibir lojas mockadas ligadas às categorias, remover o título "todas as lojas", manter o toggle grade/lista e transformar o clique nas categorias em filtro do bloco de lojas (em vez de navegar para `/guia/$categoria`).

## Mudanças

### 1. `src/lib/guia-mock.ts`
- Adicionar um array `MOCK_STORES` (~8–12 itens) tipado como o objeto consumido por `AllStoresSection` (`tenant_id`, `tenant_slug`, `tenant_name`, `tenant_logo`, `neighborhood`, `city`, `categories: string[]`, `product_count`, `has_featured`).
- Usar `tenant_slug` fictícios (ex.: `#` como link ou slug mock) e `categories` com os slugs de `DIRECTORY_CATEGORIES` (`quentinha`, `pizza`, `churrasco`, `hamburguer`, `lanches`, `marmitex`, `acai`, `doces`).
- Distribuir bairros ("Centro", "Pindorama", "São Vicente" etc.) e marcar 2–3 como `has_featured: true`.
- Exportar via um hook simples `useGuiaMockStores()` ou apenas `export const MOCK_STORES`.

### 2. `src/routes/guia.index.tsx`
- Importar `MOCK_STORES` e combinar com `storesData.stores` (`const allStores = [...storesData.stores, ...MOCK_STORES]`), sem duplicar por `tenant_id`.
- Adicionar estado `const [categoryFilter, setCategoryFilter] = useState<string | null>(null)`.
- Categorias: trocar o `<Link to="/guia/$categoria">` por um `<button>` que faz `setCategoryFilter(prev => prev === c.slug ? null : c.slug)`, com estado visual ativo (ring/texto primary) quando selecionado. As categorias mockadas (não presentes em `DIRECTORY_CATEGORIES`) continuam sem clique.
- Passar `categoryFilter` e `onClearFilter` para `AllStoresSection`; filtrar `stores` por `s.categories.includes(categoryFilter)` quando houver filtro.
- Bloco `AllStoresSection`:
  - Remover o `<h2>todas as lojas</h2>` e o subtítulo de contagem.
  - Manter o toggle grade/lista alinhado à direita; quando houver filtro ativo, mostrar um chip compacto do lado esquerdo do toggle: "categoria: <label> ✕" (clicando limpa o filtro). Sem filtro: apenas o toggle.
  - Manter os dois modos de renderização (grid/list) exatamente como estão.
  - Ajustar o empty state para: "nenhuma loja nessa categoria" quando `categoryFilter` estiver ativo.

### Notas técnicas
- Nada muda em `directory.functions.ts` nem em `guia.$categoria.tsx` (rota permanece funcional se acessada por URL).
- Como os mocks não têm rota de loja real, os cards mock apontam para `to="/$slug"` com `params={{ slug: s.tenant_slug }}` normalmente; se o slug não existir, cai no 404 padrão (aceitável para dado mock — não é objetivo aqui criar loja falsa navegável).
- Nenhuma alteração de RLS, backend, ou tokens de design fora da tela em questão.
