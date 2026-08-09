import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Endereço legível do produto: /:loja/:slug-do-produto
 * Reaproveita a página da loja abrindo o produto pelo deep link ?produto=.
 */
export const Route = createFileRoute("/$slug/$produtoSlug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/$slug",
      params: { slug: params.slug },
      search: { produto: params.produtoSlug },
    });
  },
  component: () => null,
});
