import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { listByCategory, listNeighborhoods, DIRECTORY_CATEGORIES } from "@/lib/directory.functions";
import { productImage } from "@/lib/product-image";
import { brl } from "@/lib/format";
import { ChevronLeft, MapPin, Star } from "lucide-react";

const listQO = (categoria: string, neighborhood?: string) => queryOptions({
  queryKey: ["guia", "cat", categoria, neighborhood ?? "all"],
  queryFn: () => listByCategory({ data: { category: categoria, neighborhood } }),
});
const nbhQO = queryOptions({
  queryKey: ["guia", "neighborhoods"],
  queryFn: () => listNeighborhoods(),
});

export const Route = createFileRoute("/guia/$categoria")({
  loader: async ({ params, context }) => {
    const cat = DIRECTORY_CATEGORIES.find((c) => c.slug === params.categoria);
    if (!cat) throw notFound();
    await Promise.all([
      context.queryClient.ensureQueryData(listQO(params.categoria)),
      context.queryClient.ensureQueryData(nbhQO),
    ]);
    return { cat };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.cat.label} em Parnaíba — Guia Menuzin` : "Guia Menuzin";
    const desc = loaderData ? `${loaderData.cat.label} disponíveis no seu bairro. Peça direto pelo WhatsApp da loja.` : "Guia Menuzin";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <p className="text-lg font-semibold">Categoria não encontrada</p>
        <Link to="/guia" className="mt-2 inline-block text-sm text-primary underline">Voltar ao Guia</Link>
      </div>
    </div>
  ),
  errorComponent: () => (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <p className="text-sm text-muted-foreground">Não foi possível carregar essa categoria.</p>
    </div>
  ),
  component: CategoryPage,
});

function CategoryPage() {
  const { categoria } = Route.useParams();
  const { cat } = Route.useLoaderData();
  const [neighborhood, setNeighborhood] = useState<string | "all">("all");
  const nbhFilter = neighborhood === "all" ? undefined : neighborhood;
  const { data } = useSuspenseQuery(listQO(categoria, nbhFilter));
  const { data: nbhData } = useSuspenseQuery(nbhQO);
  const items = data.items;
  const now = Date.now();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.slice(0, 20).map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `https://menuzin.app/guia/produto/${it.product_id}`,
      name: it.name,
    })),
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Link to="/guia" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Guia
          </Link>
          <div className="mx-auto flex items-center gap-2 text-sm font-semibold">
            <span>{cat.emoji}</span> {cat.label}
          </div>
          <div className="w-14" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setNeighborhood("all")}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${neighborhood === "all" ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/50"}`}
          >
            Todos os bairros
          </button>
          {nbhData.neighborhoods.map((n) => (
            <button
              key={n}
              onClick={() => setNeighborhood(n)}
              className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition ${neighborhood === n ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/50"}`}
            >
              <MapPin className="h-3 w-3" /> {n}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma opção no filtro atual. Tente outro bairro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => {
              const isFeatured = it.featured_until && new Date(it.featured_until).getTime() > now;
              return (
                <Link
                  key={it.product_id}
                  to="/guia/produto/$id"
                  params={{ id: it.product_id }}
                  className="group overflow-hidden rounded-lg border bg-card shadow-sm transition hover:shadow-md"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    <img src={productImage(it.image_url)} alt={it.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                    {isFeatured && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground shadow">
                        <Star className="h-3 w-3 fill-current" /> Destaque
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-1 text-sm font-semibold">{it.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {it.tenant_name}{it.neighborhood ? ` · ${it.neighborhood}` : ""}
                    </p>
                    <p className="mt-1 text-sm font-bold text-primary">{brl(it.promo_price ?? it.price)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
