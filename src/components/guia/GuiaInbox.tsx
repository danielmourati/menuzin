// Mensagens e notificações do cliente no Guia — baseadas nos pedidos reais
// do dispositivo (perfil universal por telefone + token) e nas ofertas ativas.
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, MessageSquare, Store as StoreIcon, Tag, Trash2, Undo2, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { listCustomerOrders } from "@/lib/customers.functions";
import { useCustomerProfile } from "@/lib/customer-profile";
import { useDismissed } from "@/lib/guia-inbox-dismiss";
import type { GuiaSlot } from "@/lib/guia-types";
import { brl } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  novo: "Pedido recebido",
  aceito: "Pedido aceito pela loja",
  preparo: "Em preparo",
  saiu_entrega: "Saiu para entrega",
  pronto_retirada: "Pronto para retirada",
  servido: "Servido",
  finalizado: "Pedido finalizado",
  cancelado: "Pedido cancelado",
};

const OPEN_STATUSES = ["novo", "aceito", "preparo", "saiu_entrega", "pronto_retirada"];

export function useCustomerOrdersInbox() {
  const profile = useCustomerProfile();
  const canQuery = !!profile?.phone && !!profile?.token;
  const { data } = useQuery({
    queryKey: ["guia", "inbox", profile?.phone],
    queryFn: () =>
      listCustomerOrders({ data: { phone: profile!.phone, token: profile!.token! } }),
    enabled: canQuery,
    staleTime: 30_000,
  });
  const orders = data?.orders ?? [];
  return { orders, canQuery, profile };
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

export function MessagesButton() {
  const { orders, canQuery } = useCustomerOrdersInbox();
  const stores = Array.from(
    new Map(orders.map((o) => [o.tenant_slug, o])).values(),
  ).slice(0, 8);

  return (
    <Sheet>
      <SheetTrigger
        aria-label="Mensagens"
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-background text-muted-foreground transition hover:text-foreground"
      >
        <MessageSquare className="h-4 w-4" />
        {stores.length > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {stores.length}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-sm">
        <SheetHeader>
          <SheetTitle>Mensagens</SheetTitle>
          <SheetDescription>Fale direto com as lojas onde você já pediu.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {!canQuery || stores.length === 0 ? (
            <EmptyBox text="Assim que você fizer um pedido, a conversa com a loja aparece aqui." />
          ) : (
            stores.map((s) => (
              <a
                key={s.tenant_slug}
                href={`https://wa.me/55${(s.tenant_whatsapp ?? "").replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border bg-card p-3 transition hover:border-primary/40"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                  {s.tenant_logo_url ? (
                    <img src={s.tenant_logo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <StoreIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.tenant_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Último pedido #{s.number} · {STATUS_LABEL[s.status] ?? s.status}
                  </p>
                </div>
              </a>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function NotificationsButton({ offers = [] }: { offers?: GuiaSlot[] }) {
  const { orders, canQuery } = useCustomerOrdersInbox();
  const openOrders = orders.filter((o) => OPEN_STATUSES.includes(o.status));
  const promos = offers.slice(0, 5);
  const count = openOrders.length + promos.length;

  return (
    <Sheet>
      <SheetTrigger
        aria-label="Notificações"
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-background text-muted-foreground transition hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {count}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-sm">
        <SheetHeader>
          <SheetTitle>Notificações</SheetTitle>
          <SheetDescription>Status dos seus pedidos e ofertas ativas.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {count === 0 ? (
            <EmptyBox
              text={
                canQuery
                  ? "Nada novo por enquanto."
                  : "Faça um pedido para acompanhar tudo por aqui, sem cadastro."
              }
            />
          ) : (
            <>
              {openOrders.map((o) => (
                <Link
                  key={o.id}
                  to="/$slug/acompanhar/$orderId"
                  params={{ slug: o.tenant_slug, orderId: o.id }}
                  className="block rounded-xl border bg-card p-3 transition hover:border-primary/40"
                >
                  <p className="text-sm font-semibold">{STATUS_LABEL[o.status] ?? o.status}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.tenant_name} · pedido #{o.number} · {brl(o.total)}
                  </p>
                </Link>
              ))}
              {promos.map((s) => (
                <div key={s.id} className="rounded-xl border bg-card p-3">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
                    <Tag className="h-3.5 w-3.5 text-primary" /> {s.title}
                  </p>
                  {s.subtitle && (
                    <p className="text-xs text-muted-foreground">{s.subtitle}</p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
