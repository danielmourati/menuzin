# Corrigir "Algo deu errado" no site publicado

## Diagnóstico (confirmado)

Reproduzi o erro em `https://menuzin.app/`: o HTML do servidor chega correto (200), mas logo após a hidratação o navegador dispara:

```text
[Supabase] Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY.
```

Baixei todos os bundles JS publicados e nenhum contém a URL do backend — ou seja, **as variáveis do cliente não foram embutidas na build de produção**. Como `src/routes/__root.tsx` importa e usa o cliente do backend logo no carregamento, o erro estoura na raiz e o `errorComponent` substitui a página inteira. Por isso acontece em qualquer rota, sempre, e só no publicado (no preview as variáveis existem e tudo funciona — validei `/`, `/guia`, loja, `/contato`, `/admin/login` sem erro).

## Correções

1. **Injetar as variáveis públicas na build** (`vite.config.ts`)
   - Adicionar um `define` explícito para `import.meta.env.VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`, com fallback para as versões sem prefixo (`SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`) que existem no ambiente de build.
   - Revisar o bloco atual de `loadEnv(..., "")` + `Object.assign(process.env, ...)` para garantir que ele não sobrescreva/limpe valores vindos do ambiente de publicação.
   - Apenas chaves públicas (publishable) entram no bundle do cliente; nada de chave de serviço.

2. **Deixar a raiz tolerante a falha de configuração** (`src/routes/__root.tsx`)
   - Isolar o uso do cliente de backend (listener de sessão) para que uma falha de inicialização não derrube toda a árvore React — o site continua navegável e apenas as áreas que dependem de login degradam.

3. **Mensagem de erro mais útil** (tela "Algo deu errado")
   - Manter o botão "Tentar novamente", mas exibir também um link para a home e, em caso de falha de configuração, uma mensagem específica em vez do texto genérico.

## Validação

- Rodar a build de produção localmente e confirmar via `grep` que os assets gerados contêm a URL do backend.
- Após publicar, recarregar `https://menuzin.app/`, `/guia` e a loja demo e confirmar que não há mais erro no console nem a tela "Algo deu errado".

## Observação

A correção só tem efeito no ar depois de publicar novamente o app.
