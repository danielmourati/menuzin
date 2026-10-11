# Comanda da cozinha (50/58mm): separadores e quebra de texto

## O que encontrei
- Entre um item e outro a comanda só pula uma linha em branco; não existe linha `------`.
- Quando um texto quebra, a linha seguinte volta para a margem. Na fonte dupla, que tem só 16 colunas (ou 12), "Tam:", "OBS:" e os adicionais ficam misturados com o nome do próximo item.
- Palavras maiores que a linha são cortadas no meio sem hífen (ex.: "HAMBURGUE / R").
- O largura mínima fixa de 12 colunas pode passar do limite real em papéis estreitos com fonte grande.

## O que vai mudar
1. **Separador entre itens:** uma linha `-` com a largura exata das colunas ativas (dupla ou padrão) depois de cada item. O último item fecha com `=`.
2. **Recuo nas quebras:**
   - Nome do item: a quebra fica alinhada depois do "2x ", então a quantidade fica sozinha à esquerda.
   - Detalhes (Tam, Sabores, grupos, `+` adicionais, OBS): começam com 1 espaço e as quebras ficam alinhadas depois do rótulo. Na fonte dupla, se o rótulo ocupar mais de 1/3 da linha, o recuo cai para 2 espaços.
3. **Palavras longas:** são quebradas com hífen (`HAMBUR-` / `GUER`) em vez de serem cortadas secas.
4. **Fonte dupla mais legível:** cada adicional sai na sua própria linha (`+ Bacon`, `+ Cheddar`) em vez de uma lista com vírgulas que quebra mal. Na fonte padrão, a lista continua em uma linha quando couber.
5. **Largura sempre fiel à impressora:** colunas da fonte dupla = metade exata das colunas ativas, sem mínimo fixo. Título, cabeçalho, troco e rodapé usam a mesma regra, então nada estoura a linha em 32, 40 ou 24 colunas.

## Como vou conferir
Vou gerar a comanda em texto para 3 casos: 58mm padrão (32 colunas), 58mm compacta (40) e 58mm grande (24), cada um com fonte normal e dupla. O pedido de teste terá nome longo, vários adicionais e observação. Vou checar que nenhuma linha passa do limite e que todos os itens têm separador. A impressão física fica para você testar.

## Detalhes técnicos
- `src/lib/receipt-builder.ts`: nova função `wrapIndent(text, cols, firstPrefix, hangIndent)` com hifenização de palavras longas. A `wrap` atual continua igual para os outros usos.
- `src/lib/kitchen-ticket.ts`:
  - `bigCols = Math.floor(cols/2)`;
  - usa `wrapIndent` para o nome e os detalhes;
  - imprime `lineOf("-", bodyCols)` entre os itens;
  - adicionais um por linha quando `doubleBody`.
- A ordem continua `buildKitchenTicketForPrinter` → `buildKitchenTicket`. Reimpressão continua com 1 via e a impressão automática continua respeitando as duas vias.
