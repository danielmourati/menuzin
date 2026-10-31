# Trocar consulta de CEP do ViaCEP para o Google

## O que muda para o usuário
- Ao digitar o CEP (checkout, barra de entrega, PDV, cadastro rápido, configurações da loja, taxas de entrega e agente IA), o endereço continua sendo preenchido automaticamente, agora vindo do Google.
- Mesmo comportamento atual: rua editável, bairro/cidade/UF preenchidos, mensagens de erro e espera curta enquanto digita.
- Bônus: a consulta já devolve a localização exata, então o cálculo da taxa por KM fica mais preciso e mais rápido (sem segunda consulta).

## Pontos de atenção
- O Google cobra por consulta (diferente do ViaCEP, gratuito). Vamos guardar em cache cada CEP já consultado para não pagar duas vezes, e só consultar com 8 dígitos completos.
- O Google às vezes não traz a rua para CEPs gerais de cidade (ex.: final -000). Nesse caso a rua fica em branco para o cliente digitar. Proposta: usar o ViaCEP como reserva automática quando o Google não trouxer rua/bairro.
- A busca por nome de rua/bairro em "Taxas de entrega" passa a usar a busca de endereços do Google.

## Etapas
1. Criar uma consulta de CEP no servidor usando o Google (Geocoding com `components=postal_code:XXXXX-XXX|country:BR`), convertendo o resultado para o mesmo formato atual (rua, bairro, cidade, UF, CEP) mais latitude/longitude.
2. Cache por CEP no banco (tabela de CEPs consultados, validade ~90 dias).
3. Reserva via ViaCEP quando o Google não trouxer dados suficientes.
4. Trocar todas as telas e o agente IA para usar a nova consulta, mantendo a mesma interface.
5. Reaproveitar as coordenadas no cálculo de taxa por KM.
6. Testes do conversor de resposta do Google (CEP com rua, CEP geral, CEP inexistente).

## Detalhes técnicos
- Hoje: `src/lib/viacep.ts` (browser) usado em CartDrawer, ReceiveModeBar, admin.pdv, QuickSignupModal, admin.configuracoes, admin.taxas-entrega; `ai-agent.server.ts` e `customers.server.ts` chamam ViaCEP direto. Geocoding Google já existe em `delivery-zones.functions.ts` com chave direta.
- Novo `src/lib/cep-lookup.functions.ts` (`createServerFn`, entrada validada 8 dígitos) + parser puro `src/lib/google-cep-parse.ts` (address_components: route, sublocality/sublocality_level_1, administrative_area_level_2, administrative_area_level_1 short_name, postal_code).
- Usar a mesma credencial Google já usada em `delivery-zones.functions.ts`; endpoint público (checkout anônimo), por isso cache + validação estrita limitam custo.
- Tabela `cep_cache (cep text pk, street, neighborhood, city, uf, lat, lng, source, updated_at)`, acesso só pelo servidor (sem políticas anon).
- `searchByAddress` passa para Geocoding por texto com `components=country:BR`.
- `src/lib/viacep.ts` mantido apenas como reserva no servidor.
