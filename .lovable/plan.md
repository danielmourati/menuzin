# Corrigir "Algo deu errado" em /admin/produtos

## Causa
A página Produtos tem um atalho "Vamos montar seu cardápio" para lojas sem categorias. Esse atalho sai da tela no meio do código, antes de alguns controles internos (teclas F2/Esc do editor) serem preparados. Quando a loja carrega e descobre que tem zero categorias — exatamente o caso da Pizzaria Dominus, cujo cardápio foi zerado — o React percebe que a tela "mudou de formato" entre uma renderização e outra e quebra com "Algo deu errado". Lojas com categorias abrem normalmente, por isso o erro parecia intermitente.

## Correção
- Em `src/routes/admin.produtos.tsx`, mover o bloco de retorno antecipado (tela vazia "Vamos montar seu cardápio") para depois de todos os `useRef`/`useEffect` (logo antes do `return` principal), sem mudar o visual.
- Varrer o arquivo (e o `PizzaConfig`/subcomponentes) por outros `return` antes de hooks.

## Verificação
- Abrir /admin/produtos com uma loja sem categorias (Pizzaria Dominus) via Playwright autenticado e confirmar que aparece a tela "Vamos montar seu cardápio" sem erro no console.
- Abrir com uma loja com cardápio (Pastelão Junin) e confirmar a lista.
