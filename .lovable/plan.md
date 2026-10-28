# Corrigir tela "Algo deu errado"

A tela de erro agora aparece corretamente (a correção anterior funcionou), mas ainda falta descobrir o que a dispara. Os registros atuais mostram só um aviso de diferença entre servidor e navegador, causado em parte por uma extensão do navegador (atributos `bis_status`/`__processed_...` no `<body>`). Nenhum erro real foi registrado, então a causa ainda não foi confirmada.

## Passos
1. Abrir a página inicial e as rotas principais (loja, admin, checkout) no navegador de testes e capturar o erro exato que leva à tela.
2. Fazer a tela de erro registrar a mensagem real no console (e mostrá-la em modo de desenvolvimento) para que próximas falhas fiquem visíveis.
3. Corrigir a causa encontrada e resolver outros pontos com o mesmo problema.
4. Adicionar `suppressHydrationWarning` em `<html>`/`<body>` para que extensões do navegador não gerem alertas falsos.
5. Conferir de novo no navegador que a página carrega sem a tela de erro.

## Detalhes técnicos
- `src/routes/__root.tsx`: `errorComponent` passa a fazer `console.error(error)` e mostrar `error.message` quando `import.meta.env.DEV`.
- Teste com Playwright em `/tmp/browser/`, gravando console e pageerror.
