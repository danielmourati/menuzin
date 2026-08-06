# Publicar o Menuzin na Play Store como TWA

Objetivo: empacotar o app web (Guia + storefronts) em um aplicativo Android publicável na Play Store, usando TWA (Trusted Web Activity) — o app abre o site real em tela cheia, sem barra de navegador, com ícone próprio na gaveta de apps.

Hoje o projeto não tem manifesto web nem ícones de app (`public/` só tem favicon, robots, llms e sons). Sem isso o Android não aceita o empacotamento. Essa é a primeira frente de trabalho.

## Fase 1 — Preparar o site (o que eu faço aqui)

1. **Manifesto do app** em `public/manifest.webmanifest`:
  - `name`: "Menuzin — Guia e Delivery", `short_name`: "Menuzin"
  - `start_url`: `/guia`, `id`: `/guia`, `scope`: `/`, `display`: `standalone`
  - `theme_color` e `background_color` alinhados ao tema atual
  - `orientation: portrait`, `lang: pt-BR`, `categories: ["food", "shopping"]`
  - Ícones 192px, 512px e um 512px `maskable` (ícone adaptativo do Android)
2. **Ícones e splash** em `public/` (gerados a partir da marca Menuzin), mais `apple-touch-icon` para iOS.
3. **Tags no `<head>**` da rota raiz (`src/routes/__root.tsx`): `manifest`, `theme-color`, `apple-touch-icon`, `apple-mobile-web-app-*`.
4. **Arquivo de vínculo digital** `public/.well-known/assetlinks.json` — é o que prova ao Android que o app e o domínio `menuzin.app` são do mesmo dono e remove a barra de URL. Depende da impressão digital SHA-256 da chave de assinatura (Fase 2), então entra como último passo.
5. **Ajustes de UX em modo app**: esconder o rodapé institucional/CTA de instalação quando rodando em `display-mode: standalone`, e garantir que o botão voltar do Android navegue no histórico do app.

Não vou adicionar service worker / modo offline nesta fase — TWA não exige, e service worker mal configurado é a maior causa de app travado em versão antiga. Se você quiser offline depois, faço em etapa separada.

## Fase 2 — Gerar e publicar o APK/AAB (o que depende de você)

1. **Conta de desenvolvedor Google Play** (taxa única de US$ 25) e verificação de identidade — pode levar alguns dias.
2. **Gerar o pacote Android** com Bubblewrap (CLI oficial do Google) a partir do manifesto publicado:
  - `applicationId` sugerido: `app.menuzin.twa`
  - host: `menuzin.app`
  - saída: `app-release-bundle.aab` + chave de assinatura (`.keystore`) que **precisa ser guardada em segurança** — perder a chave impede atualizações futuras.
  - Eu forneço o passo a passo exato dos comandos; a execução é na sua máquina (precisa de JDK/Android SDK).
3. **Pegar o SHA-256** da chave (e também da chave de assinatura do Play, gerada pelo Google) e me enviar — eu coloco no `assetlinks.json` e publico o site. Sem isso o app abre com a barra de endereço visível.
4. **Ficha da Play Store**: nome, descrição curta/longa, ícone 512x512, banner 1024x500, 4–8 capturas de tela, política de privacidade em URL pública, classificação de conteúdo e questionário de segurança de dados.
5. **Envio para revisão** (normalmente alguns dias na primeira publicação).

## Pontos de atenção

- **Página de privacidade**: a Play Store exige URL pública de política de privacidade. Hoje não existe rota para isso — posso criar `/privacidade` e `/termos`.
- **Pagamentos**: o checkout usa Pix/cartão via Mercado Pago para produtos físicos (comida), o que é permitido fora do faturamento do Google. Não há risco de exigência de billing do Play, mas a ficha deve deixar claro que é delivery.
- `**start_url` é gravado na instalação**: mudar depois exige reinstalação pelo usuário. Por isso vale decidir agora se o app abre no Guia (recomendado) ou na home institucional.
- **Atualizações**: mudanças no site aparecem no app imediatamente; só é preciso subir nova versão na Play Store quando mudar ícone, nome ou configuração do pacote.

## Detalhes técnicos

- Arquivos novos: `public/manifest.webmanifest`, `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/apple-touch-icon.png`, `public/.well-known/assetlinks.json`, rotas `src/routes/privacidade.tsx` e `src/routes/termos.tsx`.
- Arquivo alterado: `src/routes/__root.tsx` (tags de head) e ajuste pontual de layout para `standalone`.
- Sem `vite-plugin-pwa`, sem service worker, sem migração de banco.  
  
Executar Fase 1 inicialmente, só depois partimos para as próximas fases.