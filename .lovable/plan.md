## Objetivo

Refatorar a home do **Guia Menuzin** (`/guia`) adaptando o layout do menudino.com/delivery/parnaiba-pi ao design system atual do MenuZin, e criar uma **área exclusiva de superadmin** (`/platform/guia/*`) para gerir tudo que aparece no guia (categorias, destaques, banners, coleções, promoções em cards e carrosséis). Nesta iteração seguimos com **dados mockados** — a área do superadmin já existe funcionalmente (CRUDs em memória/localStorage), pronta para trocarmos por persistência real depois. Fecha a home com um card CTA **"Publique seu cardápio grátis no MenuZin"**.

Fora do escopo agora: pagamento PIX real dos destaques, persistência em banco, mudanças em `/guia/$categoria` e `/guia/produto/$id`.

## Referência de layout (Menudino)

Adaptado ao nosso design system (tokens semânticos, `rounded-2xl`, fontes atuais):

```text
[Header sticky] logo Menuzin • cidade/bairro (mock) • busca • sino
[Hero banner rotativo] carrossel full-width com 3 slides (mock)
[Chips de cidade/bairro] pills horizontais (Parnaíba-PI ativo)
[Categorias em grid] 4 col mobile / 8 col desktop, emoji + label
[Destaques da semana] carrossel horizontal de cards de PRODUTO com % OFF
[Lojas em alta] grid 2/4 col — logo, nome, nota, taxa entrega
[Banner full promocional] 1 faixa full-width com gradiente
[Coleções] carrossel de cards altos aspect-[3/4]
[Ofertas relâmpago] carrossel de cards com contagem regressiva (mock)
[Card CTA final] "Publique seu cardápio grátis no MenuZin" → /admin/login ou landing
[Bottom nav mobile fake]
```

Cada bloco (exceto categorias) é alimentado por **slots gerenciáveis** pelo superadmin.

## Modelo de dados mock (frontend-only)

Criar `src/lib/guia-mock.ts` com tipos + store em memória (com `localStorage` para persistir entre reloads do superadmin):

```ts
type GuiaSlotKind =
  | "hero"           // carrossel topo
  | "featured"       // destaques da semana (produtos)
  | "top_stores"     // lojas em alta
  | "banner"         // banner full-width
  | "collection"     // card de coleção
  | "flash_offer";   // oferta relâmpago

type GuiaSlot = {
  id: string;
  kind: GuiaSlotKind;
  title: string;
  subtitle?: string;
  image?: string;       // URL/emoji/gradiente
  gradient?: string;    // tailwind gradient class
  href?: string;
  price?: number;
  promoPrice?: number;
  discountPct?: number;
  rating?: number;
  deliveryFee?: number;
  storeName?: string;
  endsAt?: string;      // ISO — para flash_offer
  tenantId?: string;    // referência ao anunciante (mock)
  active: boolean;
  sortOrder: number;
  createdAt: string;
};

type GuiaCategory = {
  id: string;
  slug: string;
  label: string;
  emoji: string;
  active: boolean;
  sortOrder: number;
};

type GuiaPromoRequest = {
  id: string;
  tenantName: string;
  slotKind: GuiaSlotKind;
  amount: number;
  status: "pending_payment" | "paid" | "rejected";
  pixCode?: string;   // mock
  createdAt: string;
};
```

- CRUD 100% cliente (in-memory + localStorage `menuzin.guia.mock.v1`).
- Seeds pré-populados iguais aos mocks atuais da home, para a UI já abrir cheia.
- Exportar hooks: `useGuiaSlots(kind?)`, `useGuiaCategories()`, `useGuiaPromoRequests()` com `subscribe` simples (event emitter).

## Área do superadmin — `/platform/guia/*`

Já existe layout `platform.*` para `platform_admin`. Aproveitar `beforeLoad` existente e adicionar item "Guia Menuzin" no menu platform.

Rotas novas (todas gate `platform_admin`):

- `src/routes/platform.guia.tsx` — layout com sub-nav (Visão geral / Categorias / Slots / Solicitações de destaque).
- `src/routes/platform.guia.index.tsx` — visão geral: contadores por tipo de slot, últimos pedidos de destaque, preview da home em iframe (`/guia`).
- `src/routes/platform.guia.categorias.tsx` — CRUD de categorias (label, emoji, slug, ativo, ordem via drag/arrow buttons).
- `src/routes/platform.guia.slots.tsx` — CRUD unificado com filtro por `kind` (hero, featured, banner, coleção, top_stores, flash_offer). Form com campos condicionais por tipo, preview do card, toggle ativo, reordenar, duplicar.
- `src/routes/platform.guia.solicitacoes.tsx` — lista de solicitações de destaque vindas dos tenants (mock). Ações: gerar código PIX fake, marcar como pago, rejeitar. Quando marcado como pago, cria automaticamente um slot correspondente.

Componentes:
- `PlatformGuiaLayout` com tabs `@tanstack/react-router` `Link`.
- `SlotFormDialog` (shadcn Dialog) reaproveitado nas telas.
- `SlotPreviewCard` que renderiza cada `kind` no mesmo estilo da home — assim o admin vê o mesmo card que o usuário verá.

Tudo escrito com componentes shadcn já existentes (`Dialog`, `Input`, `Select`, `Switch`, `Card`, `Button`, `Badge`).

## Refactor da home `/guia`

Reescrever `src/routes/guia.index.tsx`:

- Ler slots via `useGuiaSlots(kind)` em vez de constantes hardcoded.
- Ler categorias via `useGuiaCategories()` (substitui `DIRECTORY_CATEGORIES` na home; rotas filhas continuam usando o array atual).
- Manter fallback quando lista vazia → mensagem "em breve".
- Novos blocos: Hero carousel (usar `embla-carousel-react` já presente ou implementar com `overflow-x-auto snap-x` simples — preferir snap nativo para evitar dependência nova).
- **Card CTA final** full-width, gradiente do brand, texto grande "Publique seu cardápio grátis no MenuZin" + subtítulo "Crie sua loja em 2 minutos, receba pedidos pelo WhatsApp" + botão `Link to="/admin/login"` "Começar grátis".
- Bottom nav decorativo mantido.

## Fluxo de "solicitação de destaque" pelo tenant (stub, mock)

Adicionar na tela existente `/admin/diretorio` um botão **"Solicitar destaque no Guia"** que abre modal:
- Escolher tipo de slot (Hero / Banner / Coleção / Destaque).
- Escolher duração (7 / 14 / 30 dias) com preços mockados.
- Ao confirmar → cria `GuiaPromoRequest` em `pending_payment`, mostra QR/código PIX fake e instruções.
- Copy explícito: "Listagem no Guia é sempre grátis. Este destaque é opcional."

Sem chamadas de servidor; apenas gera item que aparece em `/platform/guia/solicitacoes` para o superadmin resolver.

## Design system

- Nada de cores hardcoded fora de gradientes decorativos em banners/coleções.
- Tipografia: manter fontes atuais; títulos de seção `text-xl font-black`.
- Cards: `rounded-2xl`, `bg-card`, `border`, `shadow-sm`.
- Chips: `rounded-full` com estado ativo `bg-primary text-primary-foreground`.
- Skeletons em cada bloco enquanto o `useSyncExternalStore` da store mock inicializa.

## Arquivos tocados

Criados:
- `src/lib/guia-mock.ts` (store + tipos + seeds + hooks)
- `src/components/guia/SlotCard.tsx` (renderiza cada `kind`)
- `src/components/guia/SlotFormDialog.tsx`
- `src/components/platform/PlatformGuiaLayout.tsx`
- `src/routes/platform.guia.tsx`
- `src/routes/platform.guia.index.tsx`
- `src/routes/platform.guia.categorias.tsx`
- `src/routes/platform.guia.slots.tsx`
- `src/routes/platform.guia.solicitacoes.tsx`

Editados:
- `src/routes/guia.index.tsx` (consome mock store, novo layout, CTA final)
- `src/routes/admin.diretorio.tsx` (botão "Solicitar destaque" + modal PIX mock)
- `src/components/admin/AdminLayout.tsx` (nada — o item de menu do platform admin fica na navegação platform, não no admin do tenant)
- Adicionar link "Guia Menuzin" na navegação de `/platform/*` (procurar layout platform ou header e inserir)

Sem alterações: server functions, migrações, `directory.functions.ts`, `directory-admin.functions.ts`, rotas `/guia/$categoria` e `/guia/produto/$id`, `/admin/*` fora de `admin.diretorio.tsx`.

## Riscos e mitigação

- **localStorage inconsistente em SSR** → toda leitura da store via `useSyncExternalStore` com `getServerSnapshot` retornando seeds; hidratação segura.
- **Confusão entre mock e real** → banner discreto no `/platform/guia` "Modo demonstração — dados não persistem no servidor".
- **Reordenação** → botões ↑/↓ simples em vez de dnd-kit para não adicionar dependência.
- **Rota `platform.guia.*` sem gate** → seguir o mesmo padrão usado em `platform.dashboard.tsx` (ler contexto e redirect se não `platform_admin`).

## Fora do escopo desta iteração

- Persistência real em banco / migrations.
- Integração real de PIX (Mercado Pago) — apenas UI stub.
- Repaginação de `/guia/$categoria` e `/guia/produto/$id`.
- Analytics/relatórios de performance de slots.
