## Reorganizar sidebar do admin por seções

Hoje os 12 itens do menu (`src/components/admin/AdminLayout.tsx`) são uma lista plana e desordenada. Vou agrupá-los por contexto de uso, em ordem de importância operacional.

### Nova estrutura

```text
OPERAÇÃO
  • Dashboard
  • Pedidos
  • Relatórios
  • Avaliações

CARDÁPIO
  • Produtos
  • Categorias
  • Adicionais
  • Grupos de observação

VENDAS
  • Cupons
  • Taxas de entrega

PERSONALIZAÇÃO
  • Aparência
  • Configurações
```

Critério: o dono da loja abre o painel primeiro para ver/atender pedidos → Operação no topo. Depois gerencia o que vende → Cardápio. Promoções e logística de entrega ficam juntas em Vendas. Ajustes visuais e técnicos por último.

### Alterações em `src/components/admin/AdminLayout.tsx`

1. Trocar o array plano `items` por uma estrutura `sections: { label, items[] }[]`.
2. Renderizar cada seção com um label pequeno em caixa alta (estilo `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mt-3 mb-1`).
3. Quando o sidebar está **colapsado** (`collapsed=true`), esconder os labels de seção e mostrar apenas um divisor sutil (`<div className="my-1 h-px bg-sidebar-border/60" />`) entre grupos — mantém a hierarquia visual sem texto.
4. Manter intactos: rotas, ícones atuais, tooltips no modo colapsado, comportamento do mobile sheet, item ativo, e área de rodapé (Ver loja pública / Sair).

### Fora do escopo

- Não criar novas rotas nem renomear páginas existentes.
- Não mexer em `__root.tsx` nem migrar para o componente `shadcn/Sidebar` (atual é um sidebar custom já funcional; troca exigiria refactor sem ganho pedido).

### Arquivo alterado

- `src/components/admin/AdminLayout.tsx`
