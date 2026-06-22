
# Plano de melhorias — Admin & Fluxo do Cliente

Vou aplicar as mudanças em fases incrementais, sem refatorar módulos não relacionados e preservando multi-tenant, RLS, checkout, impressão e notificações.

---

## Fase 1 — Correções rápidas de admin

**1. Modal "Vamos criar sua loja" não deve aparecer para tenants existentes**
- Em `admin.index.tsx` (e/ou layout admin) validar `profile.tenant_id` antes de renderizar o onboarding.
- Se já existe tenant → redirecionar para `/admin/dashboard`.
- Onboarding só aparece quando: usuário autenticado **sem** `tenant_id` vinculado.

**2. Aumentar limite de caracteres na saudação do dashboard**
- Em `admin.dashboard.tsx` remover truncamento agressivo do nome.
- Layout com `min-w-0` + `truncate` somente quando realmente necessário (mobile estreito).
- Suportar nomes completos tipo "João Pedro Almeida".

---

## Fase 2 — Modal de detalhes do pedido (admin)

**3. Accordion exclusivo + borda ativa**
- Em `OrderDetailsDrawer.tsx` / `OrderStatusTimeline.tsx`: trocar `<Accordion type="multiple">` por `type="single" collapsible`.
- Item ativo recebe `border border-[#FDE8DE]`; inativos sem borda.
- Transições suaves via classes utilitárias já existentes do Radix.

---

## Fase 3 — Ordenação manual (produtos, categorias, adicionais, observações)

**Migração de banco** (uma única migração):
- Adicionar coluna `sort_order int not null default 0` em:
  - `products`, `categories`, `addition_groups`, `additions`, `observation_groups`, `observations` (confirmar nomes exatos ao explorar).
- Backfill: `sort_order = row_number()` por tenant/grupo.
- Índices `(tenant_id, sort_order)`.

**UI admin (arrow buttons ▲▼ — mais simples e robusto que DnD)**:
- `admin.produtos.tsx`, `admin.categorias.tsx`, `admin.adicionais.tsx`, `admin.observacoes.tsx`: botões mover-acima/mover-abaixo em cada linha.
- Server fn `reorder` por entidade que troca `sort_order` entre o item alvo e o vizinho.

**Leitura**:
- `catalog.functions.ts` e `catalog-admin.functions.ts`: ordenar por `sort_order asc, created_at asc`.
- Storefront público (`loja.$slug.tsx`, `$slug.tsx`) já consome `getCatalog` → respeitará a ordem automaticamente.

---

## Fase 4 — Modal criar/editar produto (admin)

**4. Não fechar acidentalmente**
- No `Dialog` do produto em `admin.produtos.tsx`:
  - `onPointerDownOutside={e => e.preventDefault()}`
  - `onEscapeKeyDown={e => e.preventDefault()}`
  - `onInteractOutside={e => e.preventDefault()}`
- Fechar somente em: botão "Cancelar", botão "X" explícito, ou após `Salvar` bem-sucedido (try/catch — mantém aberto em erro).

---

## Fase 5 — Navegação inferior mobile (storefront)

**5. Bottom nav fixa**
- Novo componente `src/components/storefront/MobileBottomNav.tsx`.
- Ícones: Início, Cardápio, Carrinho (com badge), Pedidos, Perfil.
- `fixed bottom-0` + `pb-[env(safe-area-inset-bottom)]`, `md:hidden`.
- Adicionar `pb-20 md:pb-0` no container do storefront para não sobrepor conteúdo.
- Esconder quando `CartDrawer`/checkout footer estiver visível (via context do carrinho) para não duplicar CTA.
- Renderizar em `loja.$slug.tsx` e `$slug.tsx` (storefront).

---

## Fase 6 — Persistência do fluxo de pedido

**6. Carrinho + checkout em localStorage**
- Estender `cart-context.tsx` para serializar/restaurar:
  - itens, opções selecionadas, nome, telefone, tipo (entrega/retirada), endereço, pagamento, cupom, observações, step atual.
- Chave por tenant: `menuzin:order:<slug>`.
- TTL: 24h (timestamp ao salvar; descartar se expirado).
- Limpar após: pedido criado com sucesso (`/pedido-confirmado`), clique em "Limpar carrinho", ou expiração.

---

## Fase 7 — Tela de dados do cliente (retirada)

**7. Remover e-mail e CPF/CNPJ em pickup**
- No componente de dados do cliente (drawer de checkout): renderizar e-mail/CPF apenas quando `orderType === 'delivery'` (ou conforme configuração da loja).
- Atualizar validação Zod correspondente para não exigir esses campos em retirada.

---

## Fase 8 — Avaliação pós-pedido

**8. Star rating + NPS opcional**
- Migração: tabela `public.order_ratings`
  - `tenant_id`, `order_id` (unique), `customer_phone`, `stars` (1–5), `nps` (0–10 nullable), `comment` text, timestamps.
  - GRANTs + RLS: insert público anônimo permitido apenas quando o `order_id` existe; select restrito ao tenant.
  - Constraint `unique(order_id)` previne duplicatas.
- Server fn `submitOrderRating` (pública, valida que o pedido existe).
- UI: card de avaliação nas páginas `/$slug/acompanhar/$orderId` e `/loja/$slug/acompanhar/$orderId` quando status = `delivered/completed`.
- Admin: nova rota `admin.avaliacoes.tsx` listando avaliações do tenant (média de estrelas, NPS, comentários).
- Rating é não-bloqueante: pedido é finalizado independente.

---

## Detalhes técnicos

- Todas as server fns novas usam `requireSupabaseAuth` (exceto `submitOrderRating` que é pública com validação).
- Migrações seguem ordem: CREATE → GRANT → RLS → POLICY.
- Tokens semânticos (sem cor hardcoded em componentes) — exceto a borda `#FDE8DE` que o usuário pediu explicitamente, que vou adicionar como token `--accordion-active-border` em `src/styles.css`.
- DnD descartado em favor de botões ▲▼ por robustez mobile e simplicidade.
- Sem mudanças em QZ Tray, impressão, webhooks ou notificações.

## Ordem de execução

1. Fases 1, 2, 4, 9 (rápidas, sem migração)
2. Migração ordenação + Fase 3
3. Fase 5 (bottom nav)
4. Fase 6 (persistência)
5. Fase 7 (pickup)
6. Migração rating + Fase 8

Posso ajustar prioridades se preferir começar por alguma fase específica.
