import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  listCategories,
  listFeatured,
  DIRECTORY_CATEGORIES,
} from "@/lib/directory.functions";
import { productImage } from "@/lib/product-image";
import { brl } from "@/lib/format";
import {
  useGuiaSlots,
  useGuiaCategories,
  useGuiaSectionOrder,
  useGuiaSectionActive,
  type GuiaSectionId,
} from "@/lib/guia-mock";
import { SlotCard } from "@/components/guia/SlotCard";
import {
  Bell,
  ChevronRight,
  Home,
  MapPin,
  MessageSquare,
  Receipt,
  Rocket,
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

const VERTICALS = [
  { id: "restaurantes", label: "restaurantes", emoji: "🍔" },
  { id: "mercados", label: "mercados", emoji: "🛒" },
  { id: "conveniencias", label: "conveniências", emoji: "🍺" },
];

function GuiaHome() {
  const { data: catsData } = useSuspenseQuery(categoriesQO);
  const { data: featData } = useSuspenseQuery(featuredQO);
  const featured = featData.items;

  const heroSlots = useGuiaSlots("hero").filter((s) => s.active);
  const featuredSlots = useGuiaSlots("featured").filter((s) => s.active);
  const topStoresSlots = useGuiaSlots("top_stores").filter((s) => s.active);
  const bannerSlots = useGuiaSlots("banner").filter((s) => s.active);
  const collectionSlots = useGuiaSlots("collection").filter((s) => s.active);
  const flashSlots = useGuiaSlots("flash_offer").filter((s) => s.active);
  const managedCategories = useGuiaCategories(true);
  const sectionOrder = useGuiaSectionOrder();
  const sectionActive = useGuiaSectionActive();

  const [vertical, setVertical] = useState("restaurantes");

  return (
    <div className="min-h-screen bg-muted/30 pb-28 md:pb-16">
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
            <button type="button" aria-label="Mensagens"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-background text-muted-foreground hover:text-foreground">
              <MessageSquare className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Notificações"
              className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-background text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                6
              </span>
            </button>
          </div>

          {/* Search */}
          <label className="mt-3 flex items-center gap-2 rounded-2xl border bg-background px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Busque por lojas, pratos ou promoções…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>

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
        {/* Hero carousel (fixo, sempre no topo) */}
        {heroSlots.length > 0 && <HeroCarousel slots={heroSlots} />}

        {(() => {
          const sectionNodes: Record<GuiaSectionId, React.ReactNode> = {
            categories: (
              <Section
                title="categorias"
                subtitle="explora o que rola no seu bairro"
              >
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
                  {(managedCategories.length > 0 ? managedCategories : DIRECTORY_CATEGORIES.map((c, i) => ({
                    id: c.slug, slug: c.slug, label: c.label, emoji: c.emoji, imageUrl: undefined as string | undefined, imageFit: "cover" as "cover" | "contain", active: true, sortOrder: i,
                  }))).map((c) => {
                    const isReal = DIRECTORY_CATEGORIES.some((d) => d.slug === c.slug);
                    const count = catsData.categories.find((x) => x.slug === c.slug)?.count ?? 0;
                    const inner = (
                      <>
                        {c.imageUrl ? (
                          <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-lg bg-muted">
                            <img
                              src={c.imageUrl}
                              alt=""
                              className={`h-full w-full ${c.imageFit === "contain" ? "object-contain" : "object-cover"} transition group-hover:scale-110`}
                            />
                          </span>
                        ) : c.emoji?.trim() ? (
                          <span className="text-3xl transition group-hover:scale-110">{c.emoji}</span>
                        ) : null}

                        <span className="text-xs font-semibold leading-tight lowercase">{c.label}</span>
                        {count > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {count} {count === 1 ? "opção" : "opções"}
                          </span>
                        )}
                      </>
                    );
                    const cls = "group flex flex-col items-center gap-1.5 rounded-lg bg-card p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md";
                    return isReal ? (
                      <Link key={c.slug} to="/guia/$categoria" params={{ categoria: c.slug }} className={cls}>
                        {inner}
                      </Link>
                    ) : (
                      <div key={c.slug} className={cls}>{inner}</div>
                    );
                  })}
                </div>
              </Section>
            ),

            featured: featuredSlots.length > 0 ? (
              <Section
                title={<>destaques da semana <span>🔥</span></>}
                subtitle="pra driblar a fome com até 40% OFF"
                action="ver tudo"
              >
                <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {featuredSlots.map((s) => (
                    <button key={s.id} type="button" className="shrink-0 snap-start text-left">
                      <SlotCard slot={s} />
                    </button>
                  ))}
                </div>
              </Section>
            ) : null,

            top_stores: topStoresSlots.length > 0 ? (
              <Section
                title={<>lojas em alta por aqui <span>✨</span></>}
                subtitle="só rango top pro seu jantar 🍔🍕🥩"
              >
                <div className="grid grid-cols-1 gap-3 rounded-xl bg-card p-3 shadow-sm sm:grid-cols-2">
                  {topStoresSlots.slice(0, 6).map((s) => (
                    <button key={s.id} type="button" className="rounded-lg text-left transition hover:bg-muted/60">
                      <SlotCard slot={s} />
                    </button>
                  ))}
                </div>
              </Section>
            ) : null,

            flash_offer: flashSlots.length > 0 ? (
              <Section
                title={<>ofertas relâmpago <span>⚡</span></>}
                subtitle="rápido antes que acabe"
              >
                <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {flashSlots.map((s) => (
                    <button key={s.id} type="button" className="shrink-0 snap-start text-left">
                      <SlotCard slot={s} />
                    </button>
                  ))}
                </div>
              </Section>
            ) : null,

            banner_1: bannerSlots[0] ? <SlotCard slot={bannerSlots[0]} /> : null,

            collection: collectionSlots.length > 0 ? (
              <Section title="coleções de lojas e promos" action="ver tudo">
                <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {collectionSlots.map((s) => (
                    <button key={s.id} type="button" className="shrink-0 snap-start text-left">
                      <SlotCard slot={s} />
                    </button>
                  ))}
                </div>
              </Section>
            ) : null,

            banner_2: bannerSlots[1] ? <SlotCard slot={bannerSlots[1]} /> : null,

            featured_real: featured.length > 0 ? (
              <Section
                title={<>em destaque agora <span>🌟</span></>}
                subtitle="lançamentos do bairro, direto do WhatsApp da loja"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {featured.map((it) => (
                    <Link
                      key={it.product_id}
                      to="/guia/produto/$id"
                      params={{ id: it.product_id }}
                      className="group overflow-hidden rounded-lg bg-card shadow-sm transition hover:shadow-md"
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
            ) : null,

            publish_cta: <PublishCta />,
          };

          return sectionOrder.map((id) => (
            <div key={id}>{sectionNodes[id]}</div>
          ));
        })()}
      </main>

      {/* Bottom nav mobile */}
      <nav
        aria-label="Navegação"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur md:hidden"
      >
        <div className="mx-auto flex max-w-5xl items-center justify-around px-4 py-2">
          <BottomTab icon={<Home className="h-5 w-5" />} label="início" active />
          <BottomTab icon={<Search className="h-5 w-5" />} label="busca" />
          <BottomTab icon={<Receipt className="h-5 w-5" />} label="pedidos" />
          <BottomTab icon={<User className="h-5 w-5" />} label="conta" />
        </div>
      </nav>
    </div>
  );
}

// ---------- SUB COMPONENTS ----------

function HeroCarousel({ slots }: { slots: ReturnType<typeof useGuiaSlots> }) {
  const [idx, setIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (slots.length <= 1) return;
    timer.current = setInterval(() => setIdx((i) => (i + 1) % slots.length), 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [slots.length]);

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {slots.map((s) => (
            <div key={s.id} className="w-full shrink-0">
              <SlotCard slot={s} />
            </div>
          ))}
        </div>
      </div>
      {slots.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {slots.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

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

function PublishCta() {
  return (
    <section
      aria-label="Publique seu cardápio"
      className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary via-fuchsia-600 to-purple-700 p-6 text-white shadow-lg sm:p-8"
    >
      <div className="pointer-events-none absolute -right-6 -top-6 select-none text-[8rem] leading-none opacity-25">
        🍽️
      </div>
      <div className="pointer-events-none absolute -bottom-8 -left-4 select-none text-[6rem] leading-none opacity-20">
        🚀
      </div>
      <div className="relative z-10 max-w-xl">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest backdrop-blur">
          <Rocket className="h-3 w-3" /> lojista? bora vender mais
        </span>
        <h2 className="mt-3 text-2xl font-black leading-tight sm:text-4xl">
          Publique seu cardápio grátis no MenuZin
        </h2>
        <p className="mt-2 text-sm opacity-95 sm:text-base">
          Crie sua loja em 2 minutos, receba pedidos direto pelo WhatsApp e apareça de graça no Guia do seu bairro. Sem taxas, sem complicação.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1 rounded-full bg-white px-5 py-2.5 text-sm font-black text-purple-700 shadow-lg transition hover:scale-105"
          >
            Começar grátis <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            to="/"
            className="text-sm font-semibold underline-offset-4 hover:underline"
          >
            Ver planos e recursos
          </Link>
        </div>
      </div>
    </section>
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
