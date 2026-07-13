import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Smartphone, Tablet, Monitor, RefreshCw } from "lucide-react";
import {
  useGuiaState,
  useGuiaRequests,
  SLOT_KIND_LABELS,
  type GuiaSlotKind,
} from "@/lib/guia-mock";
import { brl } from "@/lib/format";

type PreviewDevice = "mobile" | "tablet" | "desktop";
const DEVICE_SPECS: Record<PreviewDevice, { label: string; width: number; height: number; icon: typeof Smartphone }> = {
  mobile: { label: "Mobile", width: 390, height: 780, icon: Smartphone },
  tablet: { label: "Tablet", width: 768, height: 900, icon: Tablet },
  desktop: { label: "Desktop", width: 1280, height: 800, icon: Monitor },
};

export const Route = createFileRoute("/platform/guia/")({
  component: PlatformGuiaOverview,
});

function PlatformGuiaOverview() {
  const [device, setDevice] = useState<PreviewDevice>("mobile");
  const [reloadKey, setReloadKey] = useState(0);
  const spec = DEVICE_SPECS[device];
  const state = useGuiaState();
  const requests = useGuiaRequests();

  const counts = (Object.keys(SLOT_KIND_LABELS) as GuiaSlotKind[]).map((k) => ({
    kind: k,
    label: SLOT_KIND_LABELS[k],
    total: state.slots.filter((s) => s.kind === k).length,
    active: state.slots.filter((s) => s.kind === k && s.active).length,
  }));

  const pending = requests.filter((r) => r.status === "pending_payment").length;
  const paid = requests.filter((r) => r.status === "paid").length;
  const totalRevenue = requests
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Categorias ativas</p>
          <p className="mt-1 text-2xl font-bold">{state.categories.filter((c) => c.active).length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Slots ativos</p>
          <p className="mt-1 text-2xl font-bold">{state.slots.filter((s) => s.active).length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Solicitações pendentes</p>
          <p className="mt-1 text-2xl font-bold">{pending}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Receita destaques (pagos)</p>
          <p className="mt-1 text-2xl font-bold">{brl(totalRevenue)}</p>
          <p className="text-xs text-muted-foreground">{paid} pedidos aprovados</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Slots por tipo</h2>
              <p className="text-sm text-muted-foreground">Gerencie cada bloco da home do Guia.</p>
            </div>
            <Button asChild size="sm">
              <Link to="/platform/guia/slots">Gerenciar destaques</Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {counts.map((c) => (
              <div key={c.kind} className="rounded-xl border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
                <p className="mt-1 text-xl font-bold">
                  {c.active}<span className="text-sm font-medium text-muted-foreground"> / {c.total} ativos</span>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">Preview do Guia público</h2>
              <p className="text-sm text-muted-foreground">
                Veja em {spec.label.toLowerCase()} ({spec.width}×{spec.height}) como os clientes enxergam a home do /guia.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border bg-card p-0.5">
                {(Object.keys(DEVICE_SPECS) as PreviewDevice[]).map((d) => {
                  const Icon = DEVICE_SPECS[d].icon;
                  const active = device === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDevice(d)}
                      title={DEVICE_SPECS[d].label}
                      aria-label={DEVICE_SPECS[d].label}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{DEVICE_SPECS[d].label}</span>
                    </button>
                  );
                })}
              </div>
              <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)} title="Recarregar preview">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/guia" target="_blank">
                  Abrir <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex justify-center rounded-2xl border bg-gradient-to-b from-muted/40 to-muted/10 p-4 sm:p-6">
            <div
              className={
                device === "mobile"
                  ? "relative rounded-[2.5rem] border-[10px] border-stone-900 bg-stone-900 shadow-2xl"
                  : device === "tablet"
                    ? "relative rounded-[1.75rem] border-[12px] border-stone-900 bg-stone-900 shadow-2xl"
                    : "relative overflow-hidden rounded-xl border bg-card shadow-lg"
              }
              style={{ width: spec.width + (device === "desktop" ? 0 : 0) }}
            >
              {device === "mobile" && (
                <div className="pointer-events-none absolute left-1/2 top-1 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-stone-900" />
              )}
              <iframe
                key={reloadKey}
                title="Guia Menuzin preview"
                src="/guia"
                width={spec.width}
                height={spec.height}
                className={
                  device === "desktop"
                    ? "block w-full bg-background"
                    : "block bg-background rounded-[1.5rem]"
                }
                style={{ width: spec.width, height: spec.height }}
                loading="lazy"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
