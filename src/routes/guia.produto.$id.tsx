import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getDirectoryProduct } from "@/lib/directory.functions";
import { productImage } from "@/lib/product-image";
import { brl } from "@/lib/format";
import { ChevronLeft, MapPin, MessageCircle, ExternalLink } from "lucide-react";

const productQO = (id: string) => queryOptions({
  queryKey: ["guia", "product", id],
  queryFn: () => getDirectoryProduct({ data: { productId: id } }),
});

export const Route = createFileRoute("/guia/produto/$id")({
  loader: async ({ params, context }) => {
    const res = await context.queryClient.ensureQueryData(productQO(params.id));
    if (!res.item) throw notFound();
    return { item: res.item };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Guia Menuzin" }, { name: "robots", content: "noindex" }] };
    const it = loaderData.item;
    const title = `${it.name} — ${it.tenant_name} | Guia Menuzin`;
    const desc = it.description || `${it.name} disponível em ${it.tenant_name}${it.neighborhood ? ` (${it.neighborhood})` : ""}.`;
    const url = `https://menuzin.app/guia/produto/${it.product_id}`;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: it.name,
      description: desc,
      image: it.image_url ?? undefined,
      offers: {
        "@type": "Offer",
        priceCurrency: "BRL",
        price: (it.promo_price ?? it.price).toString(),
        availability: "https://schema.org/InStock",
        seller: { "@type": "Restaurant", name: it.tenant_name },
      },
    };
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(it.image_url ? [{ property: "og:image", content: it.image_url }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
    };
  },
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <p className="text-lg font-semibold">Produto indisponível</p>
        <Link to="/guia" className="mt-2 inline-block text-sm text-primary underline">Voltar ao Guia</Link>
      </div>
    </div>
  ),
  errorComponent: () => (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <p className="text-sm text-muted-foreground">Não foi possível carregar este produto.</p>
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(productQO(id));
  const it = data.item!;

  const handleOrder = () => {
    // fire-and-forget click ping
    try {
      const dest = it.whatsapp ? "whatsapp" : "storefront";
      const body = JSON.stringify({ product_id: it.product_id, destination: dest });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/public/guia-click", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/public/guia-click", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
      }
    } catch { /* ignore */ }

    if (it.whatsapp) {
      const clean = it.whatsapp.replace(/\D/g, "");
      const msg = encodeURIComponent(`Olá! Vi "${it.name}" no Guia Menuzin e quero pedir.`);
      window.location.href = `https://wa.me/${clean}?text=${msg}`;
    } else {
      window.location.href = `/${it.tenant_slug}`;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <header className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link to="/guia" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Guia
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="aspect-[4/3] w-full overflow-hidden bg-muted sm:aspect-[16/9]">
            <img src={productImage(it.image_url)} alt={it.name} className="h-full w-full object-cover" />
          </div>
          <div className="p-5">
            <h1 className="text-2xl font-bold">{it.name}</h1>
            <div className="mt-2 flex items-baseline gap-2">
              {it.promo_price != null ? (
                <>
                  <span className="text-2xl font-bold text-primary">{brl(it.promo_price)}</span>
                  <span className="text-sm text-muted-foreground line-through">{brl(it.price)}</span>
                </>
              ) : (
                <span className="text-2xl font-bold text-primary">{brl(it.price)}</span>
              )}
            </div>
            {it.description && (
              <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{it.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3 border-t bg-muted/30 p-4">
            {it.tenant_logo && (
              <img src={it.tenant_logo} alt={it.tenant_name} className="h-11 w-11 rounded-full border object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{it.tenant_name}</p>
              <p className="truncate text-xs text-muted-foreground">
                <MapPin className="mr-1 inline h-3 w-3" />
                {it.neighborhood ? `${it.neighborhood} · ` : ""}{it.city ?? ""}
              </p>
            </div>
            <Link
              to="/$slug"
              params={{ slug: it.tenant_slug }}
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium hover:border-primary/50"
            >
              Ver loja <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 p-3 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={handleOrder}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-lg transition hover:brightness-110"
          >
            <MessageCircle className="h-5 w-5" />
            {it.whatsapp ? "Pedir agora no WhatsApp" : "Ir para a loja"}
          </button>
        </div>
      </div>
    </div>
  );
}
