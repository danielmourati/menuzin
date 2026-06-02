import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/loja/$slug/acompanhar/$orderId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/$slug/acompanhar/$orderId",
      params: { slug: params.slug, orderId: params.orderId },
      replace: true,
    });
  },
  component: () => null,
});
