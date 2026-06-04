## Objetivo

Limpar e corrigir a aba **Entrega** em `/admin/configuracoes` e padronizar todos os inputs de moeda da plataforma com máscara BRL (R$).

---

## 1. Aba Entrega — limpeza e correções

Arquivo: `src/routes/admin.configuracoes.index.tsx`

- **Remover** o input **“Taxa de entrega”** (já é gerenciado em *Bairros e Taxas*). A coluna `delivery_fee` no banco continua existindo como fallback — apenas o input some.
- **Remover** o seletor **“Largura do papel térmico (POS)”** desta aba (já existe em *Configurar Impressora*). A coluna `pos_paper_width` continua sendo persistida lá.
- **Corrigir os 3 toggles** (Aceita entrega / Aceita retirada / Aceita consumo no local): hoje estão hardcoded `value={true}` sem state nem persistência. Passarão a:
  - ler/escrever em 3 novas colunas booleanas em `tenants`: `accepts_delivery`, `accepts_takeout`, `accepts_dinein` (default `true`);
  - serem refletidos no `form` state e salvos via `updateMyTenant`;
  - serem consumidos pelo storefront (`src/routes/$slug.tsx` e `CartDrawer`) para esconder/desabilitar modos de pedido não aceitos.
- **Pedido mínimo**: trocar `<Input type="number">` por componente de moeda BRL (ver §2).

Layout final da aba Entrega:
```text
[ Aceita entrega  (toggle) ] [ Aceita retirada (toggle) ]
[ Aceita consumo no local (toggle) ] [ Pedido mínimo (R$ ____) ]
[ Tempo médio de preparo (texto) ]
```

## 2. Componente único de input de moeda BRL

Criar `src/components/ui/currency-input.tsx`:

- Wrapper sobre `<Input>` que mostra valor formatado como `R$ 1.234,56` enquanto o usuário digita (parsing por dígitos / 100).
- Props: `value: number` (em reais), `onChange: (n: number) => void`, demais props herdadas de Input.
- `inputMode="decimal"`, `type="text"` (não `number`, para suportar a máscara).
- Prefixo `R$` visual dentro do input.

## 3. Aplicar `CurrencyInput` em todos os inputs monetários

Substituir os `<Input type="number" step="0.10/0.01">` que representam valores em R$:

- `src/routes/admin.configuracoes.index.tsx` → Pedido mínimo
- `src/routes/admin.produtos.tsx` → Preço base, Preço promo, preço inline da lista, preço do form de criação, Acréscimo de adicional (inline + form)
- `src/routes/admin.adicionais.tsx` → Preço (inline e form)
- `src/routes/admin.cupons.tsx` → Valor (quando `discount_type === "fixed"`) e Pedido mínimo
- `src/routes/admin.taxas-entrega.tsx` → os 2 inputs de R$ (Taxa e Pedido mínimo do bairro). O input de raio/distância continua como número simples.

Não converter: `min_select`, `max_select`, `max_flavors`, ordem, limite de usos, raio km, quantidades.

## 4. Banco de dados

Migration única adicionando 3 colunas a `tenants`:

```sql
ALTER TABLE public.tenants
  ADD COLUMN accepts_delivery boolean NOT NULL DEFAULT true,
  ADD COLUMN accepts_takeout  boolean NOT NULL DEFAULT true,
  ADD COLUMN accepts_dinein   boolean NOT NULL DEFAULT true;
```

Atualizar:
- `src/lib/tenants.functions.ts` (Zod schema do update + select)
- `src/lib/db-types.ts` / `domain-types.ts` / `db-adapters.ts`

## 5. Storefront — respeitar toggles

Em `src/routes/$slug.tsx` + `CartDrawer.tsx`:
- Esconder a opção de modo (entrega / retirada / consumo local) cujo toggle estiver `false`.
- Se todos estiverem `false`, manter pelo menos entrega habilitada por segurança (fallback defensivo).

## Detalhes técnicos

- Não tocar em `delivery_fee` no banco nem nas funções de pedido — bairros já sobrescrevem.
- `pos_paper_width` continua salvo apenas pela tela de Impressora.
- `CurrencyInput` armazena `number` em reais para manter compatibilidade com Zod (`z.number().min(0)`) — sem mudanças em validators.
- Persistência dos toggles passa pelo `updateMyTenant` existente (apenas adicionar campos no schema).
