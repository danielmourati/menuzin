# Loja demo passa a ser a Burguer Prime

Hoje os links "Demo da loja" / "Ver loja demo" na home apontam para a primeira loja ativa retornada pela lista (hoje a Brazeiro Assados Gourmet), o que muda sozinho conforme o banco.

## O que muda

- A home passa a usar a **Burguer Prime** (`/burguerprime`) como loja de demonstração em todos os três botões de demo (topo, hero e seção de destaque).
- A escolha deixa de ser "a primeira loja da lista": passa a procurar explicitamente a loja demo pelo identificador `burguerprime`.
- Se por algum motivo essa loja não estiver ativa, o site volta a usar a primeira loja ativa como reserva, evitando link quebrado.

## Detalhes técnicos

- Em `src/routes/index.tsx`: adicionar uma constante `DEMO_SLUG = "burguerprime"` e trocar `const demoSlug = tenantsData?.tenants?.[0]?.slug` por uma busca `tenants.find(t => t.slug === DEMO_SLUG)?.slug ?? tenants?.[0]?.slug`.
- Nenhuma outra parte do projeto referencia uma loja demo fixa (o sitemap lista todas as lojas ativas), então não há outras alterações necessárias.
- Sem mudanças de banco de dados.
