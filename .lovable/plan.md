## Objetivo

Redesenhar **`/guia`** (home do Guia Menuzin) inspirado no aiqfome (anexos 1 e 2), com **dados mockados** e visual denso, colorido e "faminto". Mantemos rotas filhas (`/guia/$categoria`, `/guia/produto/$id`) inalteradas nesta iteração — só a home muda.

## Escopo

**Somente frontend** em `src/routes/guia.index.tsx`. Sem migração, sem alteração de server functions, sem novas dependências. As queries reais (`listCategories`, `listFeatured`) continuam sendo carregadas no loader, mas a UI usa **mock local** para preencher todas as seções novas (lojas em alta, coleções, banner promo, produtos em destaque com % OFF, etc.). Quando houver dados reais, ficam intercalados; quando não houver, o mock aparece com aviso sutil "conteúdo demonstrativo".

## Referências visuais (aiqfome)

- Header colado no topo com **endereço/bairro** + sino de notificações (fake) + ícone de mensagens.
- **Chips de vertical** ("restaurantes", "mercados", "conveniências") com pill colorido no ativo.
- Blocos com **título grande + subtítulo com emoji** ("lojas em alta por aqui ✨", "pra driblar a fome ⚽").
- **Cards de loja compactos**: logo redonda/quadrada, nome, taxa entrega (moto), nota (estrela), tag "%" verde.
- **Coleções**: cards retangulares altos (aspect-[3/4]) com arte cheia (gradiente + texto grande).
- **Banner horizontal** promocional cheio de cor.
- **Grid de categorias com emoji** grande e label minúsculo.
- **Cards de produto/loja em destaque** com selo de nota no canto e badge "40% OFF".
- **Bottom nav mobile** fake (início / busca / logo central / pedidos / conta) — apenas visual.

## Estrutura da nova home

```text
[Header sticky]
  📍 Rua/Bairro (mock) — Parnaíba-PI    [msg] [🔔6]
  [restaurantes*] [mercados] [conveniências]   ← chips (só restaurantes ativo)

[Seção: lojas em alta por aqui ✨]         "ver tudo →"
  grid 2 col mobile / 4 col desktop, cards horizontais compactos
  (mock: 6 lojas com logo, nome, entrega, nota)

[Seção: pra driblar a fome ⚽🍕]           "ver tudo →"
  Banner horizontal grande (uploaded image? não — usar gradiente + emoji)
  Scroll horizontal de cards de produto com badge "40% OFF"
  (mock: 6 produtos, preços riscados + preço promo)

[Seção: coleções de lojas e promos]        "ver tudo →"
  Scroll horizontal de cards aspect-[3/4] (3–4 coleções)

[Seção: banner cheio (cervejas zero, etc.)]
  1 banner full-width com gradiente e frase

[Seção: categorias]
  grid 6 col com emoji grande + label
  (usa DIRECTORY_CATEGORIES real)

[Seção: destaques reais]
  Se `listFeatured` retornar itens, renderiza como grid de cards.
  Senão, mostra 6 cards mockados marcados como "demo".

[Bottom nav mobile fake] (só md:hidden)
```

## Mock data (dentro do arquivo)

Criar constantes no topo de `guia.index.tsx`:

- `MOCK_STORES` — 6 lojas: `{ id, name, logo (emoji ou gradiente), deliveryFee, rating, tag }`.
- `MOCK_PROMOS` — 6 produtos promo: `{ id, name, store, image, price, promoPrice, discount, rating }` usando imagens `productImage(null)` (fallback svg) ou emojis grandes sobre gradientes tematizados por categoria.
- `MOCK_COLLECTIONS` — 4 coleções: `{ title, subtitle, gradient, emoji }`.
- `MOCK_BANNER` — 1 banner: `{ title, subtitle, gradient, emoji }`.

Sem imagens externas: usar **gradientes CSS + emojis grandes** (padrão do resto do projeto) para não introduzir binários. Onde já houver produto real, `productImage()` cobre o fallback.

## Design tokens

- Reaproveitar `bg-primary`, `bg-card`, `bg-muted` do design system (não hardcodar cores).
- Introduzir 4 acentos via classes utilitárias inline (`from-orange-500 to-pink-500`, `from-purple-600 to-fuchsia-500`, etc.) apenas dentro dos banners/coleções — permitido por serem gradientes decorativos, não tokens de brand.
- Tipografia: manter fontes do projeto; títulos de seção `text-xl font-black tracking-tight` com emoji inline (estilo aiqfome).
- Radius consistente: `rounded-2xl` em cards, `rounded-full` em chips.
- Mobile-first: layout otimizado para 375–414 px (referências são iPhone).

## Detalhes técnicos

- Arquivo tocado: **só `src/routes/guia.index.tsx`**.
- `loader`, `head`, `Route.options` permanecem; apenas `GuiaHome()` é reescrita.
- `useSuspenseQuery(featuredQO)` continua; usamos os dados quando existirem, mock caso `items.length === 0`.
- Todos os cards mock que "linkariam" apontam para `#` com `onClick={(e)=>e.preventDefault()}` e um toast opcional "Demo" — mais simples: apenas `<button>` sem navegação, para não quebrar rotas.
- Categorias reais continuam navegando para `/guia/$categoria`.
- Bottom nav é apenas decorativo (`<div>` com ícones lucide + labels), oculto em `md:`.
- Adicionar `role="navigation"` e `aria-label` nos blocos principais.

## Fora do escopo

- Alterar `/guia/$categoria` e `/guia/produto/$id`.
- Persistir seleção de vertical (mercados/conveniências) — puramente visual.
- Trocar dados reais por mock em outras rotas.
- Criar componente de bottom nav global — fica local ao arquivo desta home.
- Adicionar bibliotecas de carrossel; scroll horizontal nativo (`overflow-x-auto snap-x`).

## Riscos

- Excesso de gradientes fortes destoando da landing atual → contido em banners/coleções; cards de loja/produto seguem `bg-card` neutro.
- Confusão entre demo e real → seção de destaques reais só ativa quando `featured.length > 0`; mocks têm badge sutil "demo" quando aplicável.
