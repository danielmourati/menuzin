# Busca de bairro/rua em "Taxas de entrega" pelo Google

## O que muda para o lojista
- Na tela "Taxas de entrega", ao digitar um bairro ou rua, as sugestões passam a vir do Google, que já conhece bairros novos que o ViaCEP não tem.
- A lista mostra: nome do bairro (em destaque), rua quando houver, cidade/UF e CEP quando o Google informar.
- Ao escolher uma sugestão, o bairro, a cidade e a UF são preenchidos como hoje. O CEP só é preenchido quando o Google o informar. O lojista ainda pode ajustar tudo à mão antes de salvar.
- Se o lojista digitar um CEP completo, essa busca continua como está hoje (ViaCEP). Só a busca por nome muda.
- Se o Google não achar nada, o sistema tenta o ViaCEP e depois as faixas de CEP já cadastradas, para não deixar o lojista sem resultado.
- Os textos "pelo ViaCEP" passam a dizer "pelo Google".

## Custo
- Cada busca é uma consulta paga ao Google. Para gastar pouco: só busca com 3 letras ou mais, espera o lojista parar de digitar, mostra no máximo 8 sugestões e só o dono/admin da loja logado pode usar essa busca.

## Etapas
1. Criar a busca no servidor, só para quem está logado no painel, usando o Google com a cidade/UF da loja como filtro.
2. Converter as respostas do Google para o formato atual da lista (bairro, rua, cidade, UF, CEP).
3. Trocar a busca por nome na tela para usar essa nova função, mantendo o ViaCEP e as faixas locais como reserva.
4. Testes do conversor: bairro sem CEP, rua com CEP, resultado de outra cidade descartado.

## Detalhes técnicos
- Novo `searchPlacesForZone` em `src/lib/delivery-zones.functions.ts` (`createServerFn` + `requireSupabaseAuth`, valida `q` 3–120 chars, city/uf). Reaproveita a mesma chave `GOOGLE_MAPS_API_KEY` já usada em `geocode()` desse arquivo.
- Chamada: Geocoding `address=<q>, <city>, <uf>, Brasil&components=country:BR|administrative_area:<uf>&language=pt-BR` (retorna `sublocality`/`sublocality_level_1`, `route`, `administrative_area_level_2`, `postal_code`). Opcional: Places Text Search quando o Geocoding der ZERO_RESULTS.
- Parser puro `src/lib/google-address-parse.ts` → `ViaCepResult`-compatível (`bairro`, `logradouro`, `localidade`, `uf`, `cep` podendo ser vazio); descarta resultados de outra cidade.
- `ViaCepSearch` em `admin.taxas-entrega.tsx`: ramo não-CEP chama o servidor; ordem de reserva Google → `searchByAddress` (ViaCEP) → `searchCepRanges`. `onSelect` aceita `cep` vazio sem sobrescrever faixa de CEP.
- 403 do Google tratado com mensagem clara.
