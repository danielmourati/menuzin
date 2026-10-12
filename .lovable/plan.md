# Corrigir a largura e simplificar os itens dos cupons de 55mm e 80mm

## O que foi confirmado
- A impressão das fotos é feita por USB com QZ Tray.
- O cálculo atual usa **24 colunas** quando a fonte está configurada como grande. Na cozinha, a opção dupla divide essa largura novamente, podendo resultar em **12 colunas**, em vez de 16.
- O cupom completo usa os campos de fonte diretamente, enquanto a visualização e o teste do Caixa respeitam a opção de tipografia padrão. Isso permite diferenças entre o teste e a impressão do pedido.
- O envio pelo QZ Tray não define explicitamente a fonte ou o tamanho antes de cada cupom completo. A cozinha reinicializa a impressora e alterna o tamanho, mas não seleciona explicitamente a fonte.

Essas divergências foram confirmadas no código. A configuração salva da impressora das fotos e sua capacidade física ainda precisam ser conferidas; não é possível atribuir toda a falha a uma delas apenas pelas imagens.

## Ajuste proposto
1. Conferir a configuração da impressora usada nas fotos e reproduzir o cálculo de largura do cupom completo e da cozinha, sem alterar pedidos ou valores.
2. Aplicar o padrão de **32 caracteres por linha na fonte normal** e **16 na fonte de largura dupla** para os cupons de 55mm. Evitar que uma configuração antiga de fonte grande reduza a largura novamente antes da duplicação.
3. Fazer a fonte enviada à impressora corresponder à largura usada na montagem do texto. Reinicializar e selecionar explicitamente fonte, alinhamento e tamanho em cada impressão, evitando herdar o estado do cupom anterior.
4. Unificar a largura e a tipografia entre visualização, teste, impressão automática e reimpressão. Manter a opção de fonte dupla da cozinha, os separadores e a regra de uma via na reimpressão manual.
5. Ajustar as quebras de nomes, tamanhos, adicionais e observações para a largura efetiva. Não truncar informações; manter continuação alinhada e evitar letras isoladas quando a palavra inteira puder ir para a próxima linha.
6. Melhorar o teste de impressão existente com uma régua de 32 caracteres e outra de 16 em fonte dupla, além de itens semelhantes aos das fotos.

## Layout compacto dos itens — toda a plataforma
- Aplicar o mesmo padrão de organização a todas as lojas, em papel de **55mm e 80mm**, tanto no cupom simplificado da cozinha quanto no cupom completo de conferência.
- **Cozinha: manter sem preços**, conforme confirmado. Imprimir quantidade e nome juntos, em negrito e alinhados à esquerda, por exemplo **1x Carne**. Preservar a opção de tamanho duplo.
- **Cupom completo:** destacar em negrito quantidade, nome, valor unitário e total do item, todos alinhados à esquerda. Manter os valores próximos do nome; usar uma linha complementar curta quando não couberem juntos, sem repetir um cabeçalho de tabela distante dos itens.
- Abaixo de cada item, reunir tamanho, sabores, complementos e observações em um único bloco compacto, em fonte normal. Usar marcadores por detalhe, sem linhas em branco ou repetição de “+ 1x Adicionais (Grátis)”. Manter rótulos curtos quando necessários para distinguir tamanho, sabor, borda ou uma instrução como “Sem cebola”.
- Listar as escolhas de complementos e observações abaixo do item, com quebra apenas quando necessária pela largura. Remover rótulos redundantes, mas nunca remover o conteúdo das instruções.
- A seleção completa de um grupo de adicionais já é registrada pelo formulário como **[Todos os adicionais]**. Nos cupons, apresentar essa seleção somente como **Todos os adicionais**, sem colchetes, nome redundante do grupo ou lista individual. Preservar outros grupos, tamanho, sabores e observações. Não converter listas de observações nem seleções antigas sem esse marcador em “Todos os adicionais”.
- Preservar a identificação e os valores dos complementos pagos no cupom completo, sem somá-los novamente ao preço unitário. Na cozinha, mostrar apenas suas descrições.
- Manter separadores entre os itens, com a largura exata do modo ativo. O negrito não deve ampliar a largura dos caracteres; desligá-lo antes dos detalhes e do próximo bloco.
- Usar bullet quando a impressora suportar sua codificação; caso contrário, usar hífen como marcador para evitar caracteres incorretos.

### Exemplo de organização
No cupom da cozinha, a primeira linha estará em negrito:
```text
1x Carne
 - Tamanho: Grande
 - Azeitona
 - Ervilha
 - Milho
 - Sem cebola
--------------------------------
1x Frango
 - Tamanho: Pequeno
 - Todos os adicionais
--------------------------------
```
No cupom completo, quantidade/nome e a linha financeira estarão em negrito e à esquerda:
```text
1x Carne
Unit: 15,00  Total: 15,00
 - Tamanho: Grande
 - Todos os adicionais
--------------------------------
```
As quebras serão adaptadas à largura real, sem cortar detalhes.

## Verificação
- Testar cupons de 55mm em fonte normal e dupla, incluindo “Calabresa Mineira”, “Tamanho: Pequeno”, adicionais e observações longas.
- Conferir que separadores tenham a largura correta e que nenhuma linha ultrapasse a quantidade de colunas ativa.
- Verificar os comandos enviados e a consistência entre prévia e impressão, incluindo dois trabalhos consecutivos com fontes diferentes.
- Preservar a capacidade de colunas de 80mm, aplicando também o layout compacto, e verificar ausência de regressões nas cópias automáticas e reimpressões.
- Conferir os controles e a prévia na tela. A confirmação física exigirá imprimir o teste na sua mini impressora e conferir o resultado; não será apresentada como concluída apenas com testes de código.
- Testar Carne e Frango como nas imagens, vários complementos gratuitos, complementos pagos, quantidade maior que um, observações longas e a escolha explícita “Todos os adicionais”. Conferir que as instruções permanecem completas e que os totais não mudam.
- Verificar negrito e alinhamento à esquerda na prévia e nos comandos de impressão; detalhes em fonte normal e cozinha sem preços. Comparar a redução de linhas com o layout anterior.

## Detalhes técnicos
- Centralizar a resolução da tipografia efetiva e das colunas, evitando regras divergentes nos chamadores de `columnsFor`.
- Ajustar `printer-types`, os builders de cupom/cozinha, os helpers de impressão e o teste do modal conforme essa resolução compartilhada.
- Compartilhar a organização dos detalhes entre `receipt-builder` e `kitchen-ticket`, respeitando as diferenças de conteúdo financeiro. Representar destaque separadamente do texto para que a prévia renderize negrito sem exibir comandos de impressora e o cálculo de colunas conte somente caracteres visíveis.
- Reconhecer o marcador persistido “[Todos os adicionais]” após o parsing do grupo e manter a alteração restrita à apresentação dos cupons, sem mudar as escolhas ou os dados gravados dos pedidos. Não alterar a união de itens do carrinho.
- Usar comandos ESC/POS compatíveis com o perfil da mini impressora. Não presumir suporte real a uma fonte só porque ela existe na prévia HTML.
- Não alterar preços, taxas, dados de pedidos, certificados ou conexão do QZ Tray.