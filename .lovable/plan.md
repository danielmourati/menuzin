## Mostrar o endereço completo do CEP em "Entregar em"

Hoje, ao simular a taxa pelo CEP, o resumo mostra só uma parte (ex.: "Entregar em Piauí"). Vamos mostrar o endereço encontrado pelo CEP.

### Como ficará
```text
Entregar em
Rua Exemplo, Bairro Tal
Parnaíba/PI · CEP 64208-468
Taxa de entrega        R$ 7,25
Tempo estimado         ≈ 40–75 min
```
- Linhas que não vierem do CEP (ex.: CEP geral da cidade, sem rua) são omitidas, sem deixar vírgulas soltas.
- Bairro usa o nome da área de entrega quando a loja o reconhece.
- Escolha por bairro (lojas com taxa por bairro) continua igual.
- O texto salvo e mostrado na barra da loja passa a ser "Rua, Bairro" (ou o que existir), em vez de só um campo.

### Detalhes técnicos
- `src/components/storefront/ReceiveModeBar.tsx`: em `searchCep`, montar `label` a partir de logradouro + bairro (fallback cidade/UF) e renderizar no card de resultado um bloco com rua/bairro e cidade/UF + CEP, usando os campos já guardados em `result` (`street`, `neighborhood`, `city`, `state`, `cep`).
- Conferir no navegador com o CEP 64208-468.
