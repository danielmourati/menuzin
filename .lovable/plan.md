## Objetivo

Melhorar a legibilidade dos detalhes de valores do checkout no storefront, que atualmente aparecem "colados", comprometendo a visualização em aparelhos menores. O ajuste será aplicado em ambos os locais onde os valores são exibidos: na barra fixa inferior (StickySubtotal) e no resumo detalhado da etapa de revisão do pedido.

## Direção visual escolhida

- **Estilo:** Compacto com divisores
- **Abordagem:** manter a densidade de informação, mas introduzir separadores sutis e alinhamento consistente entre os itens de valor, sem aumentar drasticamente a altura dos blocos.

## Escopo de mudanças

### 1. Barra fixa inferior (`StickySubtotal` em `src/components/storefront/CartDrawer.tsx`)

Atualmente a barra empilha Subtotal, Desconto, Taxa de entrega e Total em uma coluna sem separadores, e o total fica muito próximo do valor do Subtotal.

Mudanças:
- Inserir um divisor sutil (`border-t border-border/60`) entre o grupo de itens intermediários (Subtotal/Desconto/Taxa) e o Total.
- Aumentar levemente o espaçamento entre as linhas (`space-y-2` ao invés de `space-y-1`).
- Garantir alinhamento numérico à direita (`tabular-nums`) para os valores não pularem entre telas.
- Manter o Total em destaque com a cor primária e tamanho maior.
- No mobile, quando houver botão de ação, garantir que a coluna de valores tenha `min-w-0` e não comprima o botão; reduzir o gap entre a coluna de valores e o botão de `gap-3` para `gap-2` se necessário.

### 2. Resumo detalhado da revisão (`review` step em `src/components/storefront/CartDrawer.tsx`)

Atualmente o resumo dos itens, Subtotal, Desconto, Taxa e Total são exibidos em uma lista contínua sem separadores.

Mudanças:
- Agrupar os itens do pedido em um bloco separado do resumo de valores.
- Adicionar divisor entre a lista de itens e os valores (Subtotal/Desconto/Taxa).
- Adicionar divisor mais forte entre o grupo intermediário e o Total.
- Aplicar `tabular-nums` aos valores para alinhamento.
- Garantir que o nome dos produtos tenha `min-w-0` e `break-words` para não extrapolar a largura em telas pequenas.
- Manter o destaque do Total com cor primária.

### 3. Responsividade em telas pequenas

- Verificar se a barra fixa inferior não quebra em larguras menores que 360px.
- Se o botão de ação for muito largo, reduzir o `min-w` ou usar tamanho de fonte menor no CTA apenas em telas muito pequenas (usando breakpoint `sm:`).
- Garantir que valores como `R$ 1.234,56` não forcem quebra de linha indesejada (valores com `whitespace-nowrap`).

## Arquivos afetados

- `src/components/storefront/CartDrawer.tsx` (ajustes nos componentes `StickySubtotal` e na seção de review)

## Fora de escopo

- Mudanças de cores do tema (manter paleta atual).
- Mudanças no cálculo de valores ou regras de negócio.
- Alterações no fluxo de etapas do checkout.
- Alterações no desktop (os ajustes são mobile-first e devem manter a aparência no desktop).

## Critério de conclusão

- Visualização dos valores no checkout apresenta separadores claros entre Subtotal/Desconto/Taxa e o Total.
- Nenhum elemento fica "colado" ou sobreposto em viewports de 320px ou superiores.
- Total continua destacado com a cor primária e tamanho maior.
- Build e typecheck passam sem erros.