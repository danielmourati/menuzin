import { useState, useMemo, useEffect } from "react";
import { computeStoreOpen } from "@/lib/store-hours";

import { Outlet, createFileRoute, useRouterState, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Search, MessageCircle, ShoppingBag, Clock, MapPin, Store as StoreIcon, LayoutGrid, List } from "lucide-react";
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
    if (!res.tenant) return { tenant: null as Tenant | null, categories: [] as Category[], products: [] as Product[], pizzaDoughs: [], pizzaCrusts: [] };
    const catNameById = new Map(res.categories.map((c) => [c.id, c.name]));
    const catKindById = new Map(res.categories.map((c) => [c.id, (c as { kind?: string }).kind === "pizza" ? "pizza" as const : "standard" as const]));
    return {
      tenant: dbTenantToUi(res.tenant),
      categories: dbCategoriesToUi(res.categories),
      products: res.products.map((p) =>
        dbProductToUi(p, p.category_id ? catNameById.get(p.category_id) ?? "" : "", p.category_id ? catKindById.get(p.category_id) ?? "standard" : "standard"),
      ),
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
  return <StorePage tenant={data.tenant} categories={data.categories} products={data.products} pizzaDoughs={data.pizzaDoughs ?? []} pizzaCrusts={data.pizzaCrusts ?? []} />;
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

function StorePage({ tenant, categories, products, pizzaDoughs, pizzaCrusts }: { tenant: Tenant; categories: Category[]; products: Product[]; pizzaDoughs: PizzaExtraRow[]; pizzaCrusts: PizzaExtraRow[] }) {
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



  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (activeCat !== "Todos" && p.category !== activeCat) return false;
      if (search && !`${p.name} ${p.description}`.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [search, activeCat, products]);

  const grouped = useMemo(() => {
    if (activeCat !== "Todos") return [{ name: activeCat, items: filtered }];
    return categories
      .map((c) => ({ name: c.name, items: filtered.filter((p) => p.category === c.name) }))
      .filter((g) => g.items.length > 0);
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
          <FeaturedScroller
            products={products.filter((p) => p.featured)}
            onSelect={(p) => {
              if (!storeOpen) return;
              setSelectedProduct(p);
              setModalOpen(true);
            }}
          />
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
            {["Todos", ...categories.map((c) => c.name)].map((c) => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${
                  activeCat === c ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40"
                }`}
              >
                {c}
              </button>
            ))}
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
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-2 gap-3 md:grid-cols-3"
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
        pizzaDoughs={selectedProduct?.categoryId ? pizzaDoughs.filter((d) => d.category_id === selectedProduct.categoryId).map((d) => ({ id: d.id, name: d.name, extraPrice: Number(d.extra_price) })) : []}
        pizzaCrusts={selectedProduct?.categoryId ? pizzaCrusts.filter((d) => d.category_id === selectedProduct.categoryId).map((d) => ({ id: d.id, name: d.name, extraPrice: Number(d.extra_price) })) : []}
      />
      <CartDrawer open={cartOpen && storeOpen} onOpenChange={setCartOpen} />
    </div>
  );
}

