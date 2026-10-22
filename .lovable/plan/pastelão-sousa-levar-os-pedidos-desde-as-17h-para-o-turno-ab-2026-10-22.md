# Pastelão Sousa: levar os pedidos desde as 17h para o turno aberto

## O que os dados mostram
- Turno aberto hoje às **23:14** (Fortaleza). Antes dele houve um turno aberto e fechado em 4 minutos (22:54 → 22:58), sem pedidos.
- Pedidos finalizados desde as 17h: **#1150 a #1158** (9 pedidos).
- **#1151, #1152, #1153, #1155, #1156, #1157 e #1158** já estão no turno aberto, porque foram finalizados depois das 23:14.
- Ficaram de fora 2 pedidos, finalizados antes da abertura do turno:
  - **#1150**: entrega com Júlio César, Dinheiro, R$ 65,00, taxa de R$ 11,00 (finalizado às 20:03).
  - **#1154**: consumo no local, Dinheiro, R$ 20,00 (finalizado às 22:19).

## Correção
- Mudar o horário de abertura do turno aberto para **hoje, 17:00**. O Caixa já conta todo pedido criado, despachado ou finalizado dentro do turno, então os 9 pedidos passam a contar nele.
- Resultado esperado no turno aberto:
  - Dinheiro de vendas: soma +R$ 85,00 (#1150 e #1154).
  - Júlio César: mais 1 entrega em dinheiro (R$ 65,00 a devolver) e mais R$ 11,00 de taxa. Ao todo, 6 entregas com R$ 44,75 de taxas.
- O turno de 4 minutos (22:54 → 22:58) fica dentro do novo horário, mas não tem pedidos nem sangrias, então nada é contado em dobro. Vou confirmar isso antes de mudar.
- Não muda nenhum código, só o horário de abertura desse turno.

## Verificação
- Conferir pelo banco que o turno de 4 minutos não tem sangrias nem acertos.
- Abrir Caixa > Turno aberto e confirmar que aparecem os 9 pedidos e que Júlio César tem 6 entregas com R$ 44,75 de taxas.
