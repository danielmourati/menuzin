# Atalho próprio para cada loja e para o painel do lojista

## Problema
Hoje existe um único "cartão do app" para o site inteiro, que sempre abre o Guia (`/guia`). Por isso, quem adiciona a loja ou o painel à tela inicial/área de trabalho cai no Guia.

## O que muda para o usuário
- **Cliente na página da loja** (ex.: menuzin.app/pastelao-sousa): ao instalar/criar atalho, o ícone leva o **nome e logo da loja** e abre **direto nessa loja**.
- **Lojista no painel** (/admin/...): o atalho se chama "Nome da loja — Painel", e abre na **tela de login do painel** (/admin/login). Se já estiver conectado, a tela de login já redireciona para Pedidos, como hoje.
- **Guia (página inicial)**: continua com o atalho atual, abrindo na página inicial.
- Cada atalho é independente: dá para ter o Guia, a loja X e o painel instalados ao mesmo tempo.
- Botão "Instalar app / Criar atalho" na loja e no painel (quando o navegador permitir); no iPhone, instrução "Compartilhar > Adicionar à Tela de Início".

## Detalhes técnicos
- Novo endpoint `src/routes/api.public.manifest.$slug.ts` → manifesto dinâmico por loja: `id` e `start_url` = `/{slug}`, `scope` = `/{slug}`, `name`/`short_name` da loja, `theme_color` do tema, ícones = logo da loja (fallback ícones Menuzin). Lê só colunas públicas do tenant ativo; 404 se inexistente.
- Novo endpoint `src/routes/api.public.manifest-admin.ts` → `id` `/admin`, `start_url` `/admin/login`, `scope` `/admin`, nome "Menuzin Painel" (opcional `?slug=` para incluir nome/logo da loja).
- Remover o `<link rel="manifest">` do `__root.tsx` e declará-lo no `head()` de cada área: `index.tsx`/guia → `/manifest.webmanifest` (corrigir `start_url`/`id` para `/`); `$slug.tsx` e filhos → `/api/public/manifest/{slug}`; layout admin e `admin.login` → manifesto do painel. Também `apple-mobile-web-app-title` e `apple-touch-icon` por área.
- Service worker: confirmar que o registro atual (`/sw.js`, escopo `/`) não força o escopo do Guia; atalhos com escopo próprio continuam funcionando.
- Componente `InstallShortcutButton` (usa `beforeinstallprompt`; fallback com instruções para iOS) exibido no topo da loja e no menu do painel.
- Cache curto (5 min) nos manifestos para refletir mudança de nome/logo.
- Teste: buscar os manifestos via curl e conferir com Playwright o `<link rel=manifest>` em `/`, `/pastelao-sousa` e `/admin/login`.
