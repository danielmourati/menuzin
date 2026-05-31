import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, MessageCircle, ShoppingBag, Clock, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { store, categories, products, type Product } from "@/lib/mock-data";
import { useCart } from "@/lib/cart-context";
import { brl } from "@/lib/format";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ProductModal } from "@/components/storefront/ProductModal";
import { CartDrawer } from "@/components/storefront/CartDrawer";
import { whatsappLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/loja/$slug")({
  head: () => ({
    meta: [
      { title: `${store.name} — Cardápio online` },
      { name: "description", content: store.description },
      { property: "og:title", content: store.name },
      { property: "og:description", content: store.description },
    ],
  }),
  component: StorePage,
});

function StorePage() {
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

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Banner */}
      <div className="relative h-44 w-full overflow-hidden gradient-brand md:h-56">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.25),transparent_60%)]" />
        <div className="container relative mx-auto flex h-full items-end px-4 pb-4">
          <p className="rounded-full bg-white/15 backdrop-blur px-4 py-1.5 text-sm font-medium text-white">
            {store.banner}
          </p>
        </div>
      </div>

      {/* Store header */}
      <div className="container mx-auto -mt-10 px-4">
        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl gradient-brand text-2xl font-bold text-primary-foreground shadow-md">
              {store.logoLetter}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold">{store.name}</h1>
                <Badge className={store.open ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                  {store.open ? "Aberta" : "Fechada"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{store.description}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {store.prepTime}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {store.address}</span>
                <span>Pedido mín. {brl(store.minOrder)}</span>
              </div>
            </div>
            <Button asChild size="icon" variant="outline" className="h-10 w-10 shrink-0">
              <a href={whatsappLink(store.whatsapp, "Olá! Tenho uma dúvida sobre o cardápio.")} target="_blank" rel="noreferrer">
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

      {/* Floating cart button */}
      {count > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <Button
            onClick={() => setCartOpen(true)}
            className="flex h-14 w-full items-center justify-between rounded-2xl px-5 text-base shadow-[var(--shadow-pop)]"
          >
            <span className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20 text-sm font-bold">{count}</span>
              <ShoppingBag className="h-4 w-4" /> Ver carrinho
            </span>
            <span className="font-bold">{brl(subtotal)}</span>
          </Button>
        </div>
      )}

      <ProductModal product={selectedProduct} open={modalOpen} onOpenChange={setModalOpen} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
