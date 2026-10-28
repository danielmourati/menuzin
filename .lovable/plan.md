# Mostrar a categoria do produto na lista de vínculo

Na seção "Aplicar a produtos específicos", cada produto passa a mostrar, ao lado/abaixo do nome, o nome da sua categoria em letra menor e apagada (ex.: "3 Sabores · Pastéis Doces"), para diferenciar produtos com o mesmo nome.

- Aplica-se aos grupos de Adicionais e também aos de Observações (mesma lista).
- A busca também passa a encontrar produtos pelo nome da categoria.
- Produto sem categoria não mostra nada extra.

## Detalhes técnicos
- `src/routes/admin.adicionais.tsx` e `src/routes/admin.observacoes.tsx`: na lista de produtos, usar o mapa `catName` já existente com `p.category_id` e renderizar `<span className="text-[10px] text-muted-foreground/70">`; incluir o nome da categoria no filtro `filteredProducts`.
- Confirmar que a consulta de produtos traz `category_id`; adicionar se faltar.
