import { useState, useMemo, useEffect } from "react";
import { computeStoreOpen } from "@/lib/store-hours";

import { Outlet, createFileRoute, useRouterState, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Search, MessageCircle, ShoppingBag, Clock, MapPin, Store as StoreIcon, LayoutGrid, List, Sparkles, Pizza, Beef, UtensilsCrossed, GlassWater, IceCream, Tag, Salad, Coffee, Sandwich, Soup, Cookie, Fish, Drumstick, type LucideIcon } from "lucide-react";

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
import { FeaturedScroller } from "@/components/storefront/FeaturedScroller";
import { CartDrawer } from "@/components/storefront/CartDrawer";
import { whatsappLink } from "@/lib/whatsapp";
import { getCatalog } from "@/lib/catalog.functions";
import { dbProductToUi, dbTenantToUi, dbCategoriesToUi } from "@/lib/db-adapters";
import type { Product, Tenant, Category } from "@/lib/domain-types";
import { RESERVED_SLUGS } from "@/lib/reserved-slugs";

const catalogQueryOptions = (slug: string) => queryOptions({
  queryKey: ["catalog", slug],
  queryFn: async () => {
    const res = await getCatalog({ data: { slug } });
    if (!res.tenant) return { tenant: null as Tenant | null, categories: [] as Category[], products: [] as Product[], pizzaSizes: [], pizzaDoughs: [], pizzaCrusts: [] };
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
    };
  },
});

export const Route = createFileRoute("/$slug")({
  loader: ({ context, params }) => {
    if (RESERVED_SLUGS.has(params.slug)) return null;
    return context.queryClient.ensureQueryData(catalogQueryOptions(params.slug));
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
  const isReserved = RESERVED_SLUGS.has(slug);
  const isStorefront = useRouterState({
    select: (state) => state.location.pathname === `/${slug}`,
  });
  const { data } = useSuspenseQuery(catalogQueryOptions(isReserved ? "__reserved__" : slug));

  if (isReserved) return <StoreNotFound slug={slug} />;
  if (!isStorefront) return <Outlet />;
  if (!data || !data.tenant) return <StoreNotFound slug={slug} />;
  return <StorePage tenant={data.tenant} categories={data.categories} products={data.products} pizzaSizes={data.pizzaSizes ?? []} pizzaDoughs={data.pizzaDoughs ?? []} pizzaCrusts={data.pizzaCrusts ?? []} />;
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
type PizzaSizeRow = { id: string; category_id: string; name: string; pieces: number; max_flavors: number; active: boolean; sort_order: number };

function StorePage({ tenant, categories, products, pizzaSizes, pizzaDoughs, pizzaCrusts }: { tenant: Tenant; categories: Category[]; products: Product[]; pizzaSizes: PizzaSizeRow[]; pizzaDoughs: PizzaExtraRow[]; pizzaCrusts: PizzaExtraRow[] }) {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("Todos");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const { count, subtotal } = useCart();

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
        <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:gap-4 sm:text-left">
            <div className="relative">
              {tenant.logoUrl ? (
                <img src={tenant.logoUrl} alt={`Logo ${tenant.name}`} className="h-20 w-auto object-contain sm:h-24" />
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
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produtos..."
            className="h-12 rounded-2xl border-input bg-white pl-10 text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:ring-primary/30"
          />
        </div>

        {activeCat === "Todos" && !search && (
          <>
            <FeaturedScroller
              products={products.filter((p) => p.featured)}
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
        pizzaSizes={selectedProduct?.categoryId ? pizzaSizes.filter((s) => s.category_id === selectedProduct.categoryId && s.active).map((s) => ({ id: s.id, name: s.name, pieces: s.pieces, maxFlavors: s.max_flavors })) : []}
        pizzaFlavors={selectedProduct?.categoryId && selectedProduct.categoryKind === "pizza"
          ? products.filter((p) => p.categoryId === selectedProduct.categoryId && p.available).map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              image: p.image,
              pricesByCategorySizeId: Object.fromEntries((p.sizes ?? []).filter((s) => s.categorySizeId).map((s) => [s.categorySizeId as string, s.price])),
              fallbackPrice: p.promoPrice ?? p.price,
            }))
          : []}
        pizzaDoughs={selectedProduct?.categoryId ? pizzaDoughs.filter((d) => d.category_id === selectedProduct.categoryId).map((d) => ({ id: d.id, name: d.name, extraPrice: Number(d.extra_price) })) : []}
        pizzaCrusts={selectedProduct?.categoryId ? pizzaCrusts.filter((d) => d.category_id === selectedProduct.categoryId).map((d) => ({ id: d.id, name: d.name, extraPrice: Number(d.extra_price) })) : []}
        freeGiftProduct={selectedProduct?.freeGiftKind === "product" && selectedProduct.freeGiftRefId ? products.find((p) => p.id === selectedProduct.freeGiftRefId) ?? null : null}
      />
      <CartDrawer open={cartOpen && storeOpen} onOpenChange={setCartOpen} />
    </div>
  );
}

