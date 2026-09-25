# Busca de endereço pelo CEP nos Dados da Loja

## O problema
Em Configurações > Dados da loja, digitar o CEP não preenche nada. A tela usa a mesma consulta de CEP do checkout, mas lê a resposta do jeito errado. Por isso Rua, Bairro, Cidade e UF ficam como estavam, e a mensagem pode dizer "Endereço encontrado" mesmo sem ter preenchido nada.

## O que muda
- Mesmo jeito do checkout: quando o CEP tiver 8 dígitos, a busca roda sozinha depois de uma pequena pausa na digitação, com um ícone de carregando no campo.
- Endereço, Bairro, Cidade e UF são preenchidos com o resultado. Aqui eles são substituídos, porque o lojista está trocando o endereço da loja. O número e o complemento que já estiverem no campo Endereço são mantidos quando der.
- As mensagens aparecem abaixo do campo, como no checkout: "CEP não encontrado" ou "Falha ao buscar CEP. Preencha manualmente."
- Todos os campos continuam editáveis.

## Detalhes técnicos
- `src/routes/admin.configuracoes.index.tsx`: tirar o `toast.promise` do onChange; criar um `useEffect` em `form.cep` com debounce de 400 ms e flag de cancelamento, chamando `lookupByCep` de `@/lib/viacep` e lendo `res.status` / `res.results[0]`. Estados `cepLoading` e `cepError`, com um `Loader2` dentro do campo.
- Só roda quando o usuário digita (uma ref marca a edição), para não sobrescrever o endereço salvo ao abrir a página.
- Não muda nada no banco nem no servidor.
