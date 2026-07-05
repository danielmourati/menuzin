import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getCatalog } from "@/lib/catalog.functions";
import { dbProductToUi, dbTenantToUi } from "@/lib/db-adapters";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ProductModal } from "@/components/storefront/ProductModal";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/lib/domain-types";

export const Route = createFileRoute("/$slug/destaques")({
  head: ({ params }) => ({
    meta: [
      { title: `Mais vendidos — ${params.slug}` },
      { name: "description", content: "Confira todos os produtos em destaque." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FeaturedPage,
});

function FeaturedPage() {
  const { slug } = Route.useParams();
  return <FeaturedList slug={slug} title="Mais vendidos" filter={(p) => p.featured} />;
}

export function FeaturedList({
  slug,
  title,
  filter,
}: {
  slug: string;
  title: string;
  filter: (p: Product) => boolean;
}) {
  const [selected, setSelected] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const q = useQuery({
    queryKey: ["catalog", slug],
    queryFn: async () => {
      const res = await getCatalog({ data: { slug } });
      if (!res.tenant) return null;
      const catNameById = new Map(res.categories.map((c) => [c.id, c.name]));
      const catKindById = new Map(res.categories.map((c) => [c.id, (c as { kind?: string }).kind === "pizza" ? "pizza" as const : "standard" as const]));
      return {
        tenant: dbTenantToUi(res.tenant),
        products: res.products.map((p) =>
          dbProductToUi(p, p.category_id ? catNameById.get(p.category_id) ?? "" : "", p.category_id ? catKindById.get(p.category_id) ?? "standard" : "standard"),
        ),
      };
    },
    staleTime: 30_000,
  });

  const items = (q.data?.products ?? []).filter(filter);

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur">
        <Link
          to="/$slug"
          params={{ slug }}
          className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-bold">{title}</h1>
      </header>

      <div className="container mx-auto px-4 pt-6">
        {q.isLoading ? (
          <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Carregando…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
            Nenhum produto encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                view="grid"
                tenantSlug={slug}
                onClick={() => {
                  setSelected(p);
                  setOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <ProductModal
        product={selected}
        open={open}
        onOpenChange={setOpen}
        tenantSlug={slug}
        pizzaSizes={[]}
        pizzaFlavors={[]}
        pizzaDoughs={[]}
        pizzaCrusts={[]}
        freeGiftProduct={null}
      />
    </div>
  );
}
