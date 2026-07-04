# Extração de CEPs e bairros — Parnaíba/PI

## Contexto e limitação da ViaCEP
A ViaCEP **não expõe** um endpoint "listar todos os CEPs da cidade". As duas rotas disponíveis são:
- `GET /ws/{cep}/json/` — consulta 1 CEP.
- `GET /ws/{UF}/{cidade}/{logradouro}/json/` — busca por logradouro (mín. 3 letras, retorna no máx. 50 resultados).

Não há como enumerar 100% dos CEPs de Parnaíba usando **apenas** ViaCEP. Para chegar perto do "todos", precisamos de uma fonte de sementes (faixas de CEP ou lista de logradouros) e então enriquecer via ViaCEP.

## Estratégia
Como o projeto já tem a tabela `cep_ranges` (usada em `src/lib/cep-ranges.functions.ts`) com faixas oficiais dos Correios, vou usá-la como fonte de sementes e complementar com ViaCEP:

1. Ler todas as faixas de `cep_ranges` onde `uf='PI'` e `city ILIKE 'Parnaíba'` (via `supabase--read_query`).
2. Para cada faixa:
   - Se a faixa já traz `neighborhood`, usar direto.
   - Se `neighborhood` for `NULL` (faixas gerais tipo CEP único de cidade), consultar ViaCEP no `cep_start` para tentar obter bairro/logradouro.
3. Adicionalmente, varrer ViaCEP por logradouros comuns (a-z + prefixos "rua ", "av ", "travessa ") em `PI/Parnaiba/{termo}` para pegar CEPs de logradouro que possam não constar nas faixas — deduplicando por CEP.
4. Consolidar, deduplicar por CEP, ordenar por bairro e depois por CEP.

## Entregáveis (em `/mnt/documents/`)
- `parnaiba-pi-ceps.xlsx` — colunas: `CEP`, `Bairro`, `Logradouro`, `Cidade`, `UF`, `Fonte` (cep_ranges | viacep).
- `parnaiba-pi-ceps.md` — mesma tabela em Markdown, agrupada por bairro, com contagem total no topo.

## Implementação
Script Python único em `/tmp/parnaiba_ceps.py`:
- Usa `psql`/consulta ao banco via ferramenta `supabase--read_query` (executada antes do script; JSON salvo em `/tmp/parnaiba_seed.json`).
- Requests para ViaCEP com throttle (~5 req/s) e retry.
- Gera `.xlsx` com `openpyxl` seguindo o padrão do skill xlsx (fonte Arial, cabeçalho em negrito, congelar linha 1, filtros).
- Gera `.md` correspondente.
- Ao final, imprime totais (nº de CEPs, nº de bairros distintos).

## Aviso de completude
No topo do `.md` e em uma aba "Leia-me" do `.xlsx`, incluir nota:
> "Cobertura baseada nas faixas oficiais dos Correios + enriquecimento ViaCEP. A ViaCEP não permite listar 100% dos CEPs de uma cidade; podem existir CEPs de grandes usuários ausentes."

## Fora de escopo
- Nenhuma alteração no app (front/back). É uma extração pontual de dados.
