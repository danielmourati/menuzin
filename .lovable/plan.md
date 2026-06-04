## 1. Banco de dados (migration)

Nova tabela global `public.cep_ranges`:
- `id uuid pk`, `uf text(2)`, `city text`, `cep_start text(8)`, `cep_end text(8)`, `created_at timestamptz`
- Índices em `(uf, city)`, `cep_start`, `cep_end`
- GRANTs: `SELECT` para `anon` e `authenticated` (dados públicos dos Correios), `ALL` para `service_role`
- RLS habilitado, policy `SELECT` aberta (`USING (true)`)

Como o CSV tem ~5794 linhas, faço o seed dentro da própria migration via `INSERT ... VALUES (...), (...)`, em lotes. Linhas onde `CIDADE` está vazia (faixa estadual genérica, ex. linha 2 `AC,,69900000,...`) são ignoradas para evitar resultados ambíguos no autocomplete. CEPs já vêm com 8 dígitos no CSV; preservo como string (zero-padding garantido no parser).

## 2. Server function de busca

`src/lib/cep-ranges.functions.ts` — novo arquivo, **pública** (sem `requireSupabaseAuth`), usa `supabaseAdmin`:

`searchCepRanges({ q })`:
- Normaliza a query (trim, lowercase, sem acento).
- Se `q` for só dígitos e tiver ≥ 5: faz match por intervalo (`cep_start <= q_padded <= cep_end`), zero-padding até 8.
- Senão: detecta UF (2 letras) opcional + cidade. Faz `ilike` em `city` (com `unaccent` em JS — query agnóstica de acento via comparação no servidor após `select` filtrado por prefixo) e filtra por UF quando informada.
- Retorna até 20 resultados: `{ id, uf, city, cep_start, cep_end }`.

## 3. UI do modal "Novo bairro" (`src/routes/admin.taxas-entrega.tsx`)

Layout novo (na ordem):
1. `Bairro *`
2. **`Buscar cidade ou CEP`** (novo campo combobox) — placeholder `Digite a cidade, UF ou CEP`
3. `CEP inicial` / `CEP final`
4. `Taxa de entrega`, `Pedido mínimo`, `Tempo estimado`, `Ativo/Inativo`

Helper text atualizado:
> "Busque por cidade, UF ou CEP para preencher automaticamente a faixa de CEP. O bairro continua sendo usado como nome da área de entrega."

Comportamento do combobox (componente novo `CepRangeSearch` usando `Command` do shadcn + `useQuery` debounced em 250 ms):
- Cada item exibe: **Cidade/UF** em destaque + `CEP inicial até CEP final` formatado `00000-000`.
- Ao selecionar: preenche `cep_start`/`cep_end` no form. Não toca em `Bairro`. Mostra texto auxiliar `Faixa de {cidade}/{UF} aplicada`.
- Usuário pode editar manualmente os campos depois (validação existente continua valendo: `cep_start <= cep_end`).

## 4. Checkout

Sem mudanças. A lógica de `resolveDeliveryFee` em `src/lib/delivery-zones.functions.ts` já faz match por range de CEP nas zonas do tenant e fallback por nome de bairro — exatamente o pedido do item 6 do prompt. O ganho é indireto: como o admin agora cadastra ranges corretos via autocomplete, a cobertura por CEP no checkout melhora automaticamente.

## 5. Critérios de aceite

- Tabela `cep_ranges` criada e populada com ~5.7k cidades.
- Modal "Novo bairro" tem campo de busca acima dos CEPs, com helper text novo.
- Digitar `parnaíba` mostra `Parnaíba/PI — 64200-000 até 64219-999`; selecionar preenche os CEPs.
- Digitar `64210000` localiza a faixa contendo o CEP.
- Bairro permanece editável manualmente; validação `cep_start <= cep_end` continua.
- Checkout continua resolvendo taxa por CEP usando as zonas do tenant (sem mudança de código).
