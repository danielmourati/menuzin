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
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Preview do Guia público</h2>
              <p className="text-sm text-muted-foreground">Assim os clientes enxergam a home do /guia.</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/guia" target="_blank">
                Abrir em nova aba <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="overflow-hidden rounded-2xl border">
            <iframe
              title="Guia Menuzin preview"
              src="/guia"
              className="h-[600px] w-full"
              loading="lazy"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
