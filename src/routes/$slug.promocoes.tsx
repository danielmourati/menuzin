import { createFileRoute } from "@tanstack/react-router";
import { FeaturedList } from "./$slug.destaques";

export const Route = createFileRoute("/$slug/promocoes")({
  head: ({ params }) => ({
    meta: [
      { title: `Promoções — ${params.slug}` },
      { name: "description", content: "Confira as promoções ativas da loja." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PromoPage,
});

function PromoPage() {
  const { slug } = Route.useParams();
  return (
    <FeaturedList
      slug={slug}
      title="Promoções"
      filter={(p) => {
        const cat = (p.category ?? "").toLowerCase();
        return (cat.includes("promo") || cat.includes("oferta")) && p.available;
      }}
    />
  );
}
