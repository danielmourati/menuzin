import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Receipt, Store as StoreIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { listCustomerOrders } from "@/lib/customers.functions";
import { useCustomerProfile, clearCustomerProfile } from "@/lib/customer-profile";

export const Route = createFileRoute("/meus-pedidos")({
  head: () => ({
    meta: [
      { title: "Meus pedidos | Menuzin" },
      {
        name: "description",
        content:
          "Veja o histórico dos seus pedidos feitos nas lojas do Menuzin, sem precisar criar conta.",
      },
      { property: "og:title", content: "Meus pedidos | Menuzin" },
      {
        property: "og:description",
        content: "Histórico dos seus pedidos nas lojas do Menuzin, sem login.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyOrdersPage,
});

const STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  aceito: "Aceito",
  preparo: "Em preparo",
  saiu_entrega: "Saiu para entrega",
  pronto_retirada: "Pronto para retirada",
  servido: "Servido",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

function MyOrdersPage() {
  const profile = useCustomerProfile();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const canQuery = !!profile?.phone && !!profile?.token;
  const { data, isLoading } = useQuery({
    queryKey: ["customer-orders", profile?.phone],
    queryFn: () =>
      listCustomerOrders({
        data: { phone: profile!.phone, token: profile!.token! },
      }),
    enabled: canQuery,
    staleTime: 15_000,
  });

  const orders = data?.orders ?? [];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl">
            <Link to="/guia">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-base font-bold leading-tight">Meus pedidos</h1>
            <p className="text-xs text-muted-foreground">
              {profile?.name ? `Olá, ${profile.name}` : "Histórico neste dispositivo"}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {!hydrated || (canQuery && isLoading) ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : !canQuery ? (
          <EmptyState
            title="Nenhum pedido por aqui"
            text="Faça um pedido em qualquer loja do Menuzin e ele aparecerá automaticamente nesta página — sem cadastro."
          />
        ) : orders.length === 0 ? (
          <EmptyState
            title="Você ainda não tem pedidos"
            text="Quando você finalizar um pedido, o histórico aparece aqui."
          />
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  to="/$slug/acompanhar/$orderId"
                  params={{ slug: o.tenant_slug, orderId: o.id }}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 transition hover:border-primary/40"
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                    {o.tenant_logo_url ? (
                      <img
                        src={o.tenant_logo_url}
                        alt={`Logo ${o.tenant_name}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <StoreIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{o.tenant_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      #{o.number} · {STATUS_LABEL[o.status] ?? o.status} ·{" "}
                      {new Date(o.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold">{brl(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {canQuery && (
          <button
            type="button"
            onClick={() => clearCustomerProfile()}
            className="mx-auto mt-8 block text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Esquecer meus dados neste dispositivo
          </button>
        )}
      </main>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border bg-card p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
        <Receipt className="h-6 w-6" />
      </div>
      <h2 className="mt-3 font-semibold">{title}</h2>
      <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">{text}</p>
      <Button asChild className="mt-4">
        <Link to="/guia">Explorar o Guia</Link>
      </Button>
    </div>
  );
}
