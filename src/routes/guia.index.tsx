import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import {
  listCategories,
  listFeatured,
  DIRECTORY_CATEGORIES,
} from "@/lib/directory.functions";
import { productImage } from "@/lib/product-image";
import { brl } from "@/lib/format";
import {
  Bell,
  ChevronRight,
  Home,
  MapPin,
  MessageSquare,
  Receipt,
  Search,
  Star,
  User,
} from "lucide-react";

const categoriesQO = queryOptions({
  queryKey: ["guia", "categories"],
  queryFn: () => listCategories(),
});
const featuredQO = queryOptions({
  queryKey: ["guia", "featured"],
  queryFn: () => listFeatured(),
});

export const Route = createFileRoute("/guia/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(categoriesQO),
      context.queryClient.ensureQueryData(featuredQO),
    ]);
    return { origin: "https://menuzin.app" };
  },
  head: () => ({
    meta: [
      { title: "Guia Menuzin — comida do seu bairro em Parnaíba" },
      {
        name: "description",
        content:
          "Descubra restaurantes, marmitex, pizzas, açaí e mais no seu bairro. Peça direto pelo WhatsApp.",
      },
      { property: "og:title", content: "Guia Menuzin — comida do seu bairro" },
      {
        property: "og:description",
        content:
          "O guia local dos restaurantes e comidas de Parnaíba. Peça direto pelo WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://menuzin.app/guia" },
    ],
    links: [{ rel: "canonical", href: "https://menuzin.app/guia" }],
  }),
  component: GuiaHome,
});

// ---------- MOCK DATA ----------

const VERTICALS = [
  { id: "restaurantes", label: "restaurantes", emoji: "🍔" },
  { id: "mercados", label: "mercados", emoji: "🛒" },
  { id: "conveniencias", label: "conveniências", emoji: "🍺" },
];

type MockStore = {
  id: string;
  name: string;
  emoji: string;
  gradient: string;
  deliveryFee: number;
  rating: number;
  hasCoupon?: boolean;
};

const MOCK_STORES: MockStore[] = [
  { id: "s1", name: "Ponto BB Açaiteria", emoji: "🍨", gradient: "from-purple-500 to-fuchsia-500", deliveryFee: 5.99, rating: 4.9, hasCoupon: true },
  { id: "s2", name: "Pastelão Brothers", emoji: "🥟", gradient: "from-yellow-400 to-orange-500", deliveryFee: 6.5, rating: 4.8 },
  { id: "s3", name: "Casa do Javali", emoji: "🍖", gradient: "from-amber-700 to-stone-600", deliveryFee: 7.0, rating: 4.9, hasCoupon: true },
  { id: "s4", name: "LAC Lanches", emoji: "🍔", gradient: "from-orange-500 to-red-500", deliveryFee: 4.99, rating: 4.7 },
  { id: "s5", name: "Ponto da Esfiha PHB", emoji: "🥙", gradient: "from-red-500 to-rose-600", deliveryFee: 4.0, rating: 4.9 },
  { id: "s6", name: "La Massa", emoji: "🍕", gradient: "from-yellow-500 to-amber-700", deliveryFee: 8.99, rating: 4.9, hasCoupon: true },
];

type MockPromo = {
  id: string;
  name: string;
  store: string;
  emoji: string;
  gradient: string;
  price: number;
  promoPrice: number;
  discount: number;
  rating: number;
};

const MOCK_PROMOS: MockPromo[] = [
  { id: "p1", name: "Esfiha aberta 8un", store: "Ponto da Esfiha", emoji: "🥙", gradient: "from-red-500 via-rose-500 to-orange-500", price: 39.9, promoPrice: 23.94, discount: 40, rating: 4.9 },
  { id: "p2", name: "Pizza grande 8 fatias", store: "La Massa", emoji: "🍕", gradient: "from-yellow-600 via-amber-600 to-stone-700", price: 55.9, promoPrice: 39.13, discount: 30, rating: 4.9 },
  { id: "p3", name: "Espeto misto 6un", store: "Maria Espetos", emoji: "🍢", gradient: "from-amber-600 via-orange-700 to-red-800", price: 32.0, promoPrice: 25.6, discount: 20, rating: 4.9 },
  { id: "p4", name: "Combo hambúrguer duplo", store: "LAC Lanches", emoji: "🍔", gradient: "from-orange-500 via-red-500 to-rose-600", price: 34.9, promoPrice: 24.43, discount: 30, rating: 4.8 },
  { id: "p5", name: "Açaí 700ml completo", store: "Ponto BB", emoji: "🍨", gradient: "from-purple-600 via-fuchsia-500 to-pink-500", price: 28.0, promoPrice: 19.6, discount: 30, rating: 4.9 },
  { id: "p6", name: "Marmitex família", store: "Casa do Javali", emoji: "🍱", gradient: "from-emerald-600 via-lime-600 to-amber-500", price: 45.0, promoPrice: 31.5, discount: 30, rating: 4.9 },
];

type MockCollection = {
  id: string;
  title: string;
  subtitle: string;
  gradient: string;
  emoji: string;
};

const MOCK_COLLECTIONS: MockCollection[] = [
  { id: "c1", title: "Torcida com fome", subtitle: "combos até 40% OFF pra ver o jogo", gradient: "from-emerald-600 via-green-600 to-lime-500", emoji: "⚽" },
  { id: "c2", title: "Rangos leves e fresquinhos", subtitle: "com até 35% OFF", gradient: "from-cyan-500 via-teal-500 to-emerald-500", emoji: "🥗" },
  { id: "c3", title: "Quem é Menuzin economiza", subtitle: "seu pedido de R$22 por só R$12", gradient: "from-fuchsia-600 via-purple-600 to-indigo-600", emoji: "💸" },
  { id: "c4", title: "Doce e cremoso", subtitle: "sobremesas do bairro em até 25% OFF", gradient: "from-pink-500 via-rose-500 to-red-500", emoji: "🍰" },
];

// ---------- COMPONENT ----------

function GuiaHome() {
  const { data: catsData } = useSuspenseQuery(categoriesQO);
  const { data: featData } = useSuspenseQuery(featuredQO);
  const featured = featData.items;
  const [vertical, setVertical] = useState("restaurantes");

  return (
    <div className="min-h-screen bg-muted/30 pb-24 md:pb-16">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 pb-2 pt-3">
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold leading-tight">
                  Rua Armando Burlamaque, 438{" "}
                  <ChevronRight className="inline h-3.5 w-3.5" />
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Parnaíba - PI
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Mensagens"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-background text-muted-foreground hover:text-foreground"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Notificações"
              className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-background text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                6
              </span>
            </button>
          </div>

          {/* Verticals */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {VERTICALS.map((v) => {
              const active = v.id === vertical;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVertical(v.id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-transparent bg-background text-muted-foreground"
                  }`}
                >
                  <span className="text-lg leading-none">{v.emoji}</span>
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-5">
        {/* Lojas em alta */}
        <Section
          title={<>lojas em alta por aqui <span>✨</span></>}
          subtitle="só rango top pro seu jantar 🍔🍕🥩"
        >
          <div className="grid grid-cols-1 gap-3 rounded-3xl bg-card p-3 shadow-sm sm:grid-cols-2">
            {MOCK_STORES.slice(0, 4).map((s) => (
              <StoreRow key={s.id} store={s} />
            ))}
          </div>
        </Section>

        {/* Pra driblar a fome */}
        <Section
          title={<>pra driblar a fome <span>⚽🍕</span></>}
          subtitle="e gritar gol de barriga cheia 😋"
        >
          {/* Big banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-500 p-5 text-white shadow-md">
            <div className="relative z-10 max-w-[70%]">
              <p className="text-xs font-black uppercase tracking-widest opacity-90">
                Menuzin oficial
              </p>
              <p className="mt-1 text-2xl font-black leading-tight">
                Coadjuvante da paixão nacional
              </p>
              <p className="mt-2 inline-block rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-purple-900">
                entra em campo com até 40% OFF
              </p>
            </div>
            <div className="pointer-events-none absolute -right-4 -top-4 select-none text-[9rem] leading-none opacity-30">
              🍕
            </div>
          </div>

          {/* Promo scroller */}
          <div className="mt-4 -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {MOCK_PROMOS.map((p) => (
              <PromoCard key={p.id} promo={p} />
            ))}
          </div>
        </Section>

        {/* Coleções */}
        <Section
          title="coleções de lojas e promos"
          action="ver tudo"
        >
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {MOCK_COLLECTIONS.map((c) => (
              <div
                key={c.id}
                className={`relative aspect-[3/4] w-44 shrink-0 snap-start overflow-hidden rounded-3xl bg-gradient-to-br ${c.gradient} p-4 text-white shadow-md`}
              >
                <p className="text-[10px] font-black uppercase tracking-widest opacity-90">
                  coleção
                </p>
                <p className="mt-1 text-lg font-black leading-tight drop-shadow">
                  {c.title}
                </p>
                <p className="mt-1 text-xs font-medium opacity-95">
                  {c.subtitle}
                </p>
                <div className="pointer-events-none absolute -bottom-4 -right-2 select-none text-[7rem] leading-none opacity-40">
                  {c.emoji}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Banner cheio */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-purple-700 to-fuchsia-600 p-6 text-white shadow-md">
          <div className="relative z-10">
            <p className="text-3xl font-black leading-none">CERVEJAS</p>
            <p className="text-xl font-black tracking-wide">
              ZERO ÁLCOOL <span className="text-yellow-300">·</span> pra torcer de boa!
            </p>
            <span className="mt-3 inline-block rounded-full bg-yellow-300 px-3 py-1 text-xs font-black text-purple-900">
              lojas perto de você
            </span>
          </div>
          <div className="pointer-events-none absolute -right-2 top-2 select-none text-[7rem] leading-none opacity-30">
            🍻
          </div>
        </div>

        {/* Categorias reais */}
        <Section title="categorias" subtitle="explora o que rola no seu bairro">
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
            {DIRECTORY_CATEGORIES.map((c) => {
              const count =
                catsData.categories.find((x) => x.slug === c.slug)?.count ?? 0;
              return (
                <Link
                  key={c.slug}
                  to="/guia/$categoria"
                  params={{ categoria: c.slug }}
                  className="group flex flex-col items-center gap-1.5 rounded-2xl bg-card p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="text-3xl transition group-hover:scale-110">
                    {c.emoji}
                  </span>
                  <span className="text-xs font-semibold leading-tight lowercase">
                    {c.label}
                  </span>
                  {count > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {count} {count === 1 ? "opção" : "opções"}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </Section>

        {/* Lojas em alta (extras) */}
        <Section
          title={<>mais lojas queridinhas <span>💜</span></>}
          subtitle="pedidos rolando sem parar no bairro"
        >
          <div className="grid grid-cols-1 gap-3 rounded-3xl bg-card p-3 shadow-sm sm:grid-cols-2">
            {MOCK_STORES.slice(2).map((s) => (
              <StoreRow key={s.id} store={s} />
            ))}
          </div>
        </Section>

        {/* Destaques reais (se houver) */}
        {featured.length > 0 && (
          <Section
            title={<>em destaque agora <span>🔥</span></>}
            subtitle="lançamentos do bairro, direto do WhatsApp da loja"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((it) => (
                <Link
                  key={it.product_id}
                  to="/guia/produto/$id"
                  params={{ id: it.product_id }}
                  className="group overflow-hidden rounded-2xl bg-card shadow-sm transition hover:shadow-md"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    <img
                      src={productImage(it.image_url)}
                      alt={it.name}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-primary-foreground shadow">
                      <Star className="h-3 w-3 fill-current" /> destaque
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-1 text-sm font-bold">{it.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {it.tenant_name}
                      {it.neighborhood ? ` · ${it.neighborhood}` : ""}
                    </p>
                    <p className="mt-1 text-sm font-black text-primary">
                      {brl(it.promo_price ?? it.price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        )}
      </main>

      {/* Bottom nav mobile */}
      <nav
        aria-label="Navegação"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur md:hidden"
      >
        <div className="mx-auto flex max-w-5xl items-end justify-between px-4 py-2">
          <BottomTab icon={<Home className="h-5 w-5" />} label="início" active />
          <BottomTab icon={<Search className="h-5 w-5" />} label="busca" />
          <div className="-mt-6 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-2xl text-primary-foreground shadow-lg">
            🍔
          </div>
          <BottomTab icon={<Receipt className="h-5 w-5" />} label="pedidos" />
          <BottomTab icon={<User className="h-5 w-5" />} label="conta" />
        </div>
      </nav>
    </div>
  );
}

// ---------- SUB COMPONENTS ----------

function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: React.ReactNode;
  subtitle?: string;
  action?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-black leading-tight tracking-tight lowercase">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {action && (
          <button
            type="button"
            className="shrink-0 text-xs font-bold text-primary hover:underline"
          >
            {action} <ChevronRight className="inline h-3 w-3" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function StoreRow({ store }: { store: MockStore }) {
  return (
    <button
      type="button"
      className="flex items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-muted/60"
    >
      <div
        className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${store.gradient} text-2xl shadow-inner`}
      >
        <span aria-hidden>{store.emoji}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-bold">{store.name}</p>
          {store.hasCoupon && (
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-500 text-[9px] font-black text-white">
              %
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            🛵 <span className="font-semibold text-foreground">{brl(store.deliveryFee)}</span>
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            <span className="font-semibold text-foreground">
              {store.rating.toFixed(1)}
            </span>
          </span>
        </div>
      </div>
    </button>
  );
}

function PromoCard({ promo }: { promo: MockPromo }) {
  return (
    <button
      type="button"
      className="w-40 shrink-0 snap-start text-left"
    >
      <div
        className={`relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br ${promo.gradient} shadow-md`}
      >
        <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-lg bg-yellow-400 px-1.5 py-0.5 text-[10px] font-black text-stone-900 shadow">
          <Star className="h-3 w-3 fill-current" /> {promo.rating.toFixed(1)}
        </div>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-6xl opacity-90 drop-shadow-lg">
          {promo.emoji}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-center">
          <span className="rounded-md bg-white/95 px-2 py-0.5 text-xs font-black text-red-600">
            {promo.discount}% OFF
          </span>
        </div>
      </div>
      <p className="mt-2 line-clamp-1 text-sm font-bold">{promo.name}</p>
      <p className="line-clamp-1 text-[11px] text-muted-foreground">
        {promo.store}
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-sm font-black text-emerald-600">
          {brl(promo.promoPrice)}
        </span>
        <span className="text-[11px] text-muted-foreground line-through">
          {brl(promo.price)}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground">🛵 {brl(4)}</p>
    </button>
  );
}

function BottomTab({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`flex w-14 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-bold transition ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      <span className="lowercase">{label}</span>
    </button>
  );
}
