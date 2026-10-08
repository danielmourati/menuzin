# Ajustar o cálculo da taxa de entrega por KM

## O que encontrei
Três lojas usam a taxa por KM (Pastelão Sousa, Los Hermanos e Burguer Prime). A conta em si está certa: taxa base, mais o valor por km acima dos km incluídos, arredondado para cima. Os erros vêm do endereço que é enviado para medir a distância:

1. **"Calcular taxa" no topo da loja usa sempre o número "1"** da rua do cliente. Em ruas longas, a distância medida fica muito diferente da real, e a taxa mostrada não bate com a do carrinho.
2. **O endereço da loja fica vago.** Ex.: Pastelão Sousa está como "Pça do Amor 1, SN — bairro Piauí". O Google adivinha o ponto e pode errar por vários km. O CEP da loja e o do cliente não são enviados, e eles ajudariam a localizar.
3. **O arredondamento é sempre para cima.** 2,1 km extras viram 3 km cobrados, e isso deixa as entregas curtas caras.
4. **Quando o Google falha, a taxa cai para a taxa base sem aviso.** Os últimos 6 pedidos da Burguer Prime saíram com R$ 5,00 (só a taxa base), o que sugere que a distância não foi medida.
5. Hoje é usada a distância por ruas de carro. Para moto, ela costuma ser maior que a real.

## O que vou fazer
1. **Endereço completo e com CEP** dos dois lados: loja (rua, número, bairro, cidade, estado, CEP, Brasil) e cliente (inclusive o CEP).
2. **Converter os endereços em pontos do mapa antes de medir.** Vou guardar o ponto da loja uma vez e usar os pontos para medir a distância. Isso dá mais precisão e evita adivinhação.
3. **Prévia no topo da loja** sem o número falso. Ela vai mostrar "a partir de", ou uma estimativa pelo CEP com o aviso "valor final no carrinho".
4. **Arredondamento configurável** em Configurações > Entrega: "para cima", "meio km" ou "exato (proporcional)". O padrão passa a ser meio km.
5. **Nada de taxa base em silêncio**: se a distância não puder ser medida, o cliente vê um aviso e a falha fica registrada para você ver.
6. **Simulador no painel**: você digita um CEP ou endereço e vê a distância, a taxa e a conta detalhada (base + km extras). Assim fica fácil calibrar os valores de cada loja.
7. **Teste**: comparar 5 endereços reais de Parnaíba com a distância do Google Maps e conferir as taxas nas três lojas.

## Detalhes técnicos
- `src/lib/delivery-zones.functions.ts` → `resolveDeliveryFee`: montar `origins` e `destinations` com CEP e "Brasil". Usar a Geocoding API para lat/lng, com cache das coordenadas da loja (novas colunas `tenants.lat/lng`, que serão invalidadas quando o endereço mudar). A Distance Matrix passa a receber coordenadas.
- Novas colunas `delivery_km_rounding` (`ceil` | `half` | `exact`); o padrão de arredondamento vai para o histórico. Usar `Math.round(...*100)/100` na taxa.
- `ReceiveModeBar.tsx`: remover `number: "1"`.
- Registrar `distance_km` calculada no pedido, para futuras auditorias.
- Fallback do Google: retornar `available:false` com mensagem, em vez de `delivery_fee`.
