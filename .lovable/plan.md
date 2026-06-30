## Plano

1. **Corrigir a fonte de verdade dos tamanhos visíveis no storefront**
   - No modal do cliente, exibir somente tamanhos de pizza que tenham preço real cadastrado para pelo menos um sabor listado.
   - Reforçar a regra para ignorar tamanhos sem vínculo/preço configurado, evitando que apareçam como `R$ 0,00`.

2. **Corrigir o preço exibido em cada sabor**
   - Quando o tamanho selecionado aceitar até 2 sabores, mostrar cada sabor como `1/2` do preço cheio: exemplo `R$ 62,00` vira `R$ 31,00`.
   - Quando aceitar até 3 sabores, mostrar `1/3` do preço cheio.
   - Generalizar para `1/N`, usando o limite do tamanho selecionado como divisor visual esperado no fluxo de montagem.

3. **Corrigir o cálculo final da pizza fracionada**
   - Manter o total como soma das frações dos sabores escolhidos.
   - Para 2 sabores: `sabor A / 2 + sabor B / 2`.
   - Para 3 sabores: `sabor A / 3 + sabor B / 3 + sabor C / 3`.
   - Se escolher apenas 1 sabor em um tamanho que aceita 2, o valor será o preço cheio do sabor único, para não cobrar meia pizza quando ela não está fracionada.

4. **Ajustar textos/resumo do carrinho**
   - Incluir a fração correta na descrição do sabor (`1/2`, `1/3`, etc.) quando a pizza for fracionada.
   - Garantir que o preço salvo no item do carrinho corresponda exatamente ao valor apresentado no modal.

5. **Adicionar teste automatizado de regressão**
   - Criar/atualizar teste cobrindo:
     - tamanho sem preço não deve aparecer;
     - sabor com preço cheio `62` em tamanho até 2 sabores deve renderizar/cobrar `31` por sabor quando fracionado;
     - tamanho até 3 sabores deve dividir por 3;
     - desmarcar sabor continua funcionando.