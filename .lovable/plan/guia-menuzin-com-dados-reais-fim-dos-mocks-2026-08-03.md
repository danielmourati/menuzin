# Guia Menuzin com dados reais (fim dos mocks)

Hoje o Guia mistura duas fontes: lojas/produtos reais (via `directory_public`) e um grande bloco de dados fictícios guardados só no navegador (`localStorage`): hero, destaques, banners, coleções, ofertas relâmpago, categorias, ordem das seções e solicitações de destaque. Além disso, hoje o Guia aparece vazio de verdade: as 4 lojas ativas estão com opt-in ligado, mas nenhum dos 127 produtos está marcado como visível no Guia, então `directory_public` retorna zero linhas.

Objetivo: tudo que o Guia mostra passa a vir do banco, e o painel `/platform/guia` passa a editar o banco (valendo para todos os visitantes, não só para o dispositivo do superadmin).

## O que muda

### 1. Lojas e produtos reais aparecem
- Produtos disponíveis de lojas com opt-in entram no Guia por padrão (o lojista continua podendo esconder item a item em `/admin/diretorio`).
- Categoria do produto no Guia: quando não definida, é inferida a partir da categoria do cardápio e do tipo de negócio da loja; o lojista/superadmin pode corrigir.
- A lista de lojas do Guia passa a vir das lojas em si (não apenas de quem tem produto marcado), com bairro, cidade, logo, capa e contagem de itens.
- Remoção do fallback `MOCK_STORES` na home do Guia.

### 2. Conteúdo curado do superadmin sai do navegador e vai para o banco
Passam a ser persistidos e compartilhados:
- Slots (hero, destaques, lojas em alta, banner, coleções, ofertas relâmpago), com ativo/oculto, ordem, imagem, período de exibição e vínculo opcional a uma loja/produto real.
- Categorias do Guia (rótulo, emoji/imagem, ordem, ativo).
- Ordem e visibilidade das seções da home.
- Solicitações de destaque dos lojistas (PIX), hoje mockadas, passam a ser registros reais criados por `/admin/diretorio` e aprovadas em `/platform/guia/solicitacoes` — ao marcar como pago, o slot é criado no banco.
- Cai o aviso "Modo demonstração" do painel.

### 3. Filtro por cidade
Como o visitante já informa o CEP, a home do Guia passa a listar lojas da cidade resolvida; slots e categorias podem ser globais ou restritos a uma cidade.

### 4. Estado vazio honesto
Se não houver slot cadastrado para uma seção, a seção simplesmente não é renderizada (em vez de mostrar conteúdo fictício). A home mantém categorias, lista de lojas reais e o card "Publique seu cardápio grátis no MenuZin".

## Detalhes técnicos

Banco (uma migração):
- `guia_slots`, `guia_categories`, `guia_sections`, `guia_promo_requests` no schema público, cada uma com GRANTs explícitos, RLS ativa, leitura pública apenas do conteúdo ativo e escrita restrita a `platform_admin` (via `is_platform_admin()`); `guia_promo_requests` também gravável pelo dono/admin do próprio tenant.
- Seed das categorias atuais (Quentinhas, Pizza, Churrasco, Hambúrguer, Lanches, Marmitex, Açaí, Doces) e da ordem padrão das seções.
- Backfill: `products.directory_visible = true` para produtos disponíveis de tenants com opt-in, e preenchimento de `directory_category` por heurística sobre a categoria do cardápio; `directory_visible` passa a nascer `true`.
- Ajuste da view `directory_public` mantendo apenas colunas seguras, mais uma view/consulta de lojas do Guia derivada de `tenants`.

Código:
- Novo `src/lib/guia.functions.ts` (leitura pública via cliente publishable) e `src/lib/guia-admin.functions.ts` (CRUD protegido por `platform_admin`).
- `src/routes/guia.index.tsx`, `guia.$categoria.tsx` e `guia.produto.$id.tsx` passam a carregar tudo por loader + TanStack Query.
- `platform.guia.*` (visão geral, seções, slots, categorias, solicitações) trocam os hooks de `guia-mock` por mutations com invalidação de cache; drag-and-drop grava a ordem no banco.
- `src/lib/guia-mock.ts` é removido; os tipos usados pelas telas migram para um módulo de tipos do Guia.
