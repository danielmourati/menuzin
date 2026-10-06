# Fechar o "Onde você está?" e reaproveitar o endereço do cálculo da taxa

## 1. Botão fechar (X) do modal "Onde você está?"
- Hoje o X aparece, mas o modal só deixa fechar quando já existe uma cidade salva. Na primeira visita, o toque no X é ignorado.
- Correção: o X (e o Esc / toque fora) sempre fecha. Ao fechar, o aparelho fica marcado como "já perguntado", para o modal não reabrir a cada visita. O visitante pode informar o CEP depois pelo seletor de cidade do Guia.

## 2. Endereço do cálculo de taxa como sugestão no endereço de entrega
- Ao calcular a taxa pelo CEP no topo da loja, guardar também rua, cidade e estado (hoje só guarda CEP e bairro).
- No carrinho, em "Entregar", preencher CEP, rua, bairro, cidade e estado com esse endereço. Número, complemento e referência continuam para o cliente digitar.
- Prioridade: o endereço calculado na loja vale mais que o endereço salvo de pedidos anteriores (é a escolha mais recente). Se o cliente mudar o CEP no carrinho, segue o fluxo normal.
- Quando a escolha foi por região (sem CEP), sugerir apenas o bairro/região, como hoje.

## Detalhes técnicos
- `CepGateDialog.tsx`: remover bloqueio por `dismissible` no `onOpenChange`/`onInteractOutside`/`onEscapeKeyDown`; ao fechar sem resolver, `writeCustomerProfile({ cepAsked: true })`.
- `receive-pref.ts`: adicionar `street`, `city`, `state` ao tipo; `ReceiveModeBar` grava `a.logradouro/localidade/uf`.
- `CartDrawer.tsx`: mesclar os dois efeitos de preenchimento — aplicar o perfil e, em seguida, sobrescrever os campos de endereço com a preferência quando `pref.mode === "entrega"` e `pref.cep` existir (limpando número/complemento se o CEP divergir do salvo).
- Verificar no navegador: fechar o modal na home; calcular taxa por CEP numa loja e abrir o carrinho.
