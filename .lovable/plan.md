# Ajustar tamanho, valores e cabeçalho dos cupons

## Alterações
- Aplicar a todas as lojas, nos cupons de 55mm e 80mm, tanto para pedidos do cliente quanto para pedidos lançados no PDV.
- Mover o tamanho escolhido para junto do nome: **1x Carne (GRANDE)** ou **1x Carne (PEQUENO)**. Quantidade, nome e tamanho ficam em negrito, alinhados à esquerda.
- Remover a linha separada “Tamanho:”. Produtos sem tamanho continuam mostrando somente quantidade e nome.
- Manter complementos e observações abaixo do nome, com os marcadores compactos atuais.
- No cupom completo, mover **Unit: 9,00  Total: 18,00** para a última linha de cada item, após complementos e observações e antes do separador, mantendo negrito. Quando a largura não permitir uma linha única, quebrar os valores sem ultrapassar o papel.
- Destacar **DELIVERY** ou **RETIRADA** no cabeçalho do cupom completo e manter o destaque grande da comanda da cozinha. Preservar **CONSUMO** para pedidos no local.
- A comanda da cozinha continua sem preços de itens, conforme a escolha anterior.

## Detalhes técnicos
- Centralizar a extração do tamanho e a composição do nome em `src/lib/receipt-item-details.ts`, reutilizando a interpretação de tamanhos já existente.
- Ajustar `receipt-builder.ts` para separar nome, detalhes e valores; ajustar `kitchen-ticket.ts` para usar o mesmo nome com tamanho, respeitando as colunas disponíveis em fonte normal ou dupla.
- Preservar os dados e preços registrados, totais, impressão automática e quantidade de vias; as mudanças são somente de apresentação e valem também para prévias e reimpressões.

## Verificação
- Atualizar e executar os testes de cupons com tamanhos Pequeno/Grande, itens sem tamanho, nomes longos, complementos, observações e “Todos os adicionais”.
- Conferir ordem das linhas, negrito e ausência de “Tamanho:” separado nos dois cupons, em 55mm/80mm e fonte normal/dupla.
- Conferir as prévias e o cabeçalho para entrega, retirada e consumo local. A impressão física deverá ser confirmada na impressora pelo botão “Imprimir teste”.