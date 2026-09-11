# Refatoração estratégica da página “Comece agora”

## Objetivo

Reposicionar o Menuzin como uma plataforma completa de gestão para delivery, mostrando primeiro o valor do painel operacional e da experiência do cliente. A página `/` permanecerá inalterada; toda a refatoração será concentrada em `/comece-agora`.

## Nova narrativa e primeira dobra

- Trocar o título principal por: **“A experiência de um grande app de delivery, sem pagar comissão por pedido.”**
- Usar como apoio: **“Gestão de pedidos em Kanban, impressão automática na cozinha e rastreio em tempo real para o cliente. Assuma o controle do seu delivery.”**
- Manter o teste reverso do Plano Pro como oferta principal: 14 dias grátis, sem cartão e retorno automático ao Presença.
- Usar um CTA principal para abrir o cadastro atual, com texto orientado ao teste do Pro; manter a demonstração da loja apenas como ação secundária discreta, se houver espaço adequado.
- Criar a composição visual com a tela real do Kanban no desktop e o cardápio real no celular, usando as imagens 1 e 5 enviadas, com sombras suaves, sobreposição controlada e leitura clara em celular.
- Preservar os sinais de confiança imediatamente abaixo do CTA.

## Estrutura da página

1. **Faixa de autoridade**
   - Inserir a mensagem “Usado por hamburguerias, pizzarias e restaurantes que não dividem lucro”.
   - Evitar números ou depoimentos não comprovados.

2. **Dores e soluções rápidas**
   - Criar três pontos curtos e escaneáveis: taxas por pedido, operação desorganizada e falta de acompanhamento para o cliente.
   - Conectar cada dor diretamente à resposta oferecida pelo Menuzin, sem textos longos.

3. **Demonstrações aprofundadas com telas reais**
   - Alternar texto e imagem em cada bloco no desktop; empilhar naturalmente no celular.
   - **Cardápio e endereço inteligente:** imagens 5 e 6, mostrando compra moderna, CEP automático e cálculo de entrega.
   - **Rastreio em tempo real:** imagens 7 e 8, mostrando confirmação e acompanhamento do pedido sem instalação.
   - **Coração da operação:** imagens 1 e 9, destacando Kanban, modalidades, detalhes do pedido e controle do fluxo.
   - **Automação e precificação:** imagens 3 e 4, mostrando taxas configuráveis, aceite automático e impressoras separadas.
   - Usar as copies de dor e benefício fornecidas como base, condensadas para manter a interface como principal elemento de venda.

4. **Planos e teste reverso**
   - Substituir a comparação resumida atual por uma apresentação clara dos planos Presença e Pro.
   - Manter valores, benefícios e disponibilidade vindos da configuração central já usada pelo sistema.
   - Destacar o Pro como “Melhor Custo-Benefício” e explicar visualmente os 14 dias de acesso completo, sem cartão, seguidos pelo retorno automático ao Presença se não houver assinatura.
   - Todos os CTAs de conversão abrem o cadastro existente, sem criar um fluxo paralelo.

5. **Fechamento**
   - Adicionar FAQ com objeções sobre comissão, teste Pro, necessidade de instalação, impressão e acompanhamento do cliente.
   - Atualizar o CTA final para repetir a oferta de 14 dias do Pro.
   - Preservar o rodapé institucional existente.

## Direção visual

- Manter branco, cinza claro, laranja Menuzin e a tipografia atual.
- Usar fundos alternados e divisões sutis para criar ritmo, sem transformar cada seção em um card.
- Tratar as capturas como demonstrações reais do produto, com enquadramentos limpos, sombras suaves e legendas curtas.
- Limitar animações a entradas leves e pequenos movimentos dos mockups, respeitando a preferência por movimento reduzido.
- Evitar fundos decorativos com bolhas, textos extensos e elementos que concorram com as telas do produto.

## Implementação técnica

- Registrar as nove imagens enviadas no fluxo de assets do projeto; carregar a composição principal com prioridade e as imagens abaixo da dobra de forma adiada.
- Extrair componentes focados para a composição principal, faixa de autoridade, dores/soluções e blocos de demonstração.
- Reutilizar o cadastro, os dados reais de planos, FAQ, rodapé e componentes de botão existentes.
- Atualizar título, descrição e compartilhamento da rota `/comece-agora` para o novo posicionamento de gestão completa sem comissão.
- Não alterar a homepage, regras de planos, cadastro, pagamentos ou qualquer lógica operacional.

## Validação

- Conferir `/comece-agora` em desktop e celular, incluindo sobreposição dos mockups, cortes das capturas, legibilidade e ausência de rolagem horizontal.
- Validar todos os CTAs, abertura do cadastro e comunicação do teste Pro de 14 dias.
- Confirmar que preços e benefícios continuam vindo da configuração central.
- Verificar carregamento das imagens, textos alternativos, um único H1, navegação por teclado e preferência por movimento reduzido.
- Confirmar compilação sem erros e ausência de regressão visual na homepage, que deve permanecer inalterada.
