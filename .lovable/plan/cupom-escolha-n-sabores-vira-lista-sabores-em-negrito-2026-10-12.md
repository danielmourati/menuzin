# Cupom: "Escolha N sabores" vira lista "Sabores:" em negrito

## Contexto confirmado
- O texto `Escolha 2 sabores:` não está no código — é o **nome de grupos de adicionais** no banco do tenant (Pastelão Sousa: "Escolha 2/3/4/5 sabores", min = max = N).
- No cupom, `receiptItemDetails` imprime cada item como `<nome do grupo>: <opção>` (ex.: `Escolha 2 sabores: Calabresa`), em fonte normal.
- Consumidores dos detalhes: apenas `src/lib/receipt-builder.ts` (cupom completo) e `src/lib/kitchen-ticket.ts` (comanda da cozinha), ambos compartilham `receiptItemDetails` de `src/lib/receipt-item-details.ts`.

## O que muda
Formato novo, nos dois cupons (55mm e 80mm), para grupos de sabores:

```text
Sabores:
- Calabresa
- Mussarela
```

Tudo em **negrito** (ESC_BOLD_ON), inclusive o cabeçalho "Sabores:". O bloco aparece logo após o nome do item e antes dos demais complementos/observação. O formato atual não repete o nome do grupo em cada linha.

## Implementação

1. `src/lib/receipt-item-details.ts`
   - Nova função `receiptFlavorBlock(item)` que agrupa os addons cujo nome do grupo corresponde a `Escolha N sabores` ou `Sabores` (comparação sem acentos/maiúsculas; regex `^escolha\s+\d+\s+sabores$` ou `^sabores$`) e retorna:
     - `header`: `"Sabores:"`
     - `lines`: `["- Calabresa", "- Mussarela", ...]` (cada opção em sua linha, sem repetir o nome do grupo).
   - `receiptItemDetails` passa a **ignorar** esses grupos (para não imprimir duas vezes) e continua exatamente igual para todo o resto — inclusive o caso especial `[Todos os adicionais]` e os sabores de pizza (`Sabor: X`), que não mudam.

2. `src/lib/receipt-builder.ts` (cupom completo)
   - No bloco do item: nome em negrito (como hoje) → bloco de sabores em negrito via `receiptFlavorBlock` → demais detalhes em fonte normal → `Unit/Total` em negrito na última linha (como hoje).
   - Linhas longas de sabor quebram com recuo pendente alinhado ao bullet (usa `wrapIndent` existente).

3. `src/lib/kitchen-ticket.ts` (comanda da cozinha)
   - Mesmo bloco em negrito no lugar onde hoje imprime os detalhes; cozinha continua sem preços.

4. `scripts/receipt-layout-tests.mjs`
   - Novo item de teste com addons `Escolha 2 sabores: Calabresa` e `Escolha 2 sabores: Mussarela`:
     - `plain` contém `Sabores:`, `- Calabresa`, `- Mussarela`;
     - não contém `Escolha 2 sabores`;
     - há span em negrito contendo `Sabores:` (via `parsePrintSpans`);
     - largura de todas as linhas continua ≤ colunas (32/42/56) e a comanda em dupla continua dentro do limite.
   - Testes existentes permanecem verdes.

## Verificação
- `bun scripts/receipt-layout-tests.mjs` e `bun scripts/product-selection-tests.mjs`.
- Prévia no navegador (`/admin/configuracoes/impressora`, cupom e cozinha, 55mm e 80mm) confirmando o bloco em negrito.
- Build sem erros (`/tmp/observability/build-errors.log`).

## Fora de escopo
- Renomear os grupos no banco (continuam "Escolha N sabores" no admin/cardápio — só a impressão muda).
- Sabores de pizza (`Sabor: X`) mantêm o formato atual.
- Registro em `mem://features/receipt-layout.md` atualizado após aprovação.
