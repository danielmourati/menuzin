# Taxa de entrega: modos + CEP

## 1. Banco de dados (migration)

**Novas colunas em `tenants`:**
- `delivery_mode` text default `'single'` check in (`'none'`,`'single'`,`'neighborhood'`)
- `delivery_fee` já existe → continua sendo a "taxa única"

**Novas colunas em `delivery_zones`:**
- `cep_start` text null (somente dígitos, 8 chars)
- `cep_end` text null

**Novas colunas em `orders`** (snapshot, para não alterar pedidos antigos quando admin mudar config):
- `delivery_fee_source` text null check in (`'none'`,`'single_fee'`,`'neighborhood_by_cep'`,`'neighborhood_by_name'`)
- `delivery_neighborhood_snapshot` text null

**Bug do "R$ 5,00":** o seed do tenant `Burger Prime` tem `delivery_fee = 5.00`. Não é hardcode no código — é dado real. Não vou apagar o seed (é demo), mas o admin agora poderá escolher `delivery_mode = 'none'` para zerar.

## 2. Backend (server functions)

**`src/lib/tenants.functions.ts`** — `updateMyTenant` aceita `delivery_mode` e mantém `delivery_fee`.

**`src/lib/delivery-zones.functions.ts`:**
- `upsertDeliveryZone` aceita `cep_start`/`cep_end` opcionais; valida formato (8 dígitos) e `cep_start <= cep_end`.
- `listPublicDeliveryZones` retorna também `cep_start`/`cep_end`.
- Novo: `resolveDeliveryFee({ tenant_slug, cep, neighborhood })` retorna `{ mode, fee, source, neighborhood, available }` aplicando as regras:
  - mode `none` → fee 0, available true
  - mode `single` → fee = tenant.delivery_fee, source `single_fee`
  - mode `neighborhood`:
    1. tenta match por CEP em ranges ativos
    2. fallback por nome do bairro (case/acento-insensitive)
    3. nenhum → `available: false`

## 3. Admin UI

**`src/routes/admin.taxas-entrega.tsx`:**
- Novo card "Configuração da taxa de entrega" no topo com 3 cards/radios:
  - Sem taxa de entrega
  - Taxa única → mostra `CurrencyInput` (salva em `tenant.delivery_fee`)
  - Taxa por bairro → mostra a lista atual de bairros
- Botão "Salvar configuração" persiste `delivery_mode` (+ `delivery_fee` quando single).
- A lista de bairros só aparece quando modo = `neighborhood`.

**Modal "Novo/Editar bairro":** adicionar campos `CEP inicial` e `CEP final` (opcionais, com máscara 00000-000) + helper text. Validações descritas acima.

## 4. Checkout (`src/components/storefront/CartDrawer.tsx`)

- Adicionar máscara ao input CEP e botão/autocompletar via ViaCEP (`https://viacep.com.br/ws/{cep}/json/`) preenchendo `street` e `neighborhood`.
- Substituir cálculo atual (linhas 107-122) por chamada a `resolveDeliveryFee` (via `useQuery` com debounce em `cep`+`neighborhood`).
- Exibir estados: "Calculando…", "Grátis" quando 0 e mode `none`, valor normal, ou mensagem: *"Ainda não entregamos neste bairro. Verifique o endereço ou entre em contato com a loja."*
- Bloquear botão "Finalizar pedido" quando `mode === 'entrega'` e `available === false`.
- Persistir `delivery_fee_source` e `delivery_neighborhood_snapshot` ao criar pedido.

## 5. Detalhes técnicos

- ViaCEP é chamado direto do client (CORS permitido, sem chave). Falha silenciosa: usuário digita manualmente.
- Match de CEP: normalizar para 8 dígitos e comparar como string (zero-padded) — funciona porque CEPs BR têm tamanho fixo.
- Match de bairro: `lower(unaccent(...))`. Como `unaccent` exige extensão, faço normalização em JS no server fn (sem extensão no DB).
- Migração de dados: tenants existentes recebem `delivery_mode = 'neighborhood'` se já têm `delivery_zones`, senão `'single'`. Não muda o valor cobrado hoje.

## 6. Critérios de aceite

- Admin pode escolher entre os 3 modos; campos irrelevantes ficam ocultos.
- Modo "Sem taxa" → checkout mostra "Grátis", total não soma frete.
- Modo "Taxa única" → valor configurado aparece e soma ao total; se admin não configurou, mostra R$ 0,00 (não R$ 5,00 mágico).
- Modo "Por bairro" + CEP digitado → autopreenche rua/bairro e aplica taxa do range.
- CEP fora de área → mensagem clara, checkout bloqueado.
- Pedido salvo guarda fee, source e bairro snapshot.
