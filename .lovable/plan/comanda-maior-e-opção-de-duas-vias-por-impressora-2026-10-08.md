# Comanda maior e opção de duas vias por impressora

## Resultado esperado
- Nas opções avançadas de cada impressora de produção, adicionar **Fonte dupla na comanda**.
- Quando ativada, a comanda simplificada usa o tamanho ESC/POS duplo para cabeçalho, número, itens, adicionais e observações; o rodapé volta ao tamanho normal.
- O cabeçalho terá duas linhas grandes, conforme escolhido:
  1. **DELIVERY**, **RETIRADA** ou **CONSUMO**, de acordo com o pedido.
  2. **PEDIDO #123**, logo abaixo.
- Adicionar **Imprimir duas vias do novo pedido** por impressora. Desativada por padrão.
- A segunda via será emitida somente na impressão automática do pedido novo. O botão de reimpressão continuará gerando uma via, evitando duplicação acidental.

## Implementação
1. **Configuração por impressora**
   - Incluir as opções `double_kitchen_font` e `duplicate_new_order` nas personalizações da impressora.
   - Validar e salvar ambas no campo de personalização já existente de cada impressora; não será necessária uma nova tabela ou coluna.
   - Exibir os dois controles em **Opções avançadas** para impressoras de produção, com textos claros sobre o efeito de cada opção.

2. **Layout da comanda**
   - Corrigir o comando de fonte grande, que hoje usa o mesmo código da fonte normal.
   - Ajustar a largura de quebra das linhas quando a fonte dupla estiver ativa para não cortar nomes, adicionais ou observações.
   - Trocar o título fixo “COZINHA” pelo título da modalidade e manter o número do pedido grande logo abaixo.
   - Preservar agendamento, mesa/cliente, itens, observações e data já impressos atualmente.

3. **Impressão automática em duas vias**
   - Aplicar a preferência na impressão automática por QZ Tray e por Bluetooth.
   - Enviar as duas vias como trabalhos completos e sequenciais, preservando avanço e corte entre elas.
   - Manter o aceite do pedido independente de eventual falha na impressão, como já ocorre hoje.

4. **Consistência dos caminhos de impressão**
   - Centralizar a montagem da comanda e o envio de cópias para que impressão automática, manual, QZ Tray e Bluetooth usem o mesmo layout.
   - A impressão manual respeitará a fonte dupla, mas sempre emitirá uma única via.

## Validação
- Testar os três títulos: DELIVERY, RETIRADA e CONSUMO.
- Conferir pedidos com nomes longos, tamanhos, sabores, adicionais e observações em bobinas de 58 mm e 80 mm.
- Confirmar uma via com o controle desligado e duas vias apenas no pedido novo com o controle ligado.
- Conferir os fluxos QZ Tray e Bluetooth, além do salvamento e reabertura das opções avançadas.
- Verificar que o projeto continua compilando sem erros.
