## Escopo

Duas alterações de UI no storefront, sem mexer em regras de negócio.

### 1. Ícone "Cupons" na navbar do rodapé (mobile)

Arquivo: `src/components/storefront/MobileBottomNav.tsx`

- Passar de `grid-cols-3` para `grid-cols-4`.
- Inserir um novo item entre "Cardápio" e "Carrinho" (ou como último — ver observação abaixo):
  - Ícone `Ticket` (lucide, já usado em outras telas).
  - Label: **Cupons**.
  - `<Link to="/$slug/cupons" params={{ slug }}>` com `activeProps` marcando `text-primary`.
- A rota `/$slug/cupons` já existe (`src/routes/$slug.cupons.tsx`) e lista cupons ativos + link para promoções. Não é preciso criar rota nova.

Observação de ordem sugerida: **Cardápio · Cupons · Carrinho · Pedido/Pedidos** — mantém o carrinho no centro-direita, próximo do polegar, e o novo item ao lado do Cardápio (navegação passiva junto de navegação passiva).

### 2. Bloquear edição de Rua e Bairro no checkout

Arquivo: `src/components/storefront/CartDrawer.tsx` (linhas ~955–991)

- Input **Rua**: adicionar `readOnly`, remover foco de edição visual (`cursor-not-allowed bg-muted/40`), manter `value={street}`. O preenchimento continua vindo automaticamente do lookup do CEP (`lookupByCep` → `setStreet(r.logradouro)`).
- Input **Bairro** (apenas no modo `deliveryMode !== "neighborhood"`, onde hoje é um `<Input>` livre): mesmas props (`readOnly`, estilo desabilitado). No modo `neighborhood` já é um `<Select>` controlado pelas zonas cadastradas — nada muda ali.
- Manter os `onChange` existentes (React exige quando o campo é controlado), mas o `readOnly` impede digitação.
- Adicionar um hint discreto abaixo do bloco CEP: *"Rua e bairro são preenchidos automaticamente pelo CEP para garantir o cálculo correto da taxa de entrega."*

### Fora de escopo

- Backend, schema, cupons, cálculo de taxa, ViaCEP, zonas de entrega.
- Navbar desktop (a `MobileBottomNav` só aparece em `md:hidden`; o menu lateral da loja já tem acesso a cupons/promoções).
- Nenhuma alteração no admin.

### Ponto em aberto

Se o CEP consultado pelo ViaCEP não retornar logradouro (acontece em cidades pequenas onde o CEP é único para toda a cidade), Rua ficará vazia e o cliente não poderá digitar. Duas opções:

- **A (recomendado)**: manter `readOnly` sempre — mais seguro contra inconsistências, como você pediu. Se ViaCEP não trouxer rua, o cliente precisa corrigir o CEP.
- **B**: liberar edição apenas quando o retorno do ViaCEP vier vazio (`readOnly={Boolean(streetFromCep)}`).

Vou seguir com a opção **A** salvo indicação contrária.