# Slug de produto: link único para destaques do Guia

Hoje os produtos não têm endereço próprio — a loja abre um modal e o link do Guia usa o id (`/loja?produto=<uuid>`). Para o superadmin conseguir apontar um destaque para um item específico, e para a solicitação paga do lojista já chegar com esse endereço pronto, cada produto passa a ter um **slug**.

## O que muda

1. **Cada produto ganha um slug**
   - Gerado automaticamente a partir do nome (ex.: "X-Burger Duplo" → `x-burger-duplo`), único dentro da loja, com sufixo numérico quando houver repetição.
   - Todos os produtos existentes recebem slug de uma vez.
   - Novos produtos e renomeações mantêm o slug preenchido automaticamente (o slug não muda sozinho depois de criado, para não quebrar links já divulgados).

2. **Endereço legível do produto**
   - Passa a funcionar `menuzin.app/<loja>/<slug-do-produto>` e `/guia/produto/<slug>`, abrindo o item exatamente como hoje (modal na loja, página no Guia).
   - Os links antigos por id continuam funcionando.

3. **Painel do lojista (/admin/produtos e /admin/diretorio)**
   - Cada produto mostra seu link ("Copiar link do produto"), para o lojista compartilhar ou enviar ao suporte.

4. **Solicitação de destaque pago já vem com o slug**
   - Ao solicitar um destaque, a solicitação grava o produto escolhido **e** o link/slug dele.
   - Em `/platform/guia/solicitacoes`, o superadmin vê o link do produto com botão "Copiar" e uma ação "Criar destaque" que abre o modal de destaque já preenchido com loja, produto, nome, imagem e preço.

5. **Modal "Novo destaque" (/platform/guia/slots)**
   - O campo de referência do produto passa a aceitar também o slug (`loja/slug-do-produto`) além de URL e id, e mostra qual produto foi encontrado antes de salvar.

## Detalhes técnicos

- Migração: `ALTER TABLE public.products ADD COLUMN slug text;` + índice único `(tenant_id, slug)`; função `slugify` + trigger `BEFORE INSERT` que preenche o slug quando nulo, resolvendo colisões com sufixo `-2`, `-3`; UPDATE de backfill para as linhas existentes; depois `SET NOT NULL`.
- Migração: `guia_promo_requests` ganha `product_slug text` e `product_href text` (nulos permitidos).
- `createPromoRequest` (`src/lib/guia-admin.functions.ts`) passa a resolver o slug do `productId` e gravar `product_slug`/`product_href`; `mapRequest` e o tipo `GuiaPromoRequest` expõem os campos.
- `adminResolveProductRef`: além de uuid e slug de loja, resolve `<slug-loja>/<slug-produto>` e `?produto=<slug>` consultando `products` por `tenant_id + slug`.
- Rotas: nova `src/routes/$slug.$produtoSlug.tsx` (reaproveita a página da loja abrindo o produto) e `getDirectoryProduct` aceitando slug além de uuid em `/guia/produto/$id`.
- `src/routes/$slug.tsx`: o search param `produto` passa a aceitar slug ou uuid na busca do produto para deep link.
- `src/routes/platform.guia.solicitacoes.tsx`: coluna com link + copiar + ação que abre `SlotFormDialog` pré-preenchido.
- Sem alterações em RLS; as escritas continuam pelos server functions já existentes.
