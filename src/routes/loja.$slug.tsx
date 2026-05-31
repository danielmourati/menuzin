import { useState, useMemo } from "react";
import { Outlet, createFileRoute, useRouterState, Link } from "@tanstack/react-router";
import { Search, MessageCircle, ShoppingBag, Clock, MapPin, Store as StoreIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { categories, products, getTenantBySlug, type Product, type Tenant } from "@/lib/mock-data";
import { useCart } from "@/lib/cart-context";
import { brl } from "@/lib/format";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ProductModal } from "@/components/storefront/ProductModal";
import { CartDrawer } from "@/components/storefront/CartDrawer";
import { whatsappLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/loja/$slug")({
  head: ({ params }) => {
    const t = getTenantBySlug(params.slug);
    const title = t ? `${t.name} — Cardápio online` : "Loja não encontrada";
    const desc = t?.description ?? "Esta loja não está disponível.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: StoreRoute,
});

function StoreRoute() {
  const { slug } = Route.useParams();
  const isStorefront = useRouterState({
    select: (state) => state.location.pathname === `/loja/${slug}`,
  });

  if (!isStorefront) return <Outlet />;

  const tenant = getTenantBySlug(slug);
  if (!tenant) return <StoreNotFound slug={slug} />;
  return <StorePage tenant={tenant} />;
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

function StorePage({ tenant }: { tenant: Tenant }) {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("Todos");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { count, subtotal } = useCart();

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (activeCat !== "Todos" && p.category !== activeCat) return false;
      if (search && !`${p.name} ${p.description}`.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [search, activeCat]);

  const grouped = useMemo(() => {
    if (activeCat !== "Todos") return [{ name: activeCat, items: filtered }];
    return categories
      .map((c) => ({ name: c.name, items: filtered.filter((p) => p.category === c.name) }))
      .filter((g) => g.items.length > 0);
  }, [filtered, activeCat]);

  const bannerStyle = {
    backgroundImage: `linear-gradient(135deg, ${tenant.themeFrom}, ${tenant.themeTo})`,
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Banner com identidade da loja */}
      <header className="relative h-44 w-full overflow-hidden sm:h-56" style={bannerStyle}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.28),transparent_60%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/15" />
      </header>

      {/* Identidade da loja */}
      <div className="container mx-auto -mt-14 px-4 sm:-mt-16">
        <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:gap-4 sm:text-left">
            <div className="relative">
              {tenant.logoUrl ? (
                <img
                  src={tenant.logoUrl}
                  alt={`Logo ${tenant.name}`}
                  className="h-20 w-20 rounded-2xl border-4 border-card object-cover shadow-md sm:h-24 sm:w-24"
                />
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
                <Badge className={tenant.open ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                  {tenant.open ? "Aberta" : "Fechada"}
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

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produtos..."
            className="h-12 rounded-2xl pl-10"
          />
        </div>

        {/* Categories */}
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

        {/* Products */}
        <div className="mt-6 space-y-8">
          {grouped.length === 0 ? (
            <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
              Nenhum produto encontrado.
            </div>
          ) : (
            grouped.map((g) => (
              <section key={g.name}>
                <h2 className="mb-3 text-lg font-bold">{g.name}</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {g.items.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onClick={() => { setSelectedProduct(p); setModalOpen(true); }}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      {/* Floating cart bar */}
      {count > 0 && (
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

      <ProductModal product={selectedProduct} open={modalOpen} onOpenChange={setModalOpen} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
