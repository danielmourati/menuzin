# Corrigir emojis nas mensagens por link do WhatsApp

## Objetivo
Eliminar os símbolos estranhos relatados ao abrir mensagens pelo WhatsApp, preservando o conteúdo, os acentos, as quebras de linha e os emojis válidos.

## Diagnóstico confirmado
- As mensagens de atualização de pedidos e despacho para entregadores contêm emojis.
- Há mais de um gerador de links, e os trechos inspecionados usam `encodeURIComponent` para incluir a mensagem na URL.
- A causa dos símbolos estranhos ainda não está confirmada: esse método de codificação, por si só, não demonstra um erro. A investigação distinguirá texto já corrompido, codificação duplicada e comportamento do aplicativo do WhatsApp.

## Alterações propostas
1. Revisar os caminhos de envio por link: atualizações de pedidos, despacho, resumo dos entregadores, confirmação do cliente e contato.
2. Comparar a mensagem original com o texto recuperado do link, incluindo emojis compostos e acentos, para localizar onde ocorre a alteração.
3. Unificar a montagem dos links em um helper compartilhado, preservando os contratos existentes, e corrigir os caminhos que a investigação comprovar defeituosos. A mensagem deve ser codificada uma única vez, sem cortar emojis pela metade.
4. Corrigir caracteres corrompidos nos textos padrão, caso encontrados. Não remover indiscriminadamente emojis nem alterar nomes, observações e demais textos do cliente.
5. Se o link preservar corretamente os emojis e a falha ocorrer apenas no WhatsApp do dispositivo, registrar essa limitação e propor uma alternativa de texto compatível, sem anunciar uma correção que não foi verificada.

## Validação
- Testes de ida e volta do texto pelo link com 🛵, 🍔, ⏳, 🎉, 🗺️, acentos, múltiplas linhas e links de mapa.
- Conferir pelo aplicativo Menuzin o conteúdo dos links de notificação, despacho e resumo, sem enviar mensagens reais durante os testes.
- Verificar que telefones e conteúdo financeiro não mudaram e que o aplicativo continua compilando.
- A exibição final no WhatsApp do celular será confirmada com um teste do usuário; a inspeção do link não substitui essa confirmação.

## Detalhes técnicos
Manter a solução restrita aos geradores de mensagens e links, com testes de regressão. Não integrar a API do WhatsApp, alterar pagamentos, permissões ou impressão.