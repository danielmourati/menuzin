import { createFileRoute } from "@tanstack/react-router";
import { CustomerOrderTracking } from "@/components/storefront/CustomerOrderTracking";

export const Route = createFileRoute("/loja/$slug/acompanhar/$orderId")({
  component: TrackPage,
});

function TrackPage() {
  const { slug, orderId } = Route.useParams();

  return <CustomerOrderTracking slug={slug} orderId={orderId} />;
}
