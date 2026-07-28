## Objetivo

1. **Zerar vendas (prioridade)**: apagar todos os pedidos/vendas de todos os tenants.
2. **`/platform/lojas`**: remover agrupamento por tipo de negócio (elimina duplicação de tenants), mantendo os badges.
3. **Home `/` — seção de planos**: redimensionar cards, destacar Presença com borda + badge flutuante "Grátis", botões na cor `#F46622`.
4. **Correção de preço**: `R$ 127,9` → `R$ 127,90` (duas casas decimais sempre).

---

## 1. Zerar vendas de todos os tenants (IRREVERSÍVEL)

Estado atual do banco: 18 pedidos, 27 itens, 44 registros de histórico, 3 avaliações, 0 pagamentos.

Excluir **todos** os registros, de todos os tenants, na ordem segura para as chaves estrangeiras:

1. `order_status_history` (44 linhas)
2. `order_ratings` (3 linhas)
3. `order_items` (27 linhas)
4. `payments` (0 linhas)
5. `orders` (18 linhas)
6. `coupons.used_count` → resetar para `0`

**Preservado**: produtos, categorias, clientes, tenants, assinaturas, configurações.

Efeitos colaterais esperados (desejados): cards "pedidos (30d)"/receita em `/platform/lojas` zeram, dashboards e relatórios dos tenants zeram, e a numeração de pedidos (`orders.number`) volta a começar do 1 em cada loja.

---

## 2. `/platform/lojas` — lista plana sem duplicação (anexo 1)

Arquivo: `src/routes/platform.lojas.tsx` (linhas 155–243).

- Remover a lógica de agrupamento (`Map` por `business_types`) que insere o mesmo tenant em N seções — hoje "Restaurante O Nêgo" aparece 3× (Churrascaria, Restaurante, Marmitaria).
- Renderizar uma única lista `grid gap-3` com **cada loja uma única vez**, mantendo no card todos os badges existentes: status, plano, todos os `business_types` e "inativa".
- Sem alteração em server functions ou dados.

---

## 3. Home — cards de planos (anexos 2 e 3)

Arquivo: `src/routes/index.tsx` (seção `#plans`, linhas 320–400 + array `pricingPlans` linhas 32–69).

- **Redimensionar**: grid `md:grid-cols-3 max-w-5xl` → `md:grid-cols-2 max-w-3xl` (só existem 2 planos; cards param de esticar e cabem melhor no viewport).
- **Destaque Presença** (conforme anexo 3):
  - Card com borda primária + anel: `border-primary ring-2 ring-primary/20 shadow-pop`.
  - Badge "Grátis" como pill flutuante centralizada no topo da borda (mesmo padrão visual do "MAIS ESCOLHIDO" do anexo 3), fundo verde esmeralda.
  - Pro volta ao estilo neutro (sem anel).
- **Botões `#F46622`**: "Criar meu cardápio grátis" e "Profissionalizar meu delivery" passam de `outline` para sólido com fundo `#F46622` (hover escurecido, ex. `#d9561a`) e texto branco — cor exata pedida, aplicada via utilitário arbitrário do Tailwind.

---

## 4. Preço com duas casas decimais (anexo 4)

Arquivo: `src/routes/index.tsx` (linhas 353–362).

- Linha 357: `minimumFractionDigits` muda de `billing === "annual" ? 2 : 0` para sempre `2` → `R$ 127,90/mês` no mensal e `R$ 106,58/mês` no anual.
- Linha 353 ("De R$ {monthly}/mês"): usar formatação pt-BR com 2 casas → `De R$ 127,90/mês`.
- Linha 362 (total anual): `toLocaleString("pt-BR", { minimumFractionDigits: 2 })` → `R$ 1.279,00 por ano`.

---

## Arquivos tocados

| Arquivo | Mudança |
|---|---|
| Banco (via ferramenta de dados) | Deletes nas 5 tabelas + reset `coupons.used_count` |
| `src/routes/platform.lojas.tsx` | Lista plana de lojas |
| `src/routes/index.tsx` | Grid 2 col, destaque Presença, botões `#F46622`, formatação de preço |

## Verificação

- Query de contagem pós-delete confirmando 0 linhas nas 5 tabelas.
- Smoke SSR + screenshot da home `#plans` (badge/botões/preço) e de `/platform/lojas` (sem duplicação).