# Liberar a correção da Rua no endereço de entrega

## O que muda
- O campo **Rua** volta a aceitar edição. Ele continua sendo preenchido sozinho pelo CEP, mas o cliente pode completar ou corrigir o nome (ex.: "R. Treze" para "Rua Treze de Maio").
- O campo **Bairro** continua travado quando o CEP traz o bairro, porque ele define a taxa de entrega. Se o CEP não trouxer bairro (CEPs gerais de cidade pequena), o campo é liberado para o cliente digitar.
- O aviso abaixo dos campos passa a dizer: "Preenchemos rua e bairro pelo CEP. Se o nome da rua vier incompleto, você pode corrigir."
- Para lojas com taxa por km, a taxa é recalculada com a rua corrigida (já acontece hoje sempre que a rua muda).

## Detalhes técnicos
- `CartDrawer.tsx` (~linha 1290): remover `readOnly` e o estilo `cursor-not-allowed bg-muted/40` do input de Rua.
- Input de Bairro (~linha 1353): `readOnly` só quando o último lookup do CEP retornou bairro (novo estado `cepHasNeighborhood`, setado no handler de busca do CEP ~linha 442).
- Atualizar o texto de ajuda (~linha 1362).
- Verificar no navegador: digitar CEP, editar a rua, e conferir que o pedido salva a rua corrigida.
