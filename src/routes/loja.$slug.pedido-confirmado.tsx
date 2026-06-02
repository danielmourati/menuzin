import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/loja/$slug/pedido-confirmado")({
  validateSearch: (s: Record<string, unknown>) => ({ n: Number(s.n) || 0 }),
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: "/$slug/pedido-confirmado",
      params: { slug: params.slug },
      search,
      replace: true,
    });
  },
  component: () => null,
});
