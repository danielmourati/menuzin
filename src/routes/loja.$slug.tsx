import { createFileRoute, redirect } from "@tanstack/react-router";

// Rota legada — redireciona /loja/:slug → /:slug
export const Route = createFileRoute("/loja/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/$slug", params: { slug: params.slug }, replace: true });
  },
  component: () => null,
});
