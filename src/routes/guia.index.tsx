import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  listCategories,
  listFeatured,
  listAllStores,
  DIRECTORY_CATEGORIES,
  type DirectoryStore,
} from "@/lib/directory.functions";
import { productImage } from "@/lib/product-image";
import { brl } from "@/lib/format";
import { getGuiaHome } from "@/lib/guia.functions";
import type { GuiaSectionId, GuiaSlot } from "@/lib/guia-types";

import { SlotCard } from "@/components/guia/SlotCard";
import { GuiaSearchOverlay } from "@/components/guia/GuiaSearch";
import { MessagesButton, NotificationsButton } from "@/components/guia/GuiaInbox";
import { CepGateDialog, useGuiaLocation } from "@/components/guia/CepGateDialog";
import {
  ChevronRight,
  Home,
  LayoutGrid,
  List,
  MapPin,
  Receipt,
  Rocket,
  Search,
  Star,
  User,
  X,
} from "lucide-react";

const categoriesQO = queryOptions({
  queryKey: ["guia", "categories"],
  queryFn: () => listCategories(),
});
const featuredQO = queryOptions({
  queryKey: ["guia", "featured"],
  queryFn: () => listFeatured(),
});

const storesQO = queryOptions({
  queryKey: ["guia", "stores"],
  queryFn: () => listAllStores(),
});

const homeQO = queryOptions({
  queryKey: ["guia", "home"],
  queryFn: () => getGuiaHome({ data: {} }),
});


export const Route = createFileRoute("/guia/")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(categoriesQO);
    context.queryClient.prefetchQuery(featuredQO);
    context.queryClient.prefetchQuery(storesQO);
    context.queryClient.prefetchQuery(homeQO);
    return { origin: "https://menuzin.app" };
  },
  pendingComponent: () => (
    <div className="flex h-dvh items-center justify-center bg-muted/30">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-muted-foreground">Carregando lojas...</p>
      </div>
    </div>
  ),
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

const VERTICALS: { id: "restaurantes" | "mercados" | "conveniencias"; label: string; emoji: string }[] = [
  { id: "restaurantes", label: "restaurantes", emoji: "🍔" },
  { id: "mercados", label: "mercados", emoji: "🛒" },
  { id: "conveniencias", label: "conveniências", emoji: "🍺" },
];

function GuiaHome() {
  const { data: catsData } = useSuspenseQuery(categoriesQO);
  const { data: featData } = useSuspenseQuery(featuredQO);
  const { data: storesData } = useSuspenseQuery(storesQO);
  const { data: home } = useSuspenseQuery(homeQO);
  const featured = featData.items;
  const allStores = storesData.stores;

  const byKind = (kind: GuiaSlot["kind"]) => home.slots.filter((s) => s.kind === kind && s.active);
  const heroSlots = byKind("hero");
  const featuredSlots = byKind("featured");
  const topStoresSlots = byKind("top_stores");
  const bannerSlots = byKind("banner");
  const collectionSlots = byKind("collection");
  const flashSlots = byKind("flash_offer");
  const managedCategories = home.categories;
  const sectionOrder = home.sectionOrder;
  const sectionActive = home.sectionActive;

  // Consolida: só categorias que realmente têm produtos ativos no Guia.
  const countOf = (slug: string) =>
    catsData.categories.find((x) => x.slug === slug)?.count ?? 0;
  const visibleCategories = (
    managedCategories.length > 0
      ? managedCategories
      : DIRECTORY_CATEGORIES.map((c, i) => ({
          id: c.slug,
          slug: c.slug,
          label: c.label,
          emoji: c.emoji,
          imageUrl: undefined as string | undefined,
          imageFit: "cover" as "cover" | "contain",
          active: true,
          sortOrder: i,
        }))
  ).filter((c) => countOf(c.slug) > 0);



  const { location, needsLocation } = useGuiaLocation();
  const [cepOpen, setCepOpen] = useState(false);
  useEffect(() => {
    if (needsLocation) setCepOpen(true);
  }, [needsLocation]);

  const [vertical, setVertical] = useState<"restaurantes" | "mercados" | "conveniencias">("restaurantes");
  const [searchOpen, setSearchOpen] = useState(false);

  // Só mostra os chips de vertical que realmente existem no banco.
  const availableVerticals = useMemo(() => VERTICALS.filter((v) =>
    v.id === "restaurantes" ? true : allStores.some((s) => s.vertical === v.id),
  ), [allStores]);
  useEffect(() => {
    if (!availableVerticals.some((v) => v.id === vertical)) setVertical("restaurantes");
  }, [availableVerticals, vertical]);
  const [storesView, setStoresView] = useState<"grid" | "list">("list");
  const [topStoresAll, setTopStoresAll] = useState(false);
  const [featuredAll, setFeaturedAll] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const verticalStores = allStores.filter((s) => s.vertical === vertical);
  const filteredStores = categoryFilter
    ? verticalStores.filter((s) => s.categories.includes(categoryFilter))
    : verticalStores;
  const activeCategoryLabel = categoryFilter
    ? (managedCategories.find((c) => c.slug === categoryFilter)?.label
        ?? DIRECTORY_CATEGORIES.find((c) => c.slug === categoryFilter)?.label
        ?? categoryFilter)
    : null;

  return (
    <div className="flex h-dvh flex-col bg-muted/30">
      <CepGateDialog open={cepOpen} onOpenChange={setCepOpen} dismissible={!!location} />
      <GuiaSearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 pb-2 pt-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCepOpen(true)}
              className="flex min-w-0 flex-1 items-start gap-2 text-left"
            >
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold leading-tight">
                  {location?.city ?? "Escolha sua cidade"}{" "}
                  <ChevronRight className="inline h-3.5 w-3.5" />
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {location
                    ? `${location.uf ? location.uf + " · " : ""}CEP ${location.cep.slice(0, 5)}-${location.cep.slice(5)}`
                    : "Informe seu CEP para ver as lojas perto de você"}
                </p>
              </div>
            </button>
            <MessagesButton />
            <NotificationsButton offers={[...flashSlots, ...featuredSlots]} />
          </div>

          {/* Search */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="mt-3 flex w-full items-center gap-2 rounded-2xl border bg-background px-3 py-2 text-left"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Busque por lojas, pratos ou promoções…
            </span>
          </button>

          {/* Verticals */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {availableVerticals.map((v) => {
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

      <main className="flex-1 overflow-y-auto"><div className="mx-auto max-w-5xl space-y-8 px-4 py-5">
        {/* Hero carousel (fixo, sempre no topo) */}
        {heroSlots.length > 0 && <HeroCarousel slots={heroSlots} />}

        {(() => {
          const sectionNodes: Record<GuiaSectionId, React.ReactNode> = {
            categories: (
              <div className="space-y-8">
                {visibleCategories.length > 0 && (
                <Section
                  title="categorias"
                  subtitle="explora o que rola no seu bairro"
                >
                  <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {visibleCategories.map((c) => {
                      const isReal = true;
                      const isSelected = categoryFilter === c.slug;

                      const inner = (
                        <>
                          {c.imageUrl ? (
                            <img
                              src={c.imageUrl}
                              alt=""
                              className={`h-14 w-14 ${c.imageFit === "contain" ? "object-contain" : "object-cover"} transition group-hover:scale-110 ${isSelected ? "scale-110" : ""}`}
                            />
                          ) : c.emoji?.trim() ? (
                            <span className={`text-4xl leading-none transition group-hover:scale-110 ${isSelected ? "scale-110" : ""}`}>{c.emoji}</span>
                          ) : (
                            <span className="h-14 w-14" />
                          )}

                          <span className={`text-xs font-semibold leading-tight lowercase ${isSelected ? "text-primary" : ""}`}>{c.label}</span>
                        </>
                      );
                      const cls = `group flex w-20 shrink-0 snap-start flex-col items-center gap-1.5 text-center ${isSelected ? "" : ""}`;
                      return isReal ? (
                        <button
                          key={c.slug}
                          type="button"
                          onClick={() => setCategoryFilter((prev) => (prev === c.slug ? null : c.slug))}
                          aria-pressed={isSelected}
                          className={cls}
                        >
                          {inner}
                        </button>
                      ) : (
                        <div key={c.slug} className={cls}>{inner}</div>
                      );
                    })}
                  </div>
                </Section>
                )}


                <AllStoresSection
                  stores={filteredStores}
                  view={storesView}
                  onViewChange={setStoresView}
                  activeCategoryLabel={activeCategoryLabel}
                  onClearFilter={() => setCategoryFilter(null)}
                />
              </div>
            ),

            featured: featuredSlots.length > 0 ? (
              <SlotRowSection
                title={<>destaques da semana <span>🔥</span></>}
                subtitle="pra driblar a fome com até 40% OFF"
                slots={featuredSlots}
              />
            ) : null,

            top_stores: topStoresSlots.length > 0 ? (
              <Section
                title={<>lojas em alta por aqui <span>✨</span></>}
                subtitle="só rango top pro seu jantar 🍔🍕🥩"
                action={topStoresSlots.length > 6 ? "ver mais" : undefined}
                onAction={() => setTopStoresAll((v) => !v)}
              >
                <div className="grid grid-cols-1 gap-3 rounded-xl bg-card p-3 shadow-sm sm:grid-cols-2">
                  {(topStoresAll ? topStoresSlots : topStoresSlots.slice(0, 6)).map((s) => (
                    <button key={s.id} type="button" className="rounded-lg text-left transition hover:bg-muted/60">
                      <SlotCard slot={s} />
                    </button>
                  ))}
                </div>
              </Section>
            ) : null,

            flash_offer: flashSlots.length > 0 ? (
              <SlotRowSection
                title={<>ofertas relâmpago <span>⚡</span></>}
                subtitle="rápido antes que acabe"
                slots={flashSlots}
              />
            ) : null,

            banner_1: bannerSlots[0] ? <SlotCard slot={bannerSlots[0]} /> : null,

            collection: collectionSlots.length > 0 ? (
              <SlotRowSection title="coleções de lojas e promos" slots={collectionSlots} />
            ) : null,

            banner_2: bannerSlots[1] ? <SlotCard slot={bannerSlots[1]} /> : null,

            featured_real: featured.length > 0 ? (
              <Section
                title="em destaque agora"
                subtitle="lançamentos do bairro, direto do WhatsApp da loja"
                action={featured.length > 3 ? (featuredAll ? "ver menos" : "ver mais") : undefined}
                onAction={() => setFeaturedAll((v) => !v)}
              >
                <div
                  className={
                    featuredAll || featured.length <= 3
                      ? "grid grid-cols-3 gap-3"
                      : "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  }
                >
                  {(featuredAll ? featured : featured).map((it) => (
                    <Link
                      key={it.product_id}
                      to="/guia/produto/$id"
                      params={{ id: it.product_id }}
                      className={`group overflow-hidden rounded-lg bg-card shadow-sm transition hover:shadow-md ${
                        featuredAll || featured.length <= 3
                          ? ""
                          : "w-[calc((100%-1.5rem)/3)] shrink-0 snap-start"
                      }`}
                    >
                      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                        <img
                          src={productImage(it.image_url)}
                          alt={it.name}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
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

            famozin: <FamozinSection stores={verticalStores} />,

            publish_cta: <PublishCta />,
          };

          return sectionOrder
            .filter((id) => sectionActive[id] !== false)
            .map((id) => <div key={id}>{sectionNodes[id]}</div>);
        })()}
      </div></main>

      {/* Bottom nav mobile */}
      <nav
        aria-label="Navegação"
        className="shrink-0 border-t bg-card/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-5xl items-center justify-around px-4 py-2">
          <BottomTab icon={<Home className="h-5 w-5" />} label="início" active />
          <BottomTab
            icon={<Search className="h-5 w-5" />}
            label="busca"
            onClick={() => setSearchOpen(true)}
          />
          <Link
            to="/meus-pedidos"
            className="flex w-14 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-bold text-muted-foreground transition hover:text-foreground"
          >
            <Receipt className="h-5 w-5" />
            pedidos
          </Link>
          <Link
            to="/minha-conta"
            className="flex w-14 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-bold text-muted-foreground transition hover:text-foreground"
          >
            <User className="h-5 w-5" />
            conta
          </Link>
        </div>
      </nav>
    </div>
  );
}

// ---------- SUB COMPONENTS ----------

function HeroCarousel({ slots }: { slots: GuiaSlot[] }) {
  const [idx, setIdx] = useState(0);
  const [drag, setDrag] = useState(0);
  const dragging = useRef(false);
  const startX = useRef(0);
  const moved = useRef(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slots.length <= 1 || paused) return;
    timer.current = setInterval(() => setIdx((i) => (i + 1) % slots.length), 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [slots.length, paused]);

  const width = () => wrapRef.current?.clientWidth || 1;

  const onDown = (x: number) => {
    if (slots.length <= 1) return;
    dragging.current = true;
    moved.current = false;
    startX.current = x;
    setPaused(true);
  };
  const onMove = (x: number) => {
    if (!dragging.current) return;
    const dx = x - startX.current;
    if (Math.abs(dx) > 6) moved.current = true;
    setDrag(dx);
  };
  const onUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const threshold = width() * 0.2;
    if (drag <= -threshold) setIdx((i) => (i + 1) % slots.length);
    else if (drag >= threshold) setIdx((i) => (i - 1 + slots.length) % slots.length);
    setDrag(0);
    setPaused(false);
  };

  const offsetPct = (drag / width()) * 100;

  return (
    <div className="space-y-2">
      <div
        ref={wrapRef}
        className="relative touch-pan-y select-none overflow-hidden rounded-xl"
        onTouchStart={(e) => onDown(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={onUp}
        onPointerDown={(e) => e.pointerType === "mouse" && onDown(e.clientX)}
        onPointerMove={(e) => e.pointerType === "mouse" && onMove(e.clientX)}
        onPointerUp={(e) => e.pointerType === "mouse" && onUp()}
        onPointerLeave={(e) => e.pointerType === "mouse" && onUp()}
        onClickCapture={(e) => {
          if (moved.current) {
            e.preventDefault();
            e.stopPropagation();
            moved.current = false;
          }
        }}
      >
        <div
          className={`flex ${dragging.current ? "" : "transition-transform duration-500 ease-out"}`}
          style={{ transform: `translateX(calc(-${idx * 100}% + ${offsetPct}%))` }}
        >
          {slots.map((s) => (
            <div key={s.id} className="flex w-full shrink-0 justify-center">
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
  onAction,
  children,
}: {
  title: React.ReactNode;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
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
            onClick={onAction}
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

function SlotRowSection({
  title,
  subtitle,
  slots,
}: {
  title: React.ReactNode;
  subtitle?: string;
  slots: GuiaSlot[];
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Section
      title={title}
      subtitle={subtitle}
      action={slots.length > 1 ? (expanded ? "ver menos" : "ver mais") : undefined}
      onAction={() => setExpanded((v) => !v)}
    >
      {expanded ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map((s) => (
            <SlotCard key={s.id} slot={s} />
          ))}
        </div>
      ) : (
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {slots.map((s) => (
            <div key={s.id} className="shrink-0 snap-start text-left">
              <SlotCard slot={s} />
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function FamozinSection({ stores }: { stores: DirectoryStore[] }) {
  const [expanded, setExpanded] = useState(false);
  // Ordena pelas lojas mais bem avaliadas; sem avaliação vem depois.
  const ranked = [...stores].sort((a, b) => {
    const ar = a.rating_avg ?? -1;
    const br = b.rating_avg ?? -1;
    if (ar !== br) return br - ar;
    if (a.rating_count !== b.rating_count) return b.rating_count - a.rating_count;
    return a.tenant_name.localeCompare(b.tenant_name);
  });
  const list = expanded ? ranked : ranked.slice(0, 8);
  if (!ranked.length) return null;
  return (
    <Section
      title={<>famozin na cidade <span>😎</span></>}
      subtitle="as lojas mais bem avaliadas por aqui"
      action={ranked.length > 8 ? (expanded ? "ver menos" : "ver mais") : undefined}
      onAction={() => setExpanded((v) => !v)}
    >
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
        {list.map((s) => (
          <Link
            key={s.tenant_id}
            to="/$slug"
            params={{ slug: s.tenant_slug }}
            className="group flex flex-col items-center gap-1.5 text-center"
          >
            <div className="relative h-16 w-16 overflow-hidden rounded-full border bg-muted shadow-sm transition group-hover:scale-105">
              {s.tenant_logo ? (
                <img src={s.tenant_logo} alt={s.tenant_name} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-black text-muted-foreground">
                  {s.tenant_name.slice(0, 1)}
                </span>
              )}
              {!s.open && (
                <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-[9px] font-black uppercase text-muted-foreground">
                  fechada
                </span>
              )}
            </div>
            <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{s.tenant_name}</span>
            {s.rating_avg != null ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600">
                <Star className="h-2.5 w-2.5 fill-current" />
                {s.rating_avg.toFixed(1).replace(".", ",")}
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-muted-foreground">nova</span>
            )}
          </Link>
        ))}
      </div>
    </Section>
  );
}


function BottomTab({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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

function AllStoresSection({
  stores,
  view,
  onViewChange,
  activeCategoryLabel,
  onClearFilter,
}: {
  stores: {
    tenant_id: string;
    tenant_slug: string;
    tenant_name: string;
    tenant_logo: string | null;
    neighborhood: string | null;
    city: string | null;
    categories: string[];
    product_count: number;
    has_featured: boolean;
  }[];
  view: "grid" | "list";
  onViewChange: (v: "grid" | "list") => void;
  activeCategoryLabel?: string | null;
  onClearFilter?: () => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-end gap-2">
        {activeCategoryLabel && (
          <button
            type="button"
            onClick={onClearFilter}
            className="mr-auto inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
          >
            categoria: {activeCategoryLabel}
            <X className="h-3 w-3" />
          </button>
        )}
        <div className="inline-flex shrink-0 items-center rounded-lg border bg-background p-0.5">
          <button
            type="button"
            aria-label="Ver em grade"
            aria-pressed={view === "grid"}
            onClick={() => onViewChange("grid")}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
              view === "grid"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            grade
          </button>
          <button
            type="button"
            aria-label="Ver em lista"
            aria-pressed={view === "list"}
            onClick={() => onViewChange("list")}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
              view === "list"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            lista
          </button>
        </div>
      </div>

      {stores.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {activeCategoryLabel ? "Nenhuma loja nessa categoria." : "Nenhuma loja cadastrada ainda."}
        </p>
      ) : view === "grid" ? (
        <div className="grid grid-cols-3 gap-3">
          {stores.map((s) => (
            <Link
              key={s.tenant_id}
              to="/$slug"
              params={{ slug: s.tenant_slug }}
              className="group flex flex-col overflow-hidden rounded-lg bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                {s.tenant_logo ? (
                  <img
                    src={s.tenant_logo}
                    alt={s.tenant_name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-4xl">
                    🍽️
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="line-clamp-1 text-sm font-bold">{s.tenant_name}</p>
                <p className="line-clamp-1 text-[11px] text-muted-foreground">
                  {s.neighborhood ?? s.city ?? "no bairro"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="divide-y overflow-hidden rounded-lg bg-card shadow-sm">
          {stores.map((s) => (
            <Link
              key={s.tenant_id}
              to="/$slug"
              params={{ slug: s.tenant_slug }}
              className="flex items-center gap-3 p-3 transition hover:bg-muted/60"
            >
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
                {s.tenant_logo ? (
                  <img
                    src={s.tenant_logo}
                    alt={s.tenant_name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-2xl">🍽️</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-bold">{s.tenant_name}</p>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {s.neighborhood ?? s.city ?? "no bairro"}
                  {s.categories.length > 0 ? ` · ${s.categories.slice(0, 3).join(", ")}` : ""}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
