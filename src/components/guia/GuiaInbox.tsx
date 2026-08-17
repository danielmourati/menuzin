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

function InboxActions({
  visibleCount,
  hasDismissed,
  onClear,
  onRestore,
  clearLabel,
}: {
  visibleCount: number;
  hasDismissed: boolean;
  onClear: () => void;
  onRestore: () => void;
  clearLabel: string;
}) {
  if (visibleCount === 0 && !hasDismissed) return null;
  return (
    <div className="mt-3 flex items-center justify-end gap-2">
      {hasDismissed && (
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={onRestore}>
          <Undo2 className="h-3.5 w-3.5" /> Restaurar
        </Button>
      )}
      {visibleCount > 0 && (
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onClear}>
          <Trash2 className="h-3.5 w-3.5" /> {clearLabel}
        </Button>
      )}
    </div>
  );
}

function DismissButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}

export function MessagesButton() {
  const { orders, canQuery } = useCustomerOrdersInbox();
  const { dismiss, dismissAll, restore, isDismissed, hasDismissed } = useDismissed("messages");

  const stores = Array.from(new Map(orders.map((o) => [o.tenant_slug, o])).values())
    .filter((s) => !isDismissed(s.tenant_slug))
    .slice(0, 8);

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
      <SheetContent side="right" className="w-full max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Mensagens</SheetTitle>
          <SheetDescription>Fale direto com as lojas onde você já pediu.</SheetDescription>
        </SheetHeader>
        <InboxActions
          visibleCount={stores.length}
          hasDismissed={hasDismissed}
          clearLabel="Arquivar todas"
          onClear={() => dismissAll(stores.map((s) => s.tenant_slug))}
          onRestore={restore}
        />
        <div className="mt-3 space-y-2">
          {!canQuery || stores.length === 0 ? (
            <EmptyBox
              text={
                hasDismissed
                  ? "Nenhuma conversa por aqui. Use Restaurar para ver as arquivadas."
                  : "Assim que você fizer um pedido, a conversa com a loja aparece aqui."
              }
            />
          ) : (
            stores.map((s) => (
              <div
                key={s.tenant_slug}
                className="flex items-center gap-2 rounded-xl border bg-card p-3 transition hover:border-primary/40"
              >
                <a
                  href={`https://wa.me/55${(s.tenant_whatsapp ?? "").replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-3"
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
                <DismissButton
                  label={`Arquivar conversa com ${s.tenant_name}`}
                  onClick={() => dismiss(s.tenant_slug)}
                />
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function NotificationsButton({ offers = [] }: { offers?: GuiaSlot[] }) {
  const { orders, canQuery } = useCustomerOrdersInbox();
  const { dismiss, dismissAll, restore, isDismissed, hasDismissed } = useDismissed("notifications");

  const openOrders = orders.filter(
    (o) => OPEN_STATUSES.includes(o.status) && !isDismissed(`order:${o.id}`),
  );
  const promos = offers.filter((s) => !isDismissed(`slot:${s.id}`)).slice(0, 5);
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
      <SheetContent side="right" className="w-full max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Notificações</SheetTitle>
          <SheetDescription>Status dos seus pedidos e ofertas ativas.</SheetDescription>
        </SheetHeader>
        <InboxActions
          visibleCount={count}
          hasDismissed={hasDismissed}
          clearLabel="Limpar tudo"
          onClear={() =>
            dismissAll([
              ...openOrders.map((o) => `order:${o.id}`),
              ...promos.map((s) => `slot:${s.id}`),
            ])
          }
          onRestore={restore}
        />
        <div className="mt-3 space-y-2">
          {count === 0 ? (
            <EmptyBox
              text={
                hasDismissed
                  ? "Tudo limpo por aqui. Use Restaurar para ver as arquivadas."
                  : canQuery
                    ? "Nada novo por enquanto."
                    : "Faça um pedido para acompanhar tudo por aqui, sem cadastro."
              }
            />
          ) : (
            <>
              {openOrders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center gap-2 rounded-xl border bg-card p-3 transition hover:border-primary/40"
                >
                  <Link
                    to="/$slug/acompanhar/$orderId"
                    params={{ slug: o.tenant_slug, orderId: o.id }}
                    className="min-w-0 flex-1"
                  >
                    <p className="text-sm font-semibold">{STATUS_LABEL[o.status] ?? o.status}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.tenant_name} · pedido #{o.number} · {brl(o.total)}
                    </p>
                  </Link>
                  <DismissButton
                    label={`Arquivar notificação do pedido ${o.number}`}
                    onClick={() => dismiss(`order:${o.id}`)}
                  />
                </div>
              ))}
              {promos.map((s) => (
                <div key={s.id} className="flex items-start gap-2 rounded-xl border bg-card p-3">
                  <div className="min-w-0 flex-1">
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
                      <Tag className="h-3.5 w-3.5 text-primary" /> {s.title}
                    </p>
                    {s.subtitle && (
                      <p className="text-xs text-muted-foreground">{s.subtitle}</p>
                    )}
                  </div>
                  <DismissButton
                    label={`Arquivar oferta ${s.title}`}
                    onClick={() => dismiss(`slot:${s.id}`)}
                  />
                </div>
              ))}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
