# Guia Menuzin vira a página inicial (menuzin.app)

## O que muda
- **menuzin.app** passa a mostrar o Guia (lojas, destaques, categorias, busca, CEP).
- **menuzin.app/guia** redireciona permanentemente para **menuzin.app** (links antigos e Google continuam funcionando).
- A landing atual para lojistas é **descontinuada**; **/comece-agora** vira a única página para lojistas. O que só existia na landing atual (ex.: FAQ, loja demo Burguer Prime) é levado para /comece-agora se ainda não estiver lá.
- Categorias e produtos continuam em **/guia/pizza**, **/guia/produto/...**.
- O Guia ganha um link visível "Para lojistas / Cadastre sua loja" apontando para /comece-agora.

## Auditoria dos links
- "Voltar ao Guia", "Explorar o Guia" (Minha conta, Meus pedidos, categorias, produto) passam a apontar para a página inicial.
- Logo do /comece-agora, login do painel, termos, privacidade, página 404 e erro: revisar destino (Guia para clientes, /comece-agora onde o contexto é lojista, ex.: login do painel).
- Botão "Ver no Guia" do painel do lojista aponta para a página inicial.
- Links do rodapé/nav inferior do Guia ("Início") conferidos.
- Varredura final em todo o projeto por referências a "/guia" sem subcaminho e por links quebrados; teste navegando pelas páginas.

## Melhorias de SEO do Guia
- Título e descrição da página inicial focados em busca local ("delivery perto de você, cardápios de restaurantes em [cidade]"), com canonical em https://menuzin.app.
- Dados estruturados (schema.org): WebSite com caixa de busca, ItemList das lojas em destaque; nas categorias, BreadcrumbList e ItemList; no produto, Product/Offer + Breadcrumb; nas lojas, Restaurant com endereço e avaliação.
- Conteúdo visível para o Google mesmo sem CEP: a página é renderizada no servidor com lojas e categorias (o pedido de CEP não esconde o conteúdo dos robôs).
- Um único H1 claro, textos alternativos nas imagens, links internos entre categorias.
- Sitemap: página inicial com prioridade máxima, categorias geradas a partir do banco (não fixas), produtos visíveis no Guia e lojas; remove /guia e inclui /comece-agora.
- Metadados próprios em cada categoria e produto (título, descrição, imagem de compartilhamento quando houver foto).

## Detalhes técnicos
- `src/routes/index.tsx` passa a renderizar o conteúdo de `guia.index.tsx` (componente extraído para `src/components/guia/GuiaHome.tsx`); `guia.index.tsx` vira `beforeLoad` com `redirect({ to: "/", statusCode: 301 })`.
- Seções exclusivas da landing antiga migradas para `comece-agora.tsx`/`LandingSections.tsx`; remoção do código morto.
- Atualizar `sonner.tsx` (`p.startsWith("/guia")` → incluir `/`), `api.public.guia-click` sem mudança.
- `sitemap[.]xml.ts`: categorias de `guia_categories` ativas e produtos de `directory_public`.
- `robots.txt` mantido; JSON-LD via `head().scripts` nas rotas.
- Verificação: build, Playwright em `/`, `/guia` (redirect), categoria, produto, minha conta, e checagem do HTML servido (título, canonical, JSON-LD).
