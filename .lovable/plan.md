# Guia Menuzin — destaques, Famozin e novo painel do lojista

## 1. Botão do produto muda conforme o plano da loja

Na página do produto do Guia (`/guia/produto/:id`):

- Loja no plano **Presença** → botão continua "Pedir agora no WhatsApp".
- Loja no plano **Start ou Pro** → botão vira "Abrir na loja" e leva direto para a loja (`/{slug}`), já que essas lojas recebem pedidos pelo painel.
- Sem WhatsApp cadastrado, sempre vai para a loja.
- O registro de clique continua funcionando, marcando o destino correto.

Para isso, o plano da loja passa a ser exposto junto com os dados públicos do produto.

## 2. Nova seção "Famozin na cidade"

Nova seção da home do Guia, em **grid**, no estilo do anexo:

- Cards com logo da loja em destaque (círculo), nome em negrito e uma linha de status abaixo (ex.: "Aberta agora", "Agendar entrega", "Indisponível") conforme o horário de funcionamento.
- Ordena pelas lojas mais relevantes (com destaque ativo, mais produtos publicados).
- Título "Famozin na cidade", subtítulo curto e link "Ver mais".
- Entra na lista de seções gerenciáveis pelo superadmin (`/platform/guia/secoes`), podendo ser reordenada e ativada/desativada como as demais.

## 3. Categoria "Espetinhos"

- Nova categoria no Guia com slug `espetinhos` e ícone 🍢.
- A inferência automática de categoria passa a reconhecer espetinho/espeto/churrasquinho e o tipo de negócio "espetaria", para que os produtos dessas lojas já nasçam nessa categoria.
- Produtos existentes que se encaixam são reclassificados de uma vez.

## 4. Seção "Em destaque agora"

- Remove o selo com estrela/sparkles do card e o emoji do título.
- Mantém e reforça o layout em **grid** (2 colunas no tablet, 3 no desktop).
- Ganha o link "Ver mais".

## 5. "Ver mais" em todas as seções

Todas as seções da home do Guia passam a ter o link "Ver mais" alinhado à direita do título (mesmo padrão do anexo). Ao clicar:

- Seções de carrossel/grid de produtos e lojas: expandem para mostrar todos os itens (e recolhem com "Ver menos").
- Seção de categorias: leva à listagem completa de lojas.

Seções sem conteúdo continuam ocultas.

## 6. Novo layout de "Produtos publicados no Guia" (aba /admin/diretorio)

A lista atual vira dois blocos:

**a) Destaque grátis (1 produto)**
- Um seletor com **busca** por nome do produto, permitindo escolher **um único** produto para a seção "Em destaque agora".
- Vale para qualquer plano, sem custo, e pode ser trocado a qualquer momento (a troca substitui o destaque anterior).
- Mostra qual produto está em destaque no momento e até quando.

**b) Destaques adicionais via PIX**
- Para destacar mais produtos, o lojista escolhe o produto (mesmo seletor com busca), a duração (7/14/30 dias) e gera o PIX — igual ao fluxo atual de "Solicitar destaque no Guia".
- A solicitação entra em `/platform/guia/solicitacoes` para o superadmin confirmar o pagamento; ao confirmar, o destaque do produto é ativado automaticamente.

**c) Lista de publicação**
- A tabela de produtos continua existindo, mais enxuta: imagem, nome, categoria (select) e toggle publicado/oculto. Os botões "Destacar 7 dias / Destaque no Pro" saem daqui, pois o destaque passa a ser controlado nos blocos acima.

## Detalhes técnicos

- **Banco**: recriar a view `directory_public` incluindo `t.plan`; inserir a categoria `espetinhos` em `guia_categories`; inserir a seção `famozin` em `guia_sections`; adicionar `product_id` em `guia_promo_requests` para vincular a solicitação ao produto destacado.
- **Tipos**: `GuiaSectionId` ganha `famozin`; `SECTION_LABELS`/`DEFAULT_SECTION_ORDER` atualizados; nova entrada de preço para destaque de produto extra em `SLOT_KIND_PRICES` (kind `featured`, reutilizado com `product_id`).
- **Server fns**: `listAllStores` passa a devolver dados de horário/logo para o card Famozin; `featureDirectoryProduct` deixa de exigir plano Pro e passa a limitar a 1 destaque gratuito por tenant (limpa o anterior); `createPromoRequest` aceita `productId`; a aprovação da solicitação no painel do superadmin grava `directory_featured_until` no produto.
- **UI**: `Section` recebe `action` como link/callback; novo componente `FamozinSection`; seletor com busca usando `Command`/`Popover` do shadcn em `admin.diretorio.tsx`.
- **Layout do produto**: `getDirectoryProduct` devolve `plan` e a página decide o texto/destino do botão.
