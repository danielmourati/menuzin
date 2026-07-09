import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listCategories, listFeatured, DIRECTORY_CATEGORIES } from "@/lib/directory.functions";
import { productImage } from "@/lib/product-image";
import { brl } from "@/lib/format";
import { ChevronLeft, MapPin, Star } from "lucide-react";

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
      { name: "description", content: "Descubra restaurantes, marmitex, pizzas, açaí e mais no seu bairro. Peça direto pelo WhatsApp." },
      { property: "og:title", content: "Guia Menuzin — comida do seu bairro" },
      { property: "og:description", content: "O guia local dos restaurantes e comidas de Parnaíba. Peça direto pelo WhatsApp." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://menuzin.app/guia" },
    ],
    links: [{ rel: "canonical", href: "https://menuzin.app/guia" }],
  }),
  component: GuiaHome,
});

function GuiaHome() {
  const { data: catsData } = useSuspenseQuery(categoriesQO);
  const { data: featData } = useSuspenseQuery(featuredQO);
  const featured = featData.items;

  return (
    <div className="min-h-screen bg-muted/30 pb-16">
      <header className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Menuzin
          </Link>
          <div className="mx-auto flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-primary" /> Parnaíba - PI
          </div>
          <div className="w-14" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <section>
          <h1 className="text-2xl font-bold tracking-tight">Guia Menuzin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Encontre comida do seu bairro. Peça direto pelo WhatsApp da loja.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Categorias</h2>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
            {DIRECTORY_CATEGORIES.map((c) => {
              const count = catsData.categories.find((x) => x.slug === c.slug)?.count ?? 0;
              return (
                <Link
                  key={c.slug}
                  to="/guia/$categoria"
                  params={{ categoria: c.slug }}
                  className="group flex flex-col items-center gap-1.5 rounded-2xl border border-transparent bg-card p-3 text-center shadow-sm transition hover:border-primary/40"
                >
                  <span className="text-3xl transition group-hover:scale-110">{c.emoji}</span>
                  <span className="text-xs font-medium leading-tight">{c.label}</span>
                  {count > 0 && (
                    <span className="text-[10px] text-muted-foreground">{count} {count === 1 ? "opção" : "opções"}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        {featured.length > 0 && (
          <section className="mt-8">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-bold">Em destaque agora 🔥</h2>
              <span className="text-xs text-muted-foreground">só os lançamentos do bairro</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((it) => (
                <Link
                  key={it.product_id}
                  to="/guia/produto/$id"
                  params={{ id: it.product_id }}
                  className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:shadow-md"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    <img src={productImage(it.image_url)} alt={it.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground shadow">
                      <Star className="h-3 w-3 fill-current" /> Destaque
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-1 text-sm font-semibold">{it.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {it.tenant_name}{it.neighborhood ? ` · ${it.neighborhood}` : ""}
                    </p>
                    <p className="mt-1 text-sm font-bold text-primary">{brl(it.promo_price ?? it.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {featured.length === 0 && (
          <section className="mt-8 rounded-2xl border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Escolha uma categoria acima para ver o que está saindo do forno no seu bairro.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
