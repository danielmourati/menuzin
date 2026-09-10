# Refatoração CRO da página “Comece agora”

## Objetivo

Reposicionar o Menuzin como estratégia de fidelização sem comissão, tornar a proposta mais clara no primeiro contato e conduzir o visitante a um único cadastro gratuito, sem alterar o fluxo atual de criação da loja.

## Página `/comece-agora`

1. **Hero focado em lucro e fidelização**
   - Substituir o título por: “Pare de dividir seu lucro. Seu cardápio digital no ar em 2 minutos.”
   - Aplicar o novo texto sobre usar grandes apps como vitrine e o Menuzin para fidelizar, receber no WhatsApp e manter 100% das vendas.
   - Manter somente um CTA principal: “Criar Meu Cardápio Grátis”, com seta à direita, abrindo o cadastro já existente.
   - Remover o botão secundário redundante e preservar os sinais de confiança logo abaixo.
   - Ajustar quebras, espaçamento e proporção do título para leitura confortável em celular e desktop, mantendo a ilustração atual.

2. **Nova seção `SmartStrategySection`**
   - Inserir imediatamente após o hero, antes do passo a passo.
   - Título: “A estratégia dos restaurantes mais lucrativos”.
   - Exibir os dois momentos da estratégia em sequência clara: “A Vitrine” e “O Lucro”.
   - No celular, empilhar os cards; em telas maiores, mostrar duas colunas.
   - Destacar “O Lucro (Menuzin)” com borda, fundo sutil e elementos da paleta primária, sem fugir da identidade visual atual.

3. **Nova comparação `PricingTable`**
   - Substituir integralmente a seção “Por que grátis de verdade?”.
   - Criar duas colunas: Presença grátis e Pro mensal.
   - Presença: 0% de comissão, até 20 produtos, link + QR Code e botão de WhatsApp.
   - Pro: produtos ilimitados, gestão completa e sem taxas por pedido.
   - Destacar o Pro com o badge “Melhor Custo-Benefício”.
   - Exibir no Pro o preço mensal ativo configurado pela administração, evitando divergência entre a landing page e os planos reais.
   - Incluir CTA de cadastro gratuito na comparação, reutilizando o mesmo fluxo de cadastro da página.

4. **Consistência e conversão**
   - Extrair as novas áreas em componentes focados e legíveis, sem alterar as demais seções da página.
   - Manter semântica correta, um único H1, contraste, foco visível e animações já compatíveis com redução de movimento.
   - Atualizar título e descrição de compartilhamento da rota para refletir a nova proposta de lucro sem comissão.

## Homepage `/`

- Preservar a estrutura, demonstração, recursos, FAQ e tabela completa já existentes.
- Alinhar o título e o texto principal à nova narrativa de lucro, fidelização e 0% de comissão.
- Manter um CTA principal de cadastro gratuito e a demonstração da loja como ação secundária, pois ela tem função distinta.
- Ajustar a apresentação dos planos para destacar o Pro como “Melhor Custo-Benefício”, sem trocar os valores dinâmicos nem duplicar a nova seção estratégica.
- Atualizar os textos de compartilhamento da home para acompanhar o novo posicionamento.

## Validação

- Conferir `/comece-agora` e `/` em celular e desktop, incluindo quebras do novo título, ordem dos cards, destaque do Pro e abertura do cadastro.
- Confirmar que os preços exibidos continuam vindo da configuração central de planos.
- Verificar ausência de sobreposição, rolagem horizontal, erros visuais e falhas de compilação.
