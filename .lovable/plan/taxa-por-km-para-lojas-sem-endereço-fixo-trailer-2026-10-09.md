# Taxa por KM para lojas sem endereço fixo (trailer)

## O problema
Lojas em trailer não têm número, então o endereço fica "Praça do Amor, S/N". O Google adivinha o ponto e a distância sai errada. Hoje o ponto de saída é sempre calculado pelo texto do endereço, e não há como o lojista corrigir.

## O que muda
1. **Ponto de saída definido pelo lojista.** Em Configurações > Dados da loja, no bloco "Endereço da loja", um novo campo "Local de saída das entregas" com:
   - Botão **"Usar minha localização atual"**: o lojista toca estando no trailer e o ponto é salvo (útil quando o trailer muda de lugar).
   - Campo **"Buscar local"** (nome de praça, ponto conhecido ou endereço) que localiza e mostra o ponto encontrado.
   - Link **"Conferir no mapa"** que abre o ponto no Google Maps, para o lojista confirmar.
   - Botão **"Voltar para o endereço"** para descartar o ponto manual.
2. **Quando houver ponto manual, ele manda.** O cálculo usa esse ponto e nunca o regrava a partir do texto do endereço. Sem ponto manual, tudo continua como hoje.
3. **Aviso nos "S/N".** Se a loja usa taxa por KM e o número é "S/N" sem ponto manual, aparece um aviso: "Sem número, a distância pode ficar imprecisa. Defina o local de saída."
4. **Simulador de taxas** (Taxas de entrega) passa a mostrar de onde a medição saiu: "Ponto definido por você" ou "Endereço cadastrado".
5. **Endereço exibido ao cliente** não muda ("Praça do Amor — Piauí" continua aparecendo sem número).

## Ficam de fora
- Rastreamento em tempo real do trailer (o lojista atualiza o ponto quando muda de lugar).
- Mapa interativo para arrastar o pino (usamos GPS, busca e conferência pelo link).

## Detalhes técnicos
- Migração: `tenants.geo_manual boolean not null default false` (reaproveita `geo_lat`, `geo_lng`, `geo_address`).
- `tenants.functions.ts`: aceitar `geo_lat`, `geo_lng`, `geo_manual`, validando faixas de latitude/longitude.
- `delivery-zones.functions.ts`: se `geo_manual` e lat/lng existirem, usar direto como origem (sem comparar `geo_address`, sem regravar). Nova função de servidor autenticada (dono/admin) `geocodeStoreLocation` que usa a Geocoding API para a busca de local, sem expor a chave.
- `admin.configuracoes.index.tsx`: seção do ponto de saída com `navigator.geolocation` (HTTPS, pede permissão; tratamento de negado/indisponível), busca e link do mapa; limpar `geo_manual` ao voltar para o endereço.
- `admin.taxas-entrega.tsx`: simulador retorna e exibe a origem usada.
- Teste: definir ponto manual numa loja, simular um CEP de Parnaíba e conferir distância e taxa; confirmar que lojas sem ponto manual não mudam.
