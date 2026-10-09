# PDV no estilo Degust (cores do Menuzin)

## Como fica a tela
- **Painel da comanda (esquerda):** número grande da comanda com o selo "Em aberto", data de início e quem criou. Em seguida vêm cliente, modo (Balcão/Mesa/Entrega), mesa ou endereço e "Anotar observação…". Abaixo ficam a lista de itens lançados, com quantidade, editar e remover, e no rodapé o **TOTAL DO PEDIDO**, a forma de pagamento e o botão **Lançar pedido**. O rascunho automático e o troco que já existem continuam funcionando.
- **Localizar Produto (janela grande):** abre pelo botão "Adicionar item" ou pela tecla **F2**.
  - Busca no topo, com foco automático, por nome ou código.
  - Coluna de categorias à esquerda, uma cor por categoria, mais "Todas".
  - Tabela com as colunas Categoria, Cód., Nome, Preço, **Adicionar (F11)** e **Personalizar (Enter)**.
  - Botões para alternar entre lista e grade, um botão "Atualizar", a chave "Agrupar categoria" e um contador "93 produtos encontrados".
  - Teclado: ↑/↓ escolhem a linha, F11 adiciona direto, Enter abre a personalização e Esc fecha. Duplo clique também personaliza.
  - A janela continua aberta depois de adicionar, para lançar vários itens em sequência. Um aviso curto confirma cada item.
- **Produtos de tamanho único:** cada tamanho vira uma linha própria, igual ao Degust: "Pastel Carne c/ Queijo (P)" R$ 5, "(M)" R$ 15, "(GG)" R$ 23. Com isso, o F11 já adiciona o tamanho certo.

## Itens com personalização obrigatória
- Um item exige personalização quando atende a qualquer um destes casos:
  - pizza (tamanho e sabores);
  - mais de um sabor (pastel de 2 sabores, montados);
  - grupo de adicionais obrigatório (mínimo ≥ 1), como quentinhas ou marmitas com escolha de carne ou acompanhamento;
  - oferta/combo com escolhas.
- Nesses itens, a coluna Adicionar mostra um selo **"Escolher"** no lugar do "+". O F11 abre a personalização em vez de adicionar direto, com o aviso "Este item precisa de escolhas".
- A personalização usa a mesma janela de produto do cardápio online, que já faz pizza, sabores e adicionais. Assim, regras e preços ficam iguais aos da loja.

## Cores
- Cores do Menuzin: laranja primário nos botões de ação e na linha selecionada, verde no selo "Em aberto".
- As cores das categorias saem de uma paleta suave e fixa, baseada nas cores do tema (a mesma categoria sempre tem a mesma cor).

## Celular
- No celular, a janela Localizar Produto ocupa a tela inteira, com as categorias numa faixa rolável no topo e os produtos em grade. Os atalhos de teclado ficam só no computador.

## Detalhes técnicos
- Novo `src/components/pdv/ProductFinderModal.tsx`, adaptado de `ConsumerProductFinderModal` do Degust: estado de lista/grade, linha selecionada e atalhos F11/Enter/Esc/setas.
- Novo helper puro `requiresCustomization(product, ctx)` em `src/lib/pdv-customization.ts`. Ele considera `type === 'pizza'`, `max_flavors > 1`, oferta com escolhas e grupos de adicionais aplicáveis (por produto ou categoria) com `required || min_select > 0`.
- As linhas de tamanho são geradas a partir de `product_sizes`. Para a adição direta, o item vai ao carrinho com o tamanho já escolhido (rótulo "Tamanho: X"), no mesmo formato que o `ProductModal` produz hoje.
- Código: os 4 primeiros caracteres do id ou um código PDV, se existir.
- `src/routes/admin.pdv.tsx` é reorganizado: painel da comanda + botão para abrir o localizador. O catálogo em grade sai da tela principal. O carrinho, o rascunho, o pagamento, o endereço e o lançamento continuam iguais.
- Fora do escopo: "Bloquear pedido", "Vincular cliente" e "Mais opções" do Degust (dependem de comandas múltiplas, que o Menuzin não tem).
