# Trocar consulta de CEP do ViaCEP para a BrasilAPI

## O que muda para o usuário
- Ao digitar o CEP (checkout, barra de entrega, PDV, cadastro rápido, configurações da loja, taxas de entrega e agente IA), o endereço continua sendo preenchido sozinho, agora pela BrasilAPI.
- A BrasilAPI junta várias fontes (Correios, ViaCEP, OpenCEP e outras), então encontra mais CEPs e bairros novos e cai menos.
- Tudo continua igual na tela: rua editável, bairro/cidade/UF preenchidos, mesmas mensagens de erro.
- Grátis, sem chave e sem cadastro.

## Limitação importante
- A BrasilAPI só busca **por CEP**. Ela não busca por nome de rua ou bairro.
- Por isso, a busca por nome em "Taxas de entrega" continua no ViaCEP, com as faixas de CEP já cadastradas como reserva. Se quiser, essa busca pode ir para o Google depois (plano anterior).

## Etapas
1. Trocar a consulta de CEP para a BrasilAPI (versão 2), convertendo a resposta para o mesmo formato que as telas já usam.
2. Se a BrasilAPI falhar ou não achar o CEP, tentar o ViaCEP automaticamente.
3. Aplicar a mesma troca no agente IA e no cadastro de clientes, que hoje chamam o ViaCEP direto.
4. Quando a BrasilAPI trouxer a localização do CEP, guardar para ajudar o cálculo de taxa por KM.
5. Atualizar os textos "ViaCEP" das telas para algo neutro ("busca de CEP").
6. Testes do conversor: CEP com rua, CEP geral de cidade (sem rua), CEP inexistente e reserva no ViaCEP.

## Detalhes técnicos
- Endpoint: `GET https://brasilapi.com.br/api/cep/v2/{cep}` → `{ cep, state, city, neighborhood, street, location.coordinates.{latitude,longitude} }`; 404 = não encontrado. Tem CORS, funciona no navegador e no servidor (workerd).
- `src/lib/viacep.ts` vira `src/lib/cep.ts`: `lookupByCep` tenta BrasilAPI (timeout ~4s) e depois ViaCEP; mantém o tipo `ViaCepResult` (renomeado `CepResult`) e adiciona `lat/lng` opcionais. `searchByAddress` e `rankResults` permanecem com ViaCEP.
- Atualizar imports em CartDrawer, ReceiveModeBar, admin.pdv, QuickSignupModal, admin.configuracoes.index, admin.taxas-entrega; substituir fetch direto em `ai-agent.server.ts` e `customers.server.ts` pelo helper.
- Parser puro testado em `tests/cep-lookup.test.ts`.
