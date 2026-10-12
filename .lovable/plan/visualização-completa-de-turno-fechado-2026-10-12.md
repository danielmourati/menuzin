# Visualização completa de turno fechado

## O que muda
- Cada linha em **Turnos anteriores** ficará clicável e terá uma ação **Ver detalhes**.
- Ao abrir, uma janela com rolagem mostrará o período do turno e quem o abriu.
- **Esperado** e **Contado** aparecerão em dois blocos lado a lado, com valores grandes e o resultado logo abaixo: **Bateu**, **Sobra** ou **Falta**.
- O resumo financeiro explicará o esperado com:
  - fundo inicial;
  - vendas em dinheiro;
  - sangrias;
  - total esperado;
  - valor contado e diferença.
- A janela mostrará as **sangrias detalhadas**, com horário, valor e motivo.
- A seção **Entregadores** mostrará, para cada entregador do turno, entregas, valor a devolver, taxas e situação dos acertos/pagamentos.
- A lista principal continuará compacta, mas “Esperado” e “Contado” terão hierarquia visual mais clara e se adaptarão ao celular.

## Comportamento
- O detalhe será apenas para consulta: um turno fechado não poderá ser alterado.
- Enquanto os dados são carregados, a janela mostrará um indicador de carregamento; falhas terão mensagem e opção de tentar novamente.
- Se não houver sangrias ou entregadores, a seção correspondente mostrará um estado vazio claro.

## Detalhes técnicos
- Criar uma consulta autenticada por `session_id`, limitada à loja selecionada e a turnos com status fechado.
- Reaproveitar o cálculo existente do turno usando o período real de abertura e fechamento para reconstruir sangrias e entregadores.
- Usar os totais gravados no fechamento como fonte do resumo financeiro, preservando exatamente o resultado histórico exibido hoje.
- Adicionar o modal de detalhes em `src/routes/admin.caixa.tsx`, carregando os dados somente ao abrir.
- Sem alteração no banco: os campos financeiros do fechamento, movimentos e acertos necessários já estão armazenados.

## Validação
- Conferir um turno com sobra/falta e validar que Esperado, Contado e diferença coincidem com a lista atual.
- Conferir detalhes de sangrias e entregadores do mesmo período.
- Testar janela e lista em desktop e celular, incluindo turnos sem sangrias ou sem entregadores.
