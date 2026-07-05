import { useState, useMemo, useEffect } from "react";
import { computeStoreOpen } from "@/lib/store-hours";

import { Outlet, createFileRoute, useRouterState, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Search, MessageCircle, ShoppingBag, Clock, MapPin, Store as StoreIcon, LayoutGrid, List, Sparkles, Pizza, Beef, UtensilsCrossed, GlassWater, IceCream, Tag, Salad, Coffee, Sandwich, Soup, Cookie, Fish, Drumstick, ChevronRight, Menu, X as XIcon, type LucideIcon } from "lucide-react";
import { StoreSideMenu } from "@/components/storefront/StoreSideMenu";
import { StoreAboutDrawer } from "@/components/storefront/StoreAboutDrawer";


function getCategoryIcon(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes("tod")) return LayoutGrid;
  if (n.includes("pizza")) return Pizza;
  if (n.includes("hambur") || n.includes("burger") || n.includes("lanche")) return Sandwich;
  if (n.includes("combo")) return UtensilsCrossed;
  if (n.includes("bebid") || n.includes("drink") || n.includes("suco") || n.includes("refri")) return GlassWater;
  if (n.includes("café") || n.includes("cafe")) return Coffee;
  if (n.includes("sobremesa") || n.includes("doce")) return IceCream;
  if (n.includes("promo") || n.includes("oferta")) return Tag;
  if (n.includes("salada") || n.includes("veg")) return Salad;
  if (n.includes("sopa") || n.includes("caldo")) return Soup;
  if (n.includes("frango")) return Drumstick;
  if (n.includes("peixe") || n.includes("sushi")) return Fish;
  if (n.includes("carne") || n.includes("churras")) return Beef;
  if (n.includes("biscoit") || n.includes("cookie")) return Cookie;
  return UtensilsCrossed;
}
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/cart-context";
import { brl } from "@/lib/format";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ProductModal } from "@/components/storefront/ProductModal";
import { PromoModal } from "@/components/storefront/PromoModal";
import { getActivePromoModal } from "@/lib/promo-modal.functions";
import { useQuery } from "@tanstack/react-query";
import { FeaturedScroller } from "@/components/storefront/FeaturedScroller";
import { CartDrawer } from "@/components/storefront/CartDrawer";
import { MobileBottomNav } from "@/components/storefront/MobileBottomNav";
import { whatsappLink } from "@/lib/whatsapp";
import { getCatalog } from "@/lib/catalog.functions";
import { dbProductToUi, dbTenantToUi, dbCategoriesToUi } from "@/lib/db-adapters";
import type { Product, Tenant, Category } from "@/lib/domain-types";
import { RESERVED_SLUGS } from "@/lib/reserved-slugs";

const STORE_SLUG_PATTERN = /^[a-z0-9-]+$/;
const isCatalogSlug = (slug: string) => STORE_SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);

const catalogQueryOptions = (slug: string) => queryOptions({
  queryKey: ["catalog", slug],
  queryFn: async () => {
    const res = await getCatalog({ data: { slug } });
    if (!res.tenant) return { tenant: null as Tenant | null, categories: [] as Category[], products: [] as Product[], pizzaSizes: [], pizzaDoughs: [], pizzaCrusts: [], blocked: false };
    const catNameById = new Map(res.categories.map((c) => [c.id, c.name]));
    const catKindById = new Map(res.categories.map((c) => [c.id, (c as { kind?: string }).kind === "pizza" ? "pizza" as const : "standard" as const]));
    return {
      tenant: dbTenantToUi(res.tenant),
      categories: dbCategoriesToUi(res.categories),
      products: res.products.map((p) =>
        dbProductToUi(p, p.category_id ? catNameById.get(p.category_id) ?? "" : "", p.category_id ? catKindById.get(p.category_id) ?? "standard" : "standard"),
      ),
      pizzaSizes: res.pizzaSizes ?? [],
      pizzaDoughs: res.pizzaDoughs ?? [],
      pizzaCrusts: res.pizzaCrusts ?? [],
      blocked: res.blocked ?? false,
    };
  },
});

export const Route = createFileRoute("/$slug")({
  loader: ({ context, params }) => {
    if (!isCatalogSlug(params.slug)) return null;
    return context.queryClient.ensureQueryData(catalogQueryOptions(params.slug));
  },
  head: ({ params, loaderData }) => {
    const tenant = loaderData?.tenant ?? null;
    const url = `https://menuzin.app/${params.slug}`;
    if (!tenant) {
      return {
        meta: [
          { title: `Loja — Menuzin` },
          { name: "robots", content: "noindex" },
          { property: "og:url", content: url },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const titleRaw = `${tenant.name} — Cardápio digital`;
    const title = titleRaw.length > 60 ? `${tenant.name}` : titleRaw;
    const descSource = (tenant.description ?? "").trim();
    const fallbackDesc = `Veja o cardápio digital de ${tenant.name} e peça pelo WhatsApp com entrega ou retirada.`;
    let description = descSource && descSource.length >= 50 ? descSource : fallbackDesc;
    if (description.length > 160) description = description.slice(0, 157).trimEnd() + "…";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...(tenant.logoUrl ? [
          { property: "og:image", content: tenant.logoUrl },
          { name: "twitter:image", content: tenant.logoUrl },
        ] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FoodEstablishment",
            name: tenant.name,
            description,
            url,
            ...(tenant.logoUrl ? { image: tenant.logoUrl } : {}),
            ...(tenant.address ? { address: tenant.address } : {}),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `Cardápio — ${tenant.name}`,
            url,
          }),
        },
      ],
    };
  },
  component: StoreRoute,
  errorComponent: ({ error }) => (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <p className="text-sm text-muted-foreground">Erro ao carregar a loja: {error.message}</p>
    </div>
  ),
});

function StoreRoute() {
  const { slug } = Route.useParams();
  const isStorefront = useRouterState({
    select: (state) => state.location.pathname === `/${slug}`,
  });

  if (!isStorefront) return <Outlet />;
  if (!isCatalogSlug(slug)) return <StoreNotFound slug={slug} />;
  return <StorefrontRoute slug={slug} />;
}

function StorefrontRoute({ slug }: { slug: string }) {
  const { data } = useSuspenseQuery(catalogQueryOptions(slug));

  if (!data || !data.tenant) return <StoreNotFound slug={slug} />;
  if (data.blocked) return <StoreUnavailable name={data.tenant.name} />;
  return <StorePage tenant={data.tenant} categories={data.categories} products={data.products} pizzaSizes={data.pizzaSizes ?? []} pizzaDoughs={data.pizzaDoughs ?? []} pizzaCrusts={data.pizzaCrusts ?? []} />;
}

function StoreUnavailable({ name }: { name: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-6 text-center">
      <div className="max-w-md">
        <StoreIcon className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-bold">{name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta loja está temporariamente indisponível. Volte em breve.
        </p>
      </div>
    </div>
  );
}



function StoreNotFound({ slug }: { slug: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-[var(--shadow-soft)]">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-muted">
          <StoreIcon className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold">Loja não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Não localizamos nenhuma loja para <span className="font-mono">/{slug}</span>.
          Verifique o link ou volte para a página inicial.
        </p>
        <Button asChild className="mt-5"><Link to="/">Voltar para o início</Link></Button>
      </div>
    </div>
  );
}

type PizzaExtraRow = { id: string; category_id: string; name: string; extra_price: number };
type PizzaSizeRow = { id: string; category_id: string; name: string; pieces: number; max_flavors: number; active: boolean; sort_order: number; price_rule?: "sum_fractions" | "max_value" | "fixed" | null };

function StorePage({ tenant, categories, products, pizzaSizes, pizzaDoughs, pizzaCrusts }: { tenant: Tenant; categories: Category[]; products: Product[]; pizzaSizes: PizzaSizeRow[]; pizzaDoughs: PizzaExtraRow[]; pizzaCrusts: PizzaExtraRow[] }) {
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<string>("Todos");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const { count, subtotal } = useCart();


  // Modal promocional — carrega na abertura da loja, 1x por sessão
  const promoQ = useQuery({
    queryKey: ["promo-modal", tenant.id],
    queryFn: () => getActivePromoModal({ data: { tenantId: tenant.id } }),
    staleTime: 60_000,
  });
  const [promoOpen, setPromoOpen] = useState(false);
  useEffect(() => {
    const promo = promoQ.data;
    if (!promo) return;
    const key = `promo_seen_${promo.id}`;
    if (typeof window !== "undefined" && !window.sessionStorage.getItem(key)) {
      setPromoOpen(true);
    }
  }, [promoQ.data]);
  const closePromo = () => {
    const promo = promoQ.data;
    if (promo && typeof window !== "undefined") {
      window.sessionStorage.setItem(`promo_seen_${promo.id}`, "1");
    }
    setPromoOpen(false);
  };
  const handlePromoCta = () => {
    const promo = promoQ.data;
    closePromo();
    if (!promo?.product) return;
    const target = products.find((p) => p.id === promo.product!.id);
    if (target) {
      setSelectedProduct(target);
      setModalOpen(true);
    }
  };

  // Recalcula o status a cada minuto para fechar/abrir sozinho conforme o
  // relógio do cliente — não depende de re-render no servidor.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const storeOpen = useMemo(
    () =>
      computeStoreOpen({
        openMode: tenant.openMode,
        hoursSchedule: tenant.hoursSchedule,
        legacyOpen: tenant.open,
      }).open,
    // tick é dependência intencional para re-avaliar no fuso atual.
    [tenant.openMode, tenant.hoursSchedule, tenant.open, tick],
  );



  const pizzaCatNames = useMemo(
    () => new Set(categories.filter((c) => c.kind === "pizza").map((c) => c.name)),
    [categories],
  );
  const hasPizza = pizzaCatNames.size > 0;
  const PIZZAS_KEY = "__pizzas__";

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (activeCat === PIZZAS_KEY) {
        if (!pizzaCatNames.has(p.category)) return false;
      } else if (activeCat !== "Todos" && p.category !== activeCat) return false;
      if (search && !`${p.name} ${p.description}`.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [search, activeCat, products, pizzaCatNames]);

  type Group = { name: string; items: Product[]; isPizzaParent?: boolean; children?: { name: string; items: Product[] }[] };
  const grouped = useMemo<Group[]>(() => {
    if (activeCat !== "Todos" && activeCat !== PIZZAS_KEY) {
      return [{ name: activeCat, items: filtered }];
    }
    const out: Group[] = [];
    const pizzaChildren: { name: string; items: Product[] }[] = [];
    for (const c of categories) {
      const items = filtered.filter((p) => p.category === c.name);
      if (items.length === 0) continue;
      if (c.kind === "pizza") {
        pizzaChildren.push({ name: c.name, items });
      } else if (activeCat === "Todos") {
        out.push({ name: c.name, items });
      }
    }
    if (pizzaChildren.length > 0) {
      const allPizzaItems = pizzaChildren.flatMap((g) => g.items);
      out.push({ name: "Pizzas", items: allPizzaItems, isPizzaParent: true, children: pizzaChildren });
    }
    return out;
  }, [filtered, activeCat, categories]);

  const bannerStyle = {
    backgroundImage: `linear-gradient(135deg, ${tenant.themeFrom}, ${tenant.themeTo})`,
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="container mx-auto px-4 pt-4">
        {/* Mobile compact header (anexo 1) */}
        <div className="md:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border bg-card text-foreground shadow-sm active:bg-muted"
            >
              <Menu className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => setAboutOpen(true)}
              className="group flex flex-1 items-center gap-3 rounded-2xl border bg-card p-2.5 pr-2 text-left shadow-[var(--shadow-soft)] active:bg-muted/40"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border bg-muted">
                {tenant.logoUrl ? (
                  <img src={tenant.logoUrl} alt={tenant.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold">{tenant.logoLetter}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold leading-tight">{tenant.name}</p>
                <p className={`mt-0.5 flex items-center gap-1 text-[11px] font-semibold ${storeOpen ? "text-success" : "text-destructive"}`}>
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${storeOpen ? "bg-success" : "bg-destructive"}`} />
                  {storeOpen ? "Aberta" : "Fechada - Agendar pedido"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Buscar produtos"
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-primary-foreground shadow-md active:opacity-80 ${searchOpen ? "bg-muted-foreground" : "bg-primary"}`}
            >
              {searchOpen ? <XIcon className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>
          </div>

          {/* Chips: entrega / prep time / mínimo */}
          <div className="mt-2 -mx-4 overflow-x-auto px-4 scrollbar-hide">
            <div className="flex gap-2">
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                <MapPin className="h-3 w-3" /> Entrega {brl(tenant.deliveryFee)}
              </span>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                <Clock className="h-3 w-3" /> {tenant.prepTime || "—"}
              </span>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                Mín. {brl(tenant.minOrder)}
              </span>
            </div>
          </div>

          {/* Search input (mobile, colapsável) */}
          {searchOpen && (
            <div className="relative mt-3">
              <label htmlFor="storefront-search-mobile" className="sr-only">Buscar produtos no cardápio</label>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="storefront-search-mobile"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produtos..."
                aria-label="Buscar produtos no cardápio"
                autoFocus
                className="h-11 rounded-2xl border-input bg-white pl-10 text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:ring-primary/30"
              />
            </div>
          )}
        </div>

        {/* Desktop header + search (unchanged) */}
        <div className="hidden md:block">
          <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-[var(--shadow-soft)]">
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:gap-4 sm:text-left">
              <div className="relative">
                {tenant.logoUrl ? (
                  <img src={tenant.logoUrl} alt={`Logo ${tenant.name}`} className="h-20 w-auto object-contain sm:h-24" loading="eager" fetchPriority="high" decoding="async" />
                ) : (
                  <div
                    className="grid h-20 w-20 place-items-center rounded-2xl border-4 border-card text-3xl font-bold text-white shadow-md sm:h-24 sm:w-24 sm:text-4xl"
                    style={bannerStyle}
                    aria-label={`Logo ${tenant.name}`}
                  >
                    {tenant.logoLetter}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h1 className="text-lg font-bold sm:text-xl">{tenant.name}</h1>
                  <Badge className={storeOpen ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                    {storeOpen ? "Aberta" : "Fechada"}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{tenant.description}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:justify-start">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {tenant.prepTime}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {tenant.address}</span>
                  <span>Pedido mín. {brl(tenant.minOrder)}</span>
                </div>
              </div>

              <Button asChild size="icon" variant="outline" className="h-10 w-10 shrink-0">
                <a href={whatsappLink(tenant.whatsapp, "Olá! Tenho uma dúvida sobre o cardápio.")} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4 text-success" />
                </a>
              </Button>
            </div>
          </div>

          <div className="relative mt-4">
            <label htmlFor="storefront-search" className="sr-only">Buscar produtos no cardápio</label>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="storefront-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produtos..."
              aria-label="Buscar produtos no cardápio"
              className="h-12 rounded-2xl border-input bg-white pl-10 text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:ring-primary/30"
            />
          </div>
        </div>


        {activeCat === "Todos" && !search && (
          <>
            <FeaturedScroller
              products={products.filter((p) => p.featured)}
              title="Mais vendidos"
              viewAllTo="/$slug/destaques"
              viewAllParams={{ slug: tenant.slug }}
              onSelect={(p) => {
                if (!storeOpen) return;
                setSelectedProduct(p);
                setModalOpen(true);
              }}
            />
            {(() => {
              const promoCatNames = new Set(
                categories
                  .filter((c) => {
                    const n = c.name.toLowerCase();
                    return n.includes("promo") || n.includes("oferta");
                  })
                  .map((c) => c.name),
              );
              const promoProducts = products.filter((p) => promoCatNames.has(p.category) && p.available);
              return (
                <FeaturedScroller
                  products={promoProducts}
                  title="Promoções"
                  badgeLabel="Oferta"
                  badgeClassName="bg-destructive text-destructive-foreground"
                  viewAllTo="/$slug/promocoes"
                  viewAllParams={{ slug: tenant.slug }}
                  onSelect={(p) => {
                    if (!storeOpen) return;
                    setSelectedProduct(p);
                    setModalOpen(true);
                  }}
                />
              );
            })()}

          </>
        )}


        {!storeOpen && (
          <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center">
            <p className="text-sm font-semibold text-destructive">Loja fechada no momento</p>
            <p className="mt-1 text-xs text-muted-foreground">
              O cardápio está disponível para visualização, mas novos pedidos estão temporariamente indisponíveis.
            </p>
          </div>
        )}

        <div className="mt-4 -mx-4 overflow-x-auto px-4 scrollbar-hide">
          <div className="flex gap-2">
            {[
              { key: "Todos", label: "Todos" },
              ...(hasPizza ? [{ key: PIZZAS_KEY, label: "Pizzas" }] : []),
              ...categories.filter((c) => c.kind !== "pizza").map((c) => ({ key: c.name, label: c.name })),
            ].map((c) => {
              const Icon = getCategoryIcon(c.label);
              const active = activeCat === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setActiveCat(c.key)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${
                    active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "" : "text-primary"}`} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={`mt-6 space-y-8 ${!storeOpen ? "opacity-60" : ""}`}>
          {grouped.length === 0 ? (
            <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
              Nenhum produto encontrado.
            </div>
          ) : (
            grouped.map((g) => (
              <section key={g.name}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-bold">{g.name}</h2>
                  <div className="inline-flex items-center rounded-full border bg-card p-0.5 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      aria-label="Visualizar em grade"
                      aria-pressed={viewMode === "grid"}
                      className={`grid h-8 w-8 place-items-center rounded-full transition ${
                        viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      aria-label="Visualizar em lista"
                      aria-pressed={viewMode === "list"}
                      className={`grid h-8 w-8 place-items-center rounded-full transition ${
                        viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {g.isPizzaParent && g.children ? (
                  <div className="space-y-6">
                    {g.children.map((sub) => (
                      <div key={sub.name}>
                        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{sub.name}</h3>
                        <div
                          className={
                            viewMode === "grid"
                              ? "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                              : "flex flex-col gap-3"
                          }
                        >
                          {sub.items.map((p) => (
                            <ProductCard
                              key={p.id}
                              product={p}
                              view={viewMode}
                              tenantSlug={tenant.slug}
                              onClick={() => {
                                if (!storeOpen) return;
                                setSelectedProduct(p);
                                setModalOpen(true);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className={
                      viewMode === "grid"
                        ? "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                        : "flex flex-col gap-3"
                    }
                  >
                    {g.items.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        view={viewMode}
                        tenantSlug={tenant.slug}
                        onClick={() => {
                          if (!storeOpen) return;
                          setSelectedProduct(p);
                          setModalOpen(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>
            ))
          )}
        </div>
      </div>


      {storeOpen && count > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between bg-primary px-5 py-3.5 text-primary-foreground shadow-[var(--shadow-pop)]"
        >
          <div className="text-left">
            <p className="text-xs opacity-90">Subtotal</p>
            <p className="text-lg font-bold">{brl(subtotal)}</p>
          </div>
          <span className="flex items-center gap-2 text-base font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20 text-sm font-bold">{count}</span>
            <ShoppingBag className="h-4 w-4" /> Carrinho
          </span>
        </button>
      )}

      {!storeOpen && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card px-5 py-3 text-center">
          <p className="text-sm font-semibold text-destructive">Loja fechada — pedidos indisponíveis</p>
        </div>
      )}

      <ProductModal
        product={selectedProduct}
        open={modalOpen && storeOpen}
        onOpenChange={setModalOpen}
        tenantSlug={tenant.slug}
        pizzaSizes={selectedProduct?.categoryId ? pizzaSizes.filter((s) => s.category_id === selectedProduct.categoryId && s.active).map((s) => ({ id: s.id, name: s.name, pieces: s.pieces, maxFlavors: s.max_flavors, priceRule: (s.price_rule ?? "sum_fractions") as "sum_fractions" | "max_value" | "fixed" })) : []}
        pizzaFlavors={selectedProduct?.categoryId && selectedProduct.categoryKind === "pizza"
          ? products.filter((p) => p.categoryId === selectedProduct.categoryId && p.available && p.listedAsFlavor === true).map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              image: p.image,
              pricesByCategorySizeId: Object.fromEntries((p.sizes ?? []).filter((s) => s.categorySizeId).map((s) => [s.categorySizeId as string, s.price])),
              fractionPricesByCategorySizeId: Object.fromEntries(
                (p.sizes ?? []).filter((s) => s.categorySizeId && s.fractionPrices).map((s) => [s.categorySizeId as string, s.fractionPrices as Record<string, number>])
              ),
              fallbackPrice: p.promoPrice ?? p.price,
            }))
          : []}

        pizzaDoughs={selectedProduct?.categoryId ? pizzaDoughs.filter((d) => d.category_id === selectedProduct.categoryId).map((d) => ({ id: d.id, name: d.name, extraPrice: Number(d.extra_price) })) : []}
        pizzaCrusts={selectedProduct?.categoryId ? pizzaCrusts.filter((d) => d.category_id === selectedProduct.categoryId).map((d) => ({ id: d.id, name: d.name, extraPrice: Number(d.extra_price) })) : []}
        freeGiftProduct={selectedProduct?.freeGiftKind === "product" && selectedProduct.freeGiftRefId ? products.find((p) => p.id === selectedProduct.freeGiftRefId) ?? null : null}
      />
      <CartDrawer open={cartOpen && storeOpen} onOpenChange={setCartOpen} />
      <MobileBottomNav
        slug={tenant.slug}
        onOpenCart={() => storeOpen && setCartOpen(true)}
        hidden={cartOpen || (storeOpen && count > 0) || !storeOpen}
      />
      {promoQ.data && storeOpen ? (
        <PromoModal
          open={promoOpen}
          imageUrl={promoQ.data.imageUrl}
          ctaLabel={promoQ.data.ctaLabel}
          onCta={handlePromoCta}
          onClose={closePromo}
        />
      ) : null}
    </div>
  );
}

