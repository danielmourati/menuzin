import { Link } from "@tanstack/react-router";
import { Home, ShoppingBag, ClipboardList, Ticket } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useCustomerProfile } from "@/lib/customer-profile";
import { useQuery } from "@tanstack/react-query";
import { listCustomerOrders } from "@/lib/customers.functions";
import { StorefrontOrdersDrawer } from "./StorefrontOrdersDrawer";

type Props = {
  slug: string;
  onOpenCart: () => void;
  /** Esconde a barra quando há checkout/cart drawer aberto para não duplicar CTA. */
  hidden?: boolean;
};

const LAST_ORDER_PREFIX = "menuzin:last-order:";

export function saveLastOrderForSlug(slug: string, orderId: string, orderNumber: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${LAST_ORDER_PREFIX}${slug}`,
      JSON.stringify({ id: orderId, number: orderNumber, ts: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

function readLastOrder(slug: string): { id: string; number: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${LAST_ORDER_PREFIX}${slug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id: string; number: number; ts: number };
    // expira em 30 dias
    if (!parsed?.id || Date.now() - (parsed.ts ?? 0) > 30 * 24 * 60 * 60 * 1000) return null;
    return { id: parsed.id, number: parsed.number };
  } catch {
    return null;
  }
}

export function MobileBottomNav({ slug, onOpenCart, hidden = false }: Props) {
  const { count } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const profile = useCustomerProfile();

  const canQuery = !!profile?.phone && !!profile?.token;
  const { data } = useQuery({
    queryKey: ["customer-orders", profile?.phone],
    queryFn: () =>
      listCustomerOrders({ data: { phone: profile!.phone, token: profile!.token } }),
    enabled: canQuery,
    refetchInterval: 15_000,
  });

  const storeOrders = (data?.orders ?? []).filter((o) => o.tenant_slug === slug);
  const activeOrder = storeOrders.find((o) => !["finalizado", "cancelado", "mal_sucedido"].includes(o.status));

  // Fallback to local storage if API hasn't loaded yet and we have a recent local order
  // Note: we can't reliably know its status without the API, so we prioritize the API.
  const [localLastOrder, setLocalLastOrder] = useState<{ id: string; number: number } | null>(null);

  useEffect(() => {
    setLocalLastOrder(readLastOrder(slug));
    const onStorage = () => setLocalLastOrder(readLastOrder(slug));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [slug]);

  const displayedActiveOrder = activeOrder 
    ? { id: activeOrder.id, number: activeOrder.number } 
    : (canQuery && storeOrders.length > 0 ? null : localLastOrder); // only fallback if not queried yet or no API access

  if (hidden) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegação principal"
    >
      <div className="grid grid-cols-4">
        <Link
          to="/$slug"
          params={{ slug }}
          className="flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium text-muted-foreground active:bg-muted/40 [&.active]:text-primary"
          activeProps={{ className: "text-primary" }}
          activeOptions={{ exact: true }}
        >
          <Home className="h-5 w-5" />
          Cardápio
        </Link>

        <Link
          to="/$slug/cupons"
          params={{ slug }}
          className="flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium text-muted-foreground active:bg-muted/40"
          activeProps={{ className: "text-primary" }}
        >
          <Ticket className="h-5 w-5" />
          Cupons
        </Link>

        <button
          type="button"
          onClick={onOpenCart}
          className="relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium text-muted-foreground active:bg-muted/40"
        >
          <span className="relative">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-2 -top-1.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </span>
          Carrinho
        </button>

        {displayedActiveOrder ? (
          <Link
            to="/$slug/acompanhar/$orderId"
            params={{ slug, orderId: displayedActiveOrder.id }}
            className="flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium text-muted-foreground active:bg-muted/40"
            activeProps={{ className: "text-primary" }}
          >
            <ClipboardList className="h-5 w-5" />
            Pedido #{displayedActiveOrder.number}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium text-muted-foreground active:bg-muted/40"
          >
            <ClipboardList className="h-5 w-5" />
            Ver Pedidos
          </button>
        )}
      </div>

      <StorefrontOrdersDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        slug={slug}
      />
    </nav>
  );
}
