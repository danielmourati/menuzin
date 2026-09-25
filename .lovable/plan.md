# Dados da loja: nova organização dos campos + Nº e Ponto de referência

## Como vai ficar
A aba "Dados da loja" será dividida em blocos com título, para ficar mais fácil de ler:

```text
[ Identificação ]
  Nome da loja            | WhatsApp
  Documento (CNPJ/CPF)    | (vazio no desktop)
  Descrição (linha inteira)

[ Endereço da loja ]
  CEP (com busca automática)
  Rua / Logradouro (larga)          | Nº (estreito)
  Bairro                  | Cidade  | UF (estreito)
  Ponto de referência (linha inteira, opcional)

[ Tipo de negócio ]
[ Conta do administrador ]
```

- No celular, cada campo ocupa a linha inteira, e o Nº fica ao lado da Rua.
- Campo novo **Nº**, com a opção "S/N" (sem número) para quem não tem número.
- Campo novo **Ponto de referência** (ex.: "ao lado da farmácia"), opcional.
- A busca pelo CEP preenche Rua, Bairro, Cidade e UF. O Nº e a referência não são tocados.

## Onde o endereço aparece
O endereço completo passa a ser montado como "Rua, Nº — Bairro":
- em "Sobre a loja" no cardápio online, com a referência logo abaixo;
- no cupom impresso;
- no cálculo da taxa por KM, o que deixa a distância mais precisa.

Lojas que hoje têm o número escrito junto da rua (ex.: "Av. Beira Rio, 123 — Centro") continuam funcionando. O endereço delas aparece como já está até alguém preencher o novo campo Nº.

## Detalhes técnicos
- Migração: adicionar as colunas `address_number text` e `address_reference text` em `tenants`, as duas opcionais.
- `tenants.functions.ts`: incluir as duas no `UpdateTenantInput`.
- `db-types.ts` / `db-adapters.ts`: novos campos e um auxiliar `formatTenantAddress(t)`.
- `admin.configuracoes.index.tsx`: blocos com títulos e grid `md:grid-cols-6` (Rua 5 + Nº 1; Bairro 3 + Cidade 2 + UF 1). O preenchimento pelo CEP deixa de preservar o texto depois da vírgula.
- Usar `formatTenantAddress` em `StoreAboutDrawer.tsx`, nos locais de impressão (`PrintOrderButton`, `PrintKitchenButton`, `useAcceptOrderWithKitchenPrint`, `QzPrinterWizard`) e na origem do cálculo de KM em `delivery-zones.functions.ts`.
