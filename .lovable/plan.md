## Plano

Ajustes no fluxo de montagem de pizza fracionada em `src/components/storefront/ProductModal.tsx` e helpers em `src/lib/product-selection.ts`.

### 1. Tornar a escolha de sabores obrigatória até completar o tamanho
- Para tamanhos de pizza com `maxFlavors >= 2` (2, 3 ou 4 sabores), o cliente passa a ser obrigado a selecionar **exatamente** `maxFlavors` sabores — não basta escolher 1.
- Atualizar `pizzaValidations` no modal:
  - Se `selectedPizzaFlavors.length < pizzaMaxFlavors` → erro: `Escolha ${pizzaMaxFlavors} sabores (${n}/${pizzaMaxFlavors})`.
  - Manter o teto em `pizzaMaxFlavors`.
- Bloquear o botão "Adicionar" e exibir contador no título da seção `Sabores` no formato `Escolha ${max} sabores (${n}/${max})`.
- Para tamanhos com `maxFlavors = 1`, manter exigência de exatamente 1 sabor (o próprio produto aberto).

### 2. Ocultar seção de sabores quando o tamanho permite apenas 1 sabor
- Quando o `selectedPizzaSize.maxFlavors === 1`:
  - Não renderizar a seção "Sabores" no storefront.
  - Forçar `flavorIds = [product.id]` automaticamente ao selecionar esse tamanho (o sabor é o próprio produto aberto, sem opção de troca).
  - Garantir que `pizzaValidations` aceite essa seleção implícita como válida.
- Ao trocar para um tamanho com `maxFlavors > 1`, voltar a exibir a seção e limpar `flavorIds` para o cliente escolher manualmente todos os sabores requeridos.

### 3. Resumo e cálculo
- Cálculo de preço continua usando `computeFractionedPizzaPrice` (média dos sabores selecionados) — agora sempre com `n === maxFlavors` quando `maxFlavors > 1`, então o `chargeDivisor` reflete corretamente as frações `1/N`.
- Labels `1/N` no resumo e no item do carrinho permanecem como já implementadas.

### 4. Teste de regressão
- Em `scripts/product-selection-tests.mjs`, adicionar casos:
  - Tamanho `maxFlavors = 1` com 1 sabor selecionado → válido; seção de sabores não deve aparecer (validar via novo helper `requiresExplicitFlavorSelection(size)` em `product-selection.ts`).
  - Tamanho `maxFlavors = 2` com 1 sabor → inválido (`Escolha 2 sabores`).
  - Tamanho `maxFlavors = 3` com 2 sabores → inválido; com 3 → válido e preço = média dos 3.
  - Tamanho `maxFlavors = 4` com 3 sabores → inválido; com 4 → válido.

### Arquivos afetados
- `src/components/storefront/ProductModal.tsx` — validação, auto-seleção e renderização condicional da seção Sabores.
- `src/lib/product-selection.ts` — novo helper para indicar se o tamanho exige seleção explícita e validador compartilhado para tamanho/sabores de pizza.
- `scripts/product-selection-tests.mjs` — novos casos de regressão.
