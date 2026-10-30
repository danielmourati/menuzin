# Ajustes de comanda, busca e PDV

## 1. Remover "Monte o seu (até N Sabores):" da comanda e do painel
Hoje cada sabor sai como `Monte o seu (até 2 Sabores): Frango`. Passa a sair só o sabor, agrupado sob um cabeçalho "Sabores:", como já acontece com grupos "Escolha N sabores":
```text
2x Pastel 2 Sabores (Pequeno)
   Sabores:
   Frango
   Queijo Coalho
```
Vale para comanda da cozinha, cupom do cliente, pré-visualizações e detalhes do pedido no painel (inclusive pedidos já feitos, pois é só a forma de exibir).

## 2. Busca de produtos sem acentos
"pastel de camarao" encontra "Pastel de Camarão" (e vice-versa). Aplica na busca do PDV (lista e janela F2), na loja online e nas listas "Aplicar a produtos específicos" de Adicionais/Observações.

## 3. Desconto no fechamento do PDV
Campo "Desconto" com opção R$ ou %, abaixo do subtotal. Mostra subtotal, desconto, taxa e total atualizados; troco recalculado sobre o novo total. O desconto nunca passa do subtotal e sai impresso no cupom. O servidor valida e recalcula o valor.

## 4. Enter avança para o próximo campo (PDV)
Nos campos de cliente, telefone, mesa, endereço, observação e desconto, Enter pula para o próximo campo. No último campo, Enter não lança o pedido sozinho (evita lançamento acidental).

## 5. Limpar busca e voltar o foco após lançar item
Ao adicionar um item ao pedido (direto ou após personalizar), a busca é limpa e o cursor volta para ela, pronta para o próximo item.

## 6. Endereço avulso no delivery do PDV
Na janela de endereço, opção "Digitar endereço livre": um campo de texto único (ex.: "Rua X, 120, perto do mercado"), sem exigir CEP/bairro. Taxa de entrega fica manual nesse caso. O texto sai na comanda, no painel e no acompanhamento.

## Detalhes técnicos
- `src/lib/receipt-item-details.ts`: `isFlavorGroup` passa a reconhecer `/^monte\s+(o\s+)?seu/`; o painel (detalhe do pedido) usa o mesmo helper ou mesma regra.
- Helper `normalizeSearch` (NFD + remove diacríticos + lower) em `src/lib/utils.ts`, usado em `admin.pdv.tsx`, `ProductFinderModal.tsx`, `$slug.tsx`, `admin.adicionais.tsx`, `admin.observacoes.tsx`.
- `ManualOrderInput` ganha `discount_amount` (>=0); `createManualOrder` limita a subtotal e grava em `discount_amount`, total = subtotal − desconto + taxa. Sem migração (coluna já existe).
- Enter: handler `onKeyDown` que foca o próximo elemento `[data-pdv-field]` em ordem.
- Endereço livre: `address = { free_text, street: free_text }` com validação relaxada quando `free_text` existe; builders de comanda exibem `free_text` quando presente.
- Testes Bun para: regra de sabores "Monte o seu", busca sem acento e limite do desconto.
