# Pedidos de demonstração para a Burguer Prime

Criar pedidos fictícios apenas para a loja **Burguer Prime**, cobrindo as três etapas do fluxo operacional: novos, em preparo e prontos. Nenhuma outra loja é afetada.

## O que será criado

9 pedidos, com clientes, itens reais do cardápio da loja e horários recentes (últimos 90 minutos):

- **Novos (3)** — aguardando aceite
  - Entrega, Pix online, ~R$ 55
  - Retirada, Dinheiro (troco), ~R$ 40
  - Entrega, Cartão na entrega, ~R$ 130
- **Em preparo (3)** — já aceitos
  - Entrega, Pix online, ~R$ 65
  - Consumo local (mesa), Pix na entrega, ~R$ 45
  - Entrega, Dinheiro, ~R$ 78
- **Prontos (3)**
  - Retirada → status "pronto para retirada", ~R$ 33
  - Entrega → status "saiu para entrega", ~R$ 92
  - Consumo local → status "servido", ~R$ 27

Cada pedido terá itens do cardápio existente (Classic Burger, Bacon Supreme, Double Cheddar, Combo Classic, Batata Frita, Refrigerante, Milkshake, Brownie etc.), com quantidades e observações variadas, endereço de entrega em bairros de Parnaíba e histórico de status coerente com a etapa.

## Detalhes técnicos

- Inserção de dados (não é mudança de estrutura): `orders`, `order_items` e `order_status_history` para `tenant_id = 11111111-1111-1111-1111-111111111111`.
- Numeração continua a partir do maior `number` atual da loja (1001 já existe → começa em 1002).
- Campos preenchidos de forma consistente: `subtotal`, `delivery_fee`, `total`, `payment_status`, `payment_label`, `accepted_at` para os aceitos, `address` em pedidos de entrega, `table_label` em consumo local.
- Sem alteração de código; os pedidos aparecem direto em `/admin/pedidos` e no dashboard da loja.

## Observação

São dados de teste. Quando quiser, apago todos eles em um único passo.
