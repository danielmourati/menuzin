## Objetivo
Garantir que o modal "Nova categoria" com as opções Pizza / Oferta do Dia (anexo 1) apareça apenas para tenants cujo `business_types` inclui `pizzaria`. Para os demais, o fluxo cria diretamente uma categoria padrão, sem etapa extra.

## Escopo

### 1. `src/routes/admin.categorias.tsx`
- No clique de "Nova categoria":
  - Se `isPizzaria` → abre o picker atual (Itens principais / Pizza / Oferta do Dia).
  - Se não for pizzaria → pula o picker e abre direto o formulário de edição em modo `kind: "standard"` (equivalente ao `openNew("standard")`).
- O `Dialog` do picker continua existindo, mas nunca abre para não-pizzaria.

### 2. `src/routes/admin.cardapio.novo.tsx` (wizard "Novo cardápio")
- Etapa 1 (anexo 2) hoje sempre cria categoria `standard`. Para manter consistência com /categorias:
  - Se `isPizzaria`, ao clicar em "Criar nova" mostrar um seletor compacto de tipo (Itens principais / Pizza / Oferta do Dia) antes do input de nome, e passar o `kind` escolhido para `saveCategory`.
  - Se não for pizzaria, comportamento atual permanece (input direto, `kind: "standard"`).
- Consulta `getMyTenant` já disponível via `tenants.functions` (mesmo padrão de /categorias) para derivar `isPizzaria`.

## Fora de escopo
- Nenhuma mudança em regras de plano, RLS ou schema.
- Layout do picker permanece igual ao anexo 1.
