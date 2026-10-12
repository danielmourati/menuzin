# Caixa: textos claros na prestação de contas dos entregadores

## Problema
No detalhe do turno fechado (Caixa > Turnos anteriores > Entregadores) os rótulos são vagos:
"Valor a devolver", "Taxas do entregador", "Acerto pendente" e "Taxas não pagas".
Não dizem de quem é o dinheiro, nem o que fazer. A aba Entregadores do turno aberto já é mais clara
("Deve entregar ... ao retornar", "Taxas a pagar ao entregador", "Marcar acerto recebido"),
então os dois lugares usam palavras diferentes para a mesma coisa.

## Proposta (só textos e organização do card, sem mudar cálculos)

Cada entregador no detalhe do turno ganha dois blocos com títulos explícitos:

```text
Júlio César                              [Dinheiro NÃO conferido]
11 entregas · 3 pagas em dinheiro

DINHEIRO DAS ENTREGAS (entregador -> caixa)
  Cobrado dos clientes ........ R$ 148,00   (total dos 3 pedidos)
  Troco levado do caixa ....... R$  52,00
  Dinheiro a devolver ao caixa  R$ 200,00   (notas recebidas)
  [Dinheiro NÃO devolvido]  ou  [Devolvido em 11/10 17:54]

TAXAS DE ENTREGA (loja -> entregador)
  11 entregas · a receber ..... R$  93,50
  [Taxas AINDA NÃO PAGAS]  ou  [Taxas pagas em Pix/dinheiro em 11/10 17:54]
```

Renomeações:
- "Valor a devolver" -> "Dinheiro a devolver ao caixa" (com linha de apoio: "notas recebidas dos clientes, incluindo o troco levado").
- "Taxas do entregador" -> "Taxas de entrega a receber".
- "Acerto pendente" -> "Dinheiro não devolvido" / "Acerto recebido" -> "Dinheiro devolvido em dd/mm hh:mm".
- "Taxas não pagas" -> "Taxas a pagar ao entregador" / "Taxas pagas em Pix|dinheiro em dd/mm hh:mm".
- Cada selo ganha uma dica (tooltip) de uma frase explicando o significado.
- Entregador sem pedido em dinheiro: "Sem dinheiro a devolver (todas as entregas foram Pix/cartão)".
- Botão da aba aberta "Marcar acerto recebido" -> "Confirmar dinheiro recebido do entregador"; toast "Acerto registrado." -> "Dinheiro do entregador conferido.".

Detalhe do turno fechado: adicionar uma linha por entrega (pedido, bairro, forma de pagamento, taxa),
igual à lista da aba aberta, para mostrar de onde sai o R$ 93,50 e o R$ 200,00
(lista dos pedidos em dinheiro com "total / nota do cliente").

## Detalhes técnicos
- `src/routes/admin.caixa.tsx`: textos das linhas ~228-262 (aba aberta) e ~420-436 (detalhe fechado);
  tooltip via componente já existente em `@/components/ui/tooltip`.
- Os dados `to_collect`, `change_out`, `must_return`, `fees_total`, `deliveries` já vêm de `computeSession`
  em `src/lib/cash.functions.ts`; confirmar que `getClosedCashSessionDetail` repassa `to_collect`/`change_out`
  e a lista de entregas ao detalhe (se não, apenas incluir os campos).
- Sem migração e sem mudança de regra de cálculo.

## Pergunta em aberto
Os nomes finais acima são sugestão; se preferir outro vocabulário (por exemplo "Prestação de contas"
no lugar de "Dinheiro a devolver"), ajusto antes de implementar.
