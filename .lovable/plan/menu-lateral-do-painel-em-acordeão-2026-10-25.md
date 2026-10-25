# Menu lateral do painel em acordeão

## O que muda
- Cada seção do menu (Operação, Cardápio, Vendas & Marketing, Personalização) vira um acordeão: clicar no título abre ou fecha a seção, com uma seta indicando o estado.
- **Operação** começa sempre aberta; as outras começam fechadas.
- Se a página atual pertence a uma seção fechada (ex.: Produtos), essa seção abre sozinha, para o item ativo nunca ficar escondido.
- Mais de uma seção pode ficar aberta ao mesmo tempo.
- Com o menu recolhido (só ícones), o acordeão não se aplica: todos os ícones continuam visíveis, como hoje.
- Vale para o menu do computador e o menu do celular.

## Detalhes técnicos
- `src/components/admin/AdminLayout.tsx`, componente `Nav`: estado `openSections` (Set) iniciado com "Operação" + a seção que contém o pathname atual (`useRouterState`); `useEffect` adiciona a seção da rota ativa ao navegar.
- Título da seção vira `button` com `ChevronDown` rotacionável e `aria-expanded`; itens envolvidos em `Collapsible` (shadcn) ou renderização condicional.
- Modo `collapsed` mantém a renderização atual sem toggles.
