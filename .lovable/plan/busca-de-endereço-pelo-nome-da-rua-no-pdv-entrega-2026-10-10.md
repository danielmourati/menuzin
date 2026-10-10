# Busca de endereço pelo nome da rua no PDV (entrega)

## O que muda
- No PDV, ao escolher **Entrega** e abrir "Endereço de Entrega", o campo **Endereço (Rua/Av)** passa a sugerir ruas enquanto o atendente digita (a partir de 3 letras), sem precisar do CEP.
- A busca é sempre na **cidade/UF da loja**, então só aparecem ruas de onde a loja entrega.
- Cada sugestão mostra: Rua, Bairro e CEP. Ao tocar numa sugestão, o formulário preenche **Rua, Bairro, CEP, cidade e UF**, e o foco vai para **Número**. A taxa de entrega é recalculada na hora, como já acontece com o CEP.
- Se a rua tiver vários CEPs/bairros, aparecem todas as opções (até 10), ordenadas pela melhor correspondência.
- Estados do campo: "Buscando…", "Nenhuma rua encontrada. Digite manualmente" e "Falha na busca. Digite manualmente". O atendente sempre pode digitar rua e bairro à mão.
- Quem já sabe o CEP continua digitando o CEP normalmente (preenche tudo como hoje).
- No celular, a lista de sugestões ocupa a largura do campo, com itens grandes para toque.

## Regras
- Rua e bairro continuam editáveis; o preenchimento não sobrescreve o que o atendente já digitou no bairro, salvo ao escolher uma sugestão (escolha explícita substitui).
- Se a loja não tiver cidade/UF cadastradas, o campo mostra aviso "Cadastre cidade e UF da loja em Configurações para buscar por rua" e segue manual.
- Sem mudanças no banco, na taxa de entrega nem na criação do pedido.

## Detalhes técnicos
- Só `src/routes/admin.pdv.tsx` é alterado. Reutiliza `searchByAddress` e `rankResults` de `src/lib/viacep.ts` (mesma lógica usada em Taxas de Entrega), com fallback para `searchCepRanges` (`src/lib/cep-ranges.functions.ts`) quando o ViaCEP não retornar.
- `city`/`state` do PDV hoje só são preenchidos por CEP ou rascunho: passam a ser inicializados com os da loja (`tenantData.tenant.city/state`) quando vazios, e o cliente de busca usa esses valores.
- Novo estado `streetResults`/`streetSearchState` com debounce de ~400 ms e cancelamento de buscas antigas; a busca é desligada se o CEP já estiver completo (8 dígitos) ou se a rua foi escolhida por sugestão.
- A lista usa um popover/lista absoluta sob o input (fecha com Esc, clique fora ou seleção), com navegação por setas e Enter no desktop.
- O rascunho automático do PDV continua salvando rua/bairro/CEP/cidade/UF sem mudança.
