# Tamanhos e preços na edição de produtos + ordem dos cards

## O que foi encontrado
- Só a **Pastelão Sousa** tem produtos com tamanhos (80 produtos, 154 preços Pequeno/Grande). Nenhuma outra loja usa tamanhos em produtos comuns hoje.
- A tela de produto já tem um editor de tamanhos, mas ele só aparece para lojas do tipo **Pizzaria**. Por isso a pastelaria não vê onde estão os preços P e G.

## O que muda
1. **Nova seção "Tamanhos e preços"** na janela de criar/editar produto, para qualquer loja (exceto produtos de pizza, que já usam a configuração própria da categoria):
   - Lista os tamanhos do produto (ex.: Pequeno R$ 11,00 / Grande R$ 15,00), com editar nome e preço, remover, reordenar e "Adicionar tamanho".
   - Atalho "Copiar tamanhos de outro produto da mesma categoria" para não digitar tudo de novo.
   - Em produto novo, os tamanhos podem ser adicionados antes de salvar e são gravados junto.
   - Aviso curto: com tamanhos cadastrados, o cliente paga o preço do tamanho e o card mostra "A partir de".
2. **Preço principal consolidado:** ao salvar, se o produto tiver tamanhos, o campo "Preço" passa a ser o menor tamanho automaticamente (e fica só para leitura, com a explicação), evitando dois preços em conflito.
3. **Inverter os cards** na janela de editar produto: **Categorias de Adicionais em cima**, Grupos de Observação embaixo.

## Detalhes técnicos
- `src/routes/admin.produtos.tsx`: remover a condição `isPizzaria` do `SizesEditor`; mostrar quando `editing.type !== "pizza"`; acrescentar edição inline, exclusão, reordenação e cópia (server fns em `catalog-admin.functions.ts`, reaproveitando as de `product_sizes` existentes e adicionando update/delete/copy se faltarem, com checagem de tenant).
- Rascunho local de tamanhos para produto novo, gravados após o insert do produto.
- Sincronizar `products.price = min(product_sizes.price)` no servidor após mudanças de tamanho.
- Trocar a ordem dos dois blocos na coluna direita do modal.
- Sem mudança de estrutura no banco. Conferir no navegador com um pastel da Pastelão Sousa.
