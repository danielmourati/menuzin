# Tempo de delivery e retirada (de X a Y minutos)

## O que muda para o lojista
- Configurações > Entrega: os campos "Tempo médio Delivery" e "Tempo médio Retirada" viram dois números cada: **de [40] a [75] min**.
- Salvar deixa de dar o erro "Could not find the 'delivery_time' column".
- Validação: mínimo e máximo entre 1 e 600 min, e "até" maior ou igual a "de". Pode deixar em branco (usa o tempo de preparo geral da loja, como hoje).

## O que o cliente vê
- Em "Sobre a loja", Delivery e Retirada mostram "40–75 min" (ou só "40 min" se os dois forem iguais).

## Detalhes técnicos
- Causa: a tela e o servidor enviam `delivery_time`/`takeout_time`, mas essas colunas não existem em `tenants`.
- Migração: adicionar em `tenants` as colunas inteiras nulas `delivery_time_min`, `delivery_time_max`, `takeout_time_min`, `takeout_time_max`.
- `tenants.functions.ts`: trocar `delivery_time`/`takeout_time` do schema por os 4 campos (int 1–600, nullable), com refinamento min <= max.
- `db-types.ts`, `db-adapters.ts`, `domain-types.ts`: novos campos; `deliveryTime`/`takeoutTime` passam a ser o texto formatado ("40–75 min") gerado por um helper `formatTimeRange`.
- `admin.configuracoes.index.tsx`: form com 4 campos numéricos em layout "de __ a __ min"; carregar/salvar os novos valores.
- `StoreAboutDrawer.tsx` continua usando `deliveryTime || prepTime` (sem outra mudança).
- Verificar: salvar na tela autenticado via Playwright e conferir o texto em "Sobre a loja".
