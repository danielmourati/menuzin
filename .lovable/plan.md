# Investigação: caixa de 24/10 e taxa zerada do #1272 (Pastelão Sousa)

## O que encontrei

**1. Dia 24/10 sem caixa**
- Houve 11 pedidos em 24/10 (das 18:02 às 22:53, horário de Brasília), somando R$ 486,75.
- Nenhum turno de caixa foi aberto nesse dia. O turno de 23/10 foi fechado à 23:12 do próprio dia 23; o próximo foi aberto só em 25/10 às 18:10.
- O relatório do caixa só lista turnos que existiram, e cada turno só soma os pedidos feitos entre a abertura e o fechamento. Por isso o dia 24 não aparece, embora o relatório geral de vendas (anexo 1) conte esses pedidos.

**2. Pedido #1272 com taxa R$ 0,00**
- Entrega para Rua Guaporé, Pindorama, **sem número**. O pedido não registrou de onde veio a taxa (no #1271, logo antes, registrou "por distância", R$ 9,75).
- A loja calcula a taxa por KM, e esse cálculo só roda quando rua e número estão preenchidos. Sem número, a taxa não foi calculada e o checkout mandou 0.
- Hoje o servidor aceita a taxa que o checkout envia, sem recalcular. Então qualquer falha no cálculo vira entrega grátis.

## O que vou fazer

**Correção dos dados**
1. Criar um turno de caixa retroativo e já fechado para 24/10 (18:00 às 23:59 em Brasília), identificado como "Turno retroativo (criado pelo suporte)", sem fundo inicial e com valor contado igual ao esperado. Assim o dia aparece no histórico com seus 11 pedidos.
2. Recalcular a taxa do #1272 pela distância até Rua Guaporé, Pindorama, usando a mesma regra da loja, e atualizar a taxa e o total do pedido. O pagamento é na maquininha e ainda não foi cobrado, então nada é estornado. Vou informar o valor encontrado antes de gravar, se der algum valor fora do normal.
3. Procurar outros pedidos de entrega com taxa zerada e origem vazia em lojas que cobram taxa, e listar para você.

**Para não repetir**
4. Servidor passa a recalcular a taxa de entrega na criação do pedido e ignora o valor enviado pelo checkout. Se não conseguir calcular, recusa o pedido com "Não conseguimos calcular a taxa para este endereço".
5. Checkout bloqueia avançar com entrega quando o número estiver vazio ou a taxa ainda estiver carregando, inclusive ao usar endereço salvo.
6. Na tela de Caixa, mostrar aviso "Há pedidos fora de turno" com a lista de dias com vendas sem turno aberto, e um botão para o administrador criar o turno retroativo.

## Detalhes técnicos
- Dados: insert em `cash_sessions` (status closed, opened_at 2026-10-24 21:00Z, closed_at 2026-10-25 02:59Z); update em `orders` #1272 (`delivery_fee`, `delivery_fee_full`, `delivery_fee_source='distance_km'`, `total`).
- `createOrder` em `orders.functions.ts`: chamar o mesmo resolvedor de `resolveDeliveryFee` no servidor e usar seu resultado.
- `CartDrawer.tsx`: exigir `number` e `!feeLoading && feeResolution?.available` antes de seguir/finalizar.
- `cash.functions.ts`: nova consulta de dias com pedidos fora de qualquer turno + função admin para criar turno retroativo.
- Testes: taxa recalculada no servidor ignora valor do cliente; pedido sem taxa calculável é recusado.
