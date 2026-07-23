import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getPublicPaymentSettingsBySlug } from "@/lib/payments.functions";
import type { Tenant } from "@/lib/domain-types";
import { brl } from "@/lib/format";
import { Clock, MapPin, Truck, ShoppingBag, UtensilsCrossed } from "lucide-react";

const WEEKDAY_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

export function StoreAboutDrawer({
  open,
  onOpenChange,
  tenant,
  storeOpen,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant;
  storeOpen: boolean;
}) {
  const paymentsQ = useQuery({
    queryKey: ["public-payment-settings", tenant.slug],
    queryFn: () => getPublicPaymentSettingsBySlug({ data: { slug: tenant.slug } }),
    enabled: open,
    staleTime: 60_000,
  });

  const bannerStyle = tenant.coverUrl
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.45)), url(${tenant.coverUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        backgroundImage: `linear-gradient(135deg, ${tenant.themeFrom}, ${tenant.themeTo})`,
      };

  const deliveryOptions = [
    { key: "delivery", label: "Delivery", icon: Truck, active: tenant.acceptsDelivery },
    { key: "takeout", label: "Retirada", icon: ShoppingBag, active: tenant.acceptsTakeout },
    { key: "dinein", label: "Consumo no Local", icon: UtensilsCrossed, active: tenant.acceptsDinein },
  ].filter((o) => o.active);

  const scheduleByWeekday = new Map<number, { open: string; close: string; enabled: boolean }>();
  for (const s of tenant.hoursSchedule ?? []) {
    scheduleByWeekday.set(s.weekday, { open: s.open, close: s.close, enabled: s.enabled });
  }

  const payments = paymentsQ.data;
  const paymentPills: string[] = [];
  if (payments?.cash_enabled) paymentPills.push("Dinheiro");
  if (payments?.credit_card_enabled) paymentPills.push("Cartão de Crédito");
  if (payments?.debit_card_enabled) paymentPills.push("Cartão de Débito");
  if (payments?.pix_enabled || payments?.pix_manual_enabled) paymentPills.push("PIX");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92vh] overflow-y-auto rounded-t-3xl p-0 sm:max-w-lg sm:mx-auto"
      >
        {/* Hero */}
        <div
          className="relative flex flex-col items-center gap-3 px-6 pb-8 pt-10 text-center"
          style={bannerStyle}
        >
          <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border-4 border-white bg-white shadow-md">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-foreground">{tenant.logoLetter}</span>
            )}
          </div>
          <h2 className="max-w-[80%] text-xl font-bold text-white drop-shadow">
            {tenant.name}
          </h2>
        </div>

        {/* Chips */}
        <div className="mx-4 mt-4 mb-4 flex flex-wrap items-center justify-center gap-2 rounded-2xl border bg-card p-3 shadow-[var(--shadow-soft)]">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Truck className="h-3.5 w-3.5" /> Entrega {brl(tenant.deliveryFee)}
          </span>
          <span className="text-muted-foreground/40">•</span>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> {tenant.prepTime || "—"}
          </span>
          <span className="text-muted-foreground/40">•</span>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            Mín. {brl(tenant.minOrder)}
          </span>
        </div>

        <div className="space-y-6 px-5 pb-8">
          {tenant.description && (
            <p className="text-sm text-muted-foreground">{tenant.description}</p>
          )}

          {tenant.address && (
            <section>
              <h3 className="mb-2 text-sm font-bold">Endereço</h3>
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{tenant.address}</span>
              </p>
            </section>
          )}

          {deliveryOptions.length > 0 && (
            <section>
              <h3 className="mb-3 text-base font-bold">Opções de entrega</h3>
              <div className="grid grid-cols-3 gap-2">
                {deliveryOptions.map((o) => {
                  const Icon = o.icon;
                  return (
                    <div
                      key={o.key}
                      className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-3 text-center"
                    >
                      <Icon className="h-6 w-6 text-primary" />
                      <span className="text-xs font-medium">{o.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-base font-bold">Horário de funcionamento</h3>
              <Badge
                className={
                  storeOpen
                    ? "bg-success text-success-foreground"
                    : "bg-destructive/15 text-destructive"
                }
              >
                {storeOpen ? "Aberta" : "Fechada"}
              </Badge>
            </div>
            <div className="divide-y rounded-2xl border bg-card">
              {WEEKDAY_LABELS.map((label, weekday) => {
                const s = scheduleByWeekday.get(weekday);
                const today = new Date().getDay() === weekday;
                return (
                  <div
                    key={weekday}
                    className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                      today ? "font-semibold" : ""
                    }`}
                  >
                    <span className="w-12 text-muted-foreground">{label}</span>
                    <span className={s?.enabled ? "" : "text-muted-foreground/60"}>
                      {s?.enabled ? `${s.open} às ${s.close}` : "Fechado"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {paymentPills.length > 0 && (
            <section>
              <h3 className="mb-1 text-base font-bold">Formas de Pagamento</h3>
              <p className="mb-3 text-xs text-muted-foreground">Na entrega:</p>
              <div className="flex flex-wrap gap-2">
                {paymentPills.map((p) => (
                  <span
                    key={p}
                    className="rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-medium"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </section>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
