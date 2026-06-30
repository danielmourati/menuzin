## Objetivo
Ajustar a renderização e o cálculo de preços de pizzas no storefront (`src/components/storefront/ProductModal.tsx` e seu wiring em `src/routes/$slug.tsx`) para refletir somente o que foi cadastrado, exibir "A partir de" no header do modal, padronizar a divisão por sabor e marcar 1/N na descrição.

## Mudanças

### 1. Mostrar tamanhos/sabores apenas se tiverem preço cadastrado
- `visiblePizzaSizes` já filtra tamanhos sem preço em nenhum sabor — manter.
- Na lista de **sabores**, calcular `priceOfFlavor` SEM fallback para `fallbackPrice` quando estiver em pizza-category. Se o sabor não tiver preço cadastrado para o tamanho selecionado:
  - ocultar o sabor da lista (ele não é selecionável para esse tamanho); ou
  - se ainda assim listado, ocultar o valor e impedir seleção.
- Decisão: **filtrar** os sabores do tamanho atual, mantendo a lista enxuta e impedindo seleção inválida.

### 2. "A partir de" no header do modal
Substituir o preço atual do header (que mostra `basePrice = 0` quando nada está selecionado) por:
- Se `isPizzaCategory`: calcular `minFlavorPrice` = menor `pricesByCategorySizeId[sizeAtual]` entre os sabores disponíveis para o tamanho selecionado e renderizar "A partir de **R$ X**" enquanto `n === 0`; quando há sabor selecionado, exibir o total calculado normalmente.
- Se não for pizza-category: manter comportamento atual.

### 3. Cálculo da pizza fracionada = média
- Reescrever `shareOfFlavor` para **sempre** retornar `priceOfFlavor(f) / n`, removendo o uso de `fractionPricesByCategorySizeId` no cálculo do storefront (ele continua persistido no backend, mas o cliente passa a calcular sempre como média). Resultado: 2 sabores → 50%/50%; 3 sabores → 1/3 cada; soma = média dos preços.
- `pizzaBase` permanece `sum_fractions` por padrão (= média). Mantém `max_value` quando categoria estiver configurada assim.

### 4. Indicar 1/N na descrição do sabor escolhido
- Dentro do modal, quando `n > 1`, prefixar o nome do sabor selecionado com `1/N` em:
  - lista de sabores (badge ao lado do nome quando o checkbox estiver marcado);
  - resumo persistido no carrinho (já implementado em `extras.push` — manter, mas garantir formato "1/N • Nome — R$X").

### 5. Garantir desmarcação de sabor
- `toggleFlavorId` já remove ao reclicar. Adicionar verificação visual: o `<Checkbox>` precisa receber `onCheckedChange` em qualquer estado (já recebe). Validar que o clique no label não está bloqueado e que, em `maxFlavors = 1`, reclicar o mesmo sabor o desmarca em vez de manter selecionado (ajustar `toggleFlavorId` se necessário — hoje já faz isso corretamente).
- Smoke test rápido após edit: abrir um produto pizza com 2 sabores, clicar/desclicar.

## Arquivos tocados
- `src/components/storefront/ProductModal.tsx` — header "A partir de", filtro de sabores por tamanho, `shareOfFlavor` = média, badge 1/N na lista.
- (Nenhuma mudança em backend, schema ou admin.)

## Validação
- Abrir produto pizza com 2 e 3 sabores, conferir total = média dos preços do tamanho.
- Conferir header exibe "A partir de" + menor preço cadastrado do tamanho atual.
- Tamanhos sem preço cadastrado para nenhum sabor não aparecem; sabores sem preço para o tamanho selecionado não aparecem.
- Clicar e desclicar sabor funciona com `maxFlavors = 1` e `> 1`.
- Carrinho recebe rótulo "1/N Nome (R$ x,xx)".
