import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign, ShoppingBag, TrendingUp, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { brl, statusLabel, modeLabel } from "@/lib/format";
import { getBasicReports } from "@/lib/reports.functions";
import { useAuth } from "@/lib/auth-context";
import { exportReportToPdf, exportReportToExcel } from "@/lib/reports-export";

export const Route = createFileRoute("/admin/relatorios")({
  component: () => (
    <PlanGate min="start" title="Relatórios" featureLabel="Relatórios">
      <ReportsPage />
    </PlanGate>
  ),
});


type Preset = "today" | "7d" | "month" | "custom";

function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rangeFor(preset: Preset): { from: string; to: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (preset === "today") {
    return { from: toDateInput(today), to: toDateInput(today) };
  }
  if (preset === "7d") {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return { from: toDateInput(d), to: toDateInput(today) };
  }
  if (preset === "month") {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toDateInput(d), to: toDateInput(today) };
  }
  return { from: toDateInput(today), to: toDateInput(today) };
}

function ReportsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [preset, setPreset] = useState<Preset>("7d");
  const [range, setRange] = useState(() => rangeFor("7d"));

  const setPresetAndRange = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") setRange(rangeFor(p));
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reports", range.from, range.to],
    queryFn: () => getBasicReports({ data: { from: range.from, to: range.to } }),
    enabled: !authLoading && isAuthenticated && !!range.from && !!range.to,
  });

  const kpis = useMemo(
    () => [
      {
        label: "Vendas totais",
        value: brl(data?.totalSales ?? 0),
        icon: DollarSign,
        accent: "bg-success/15 text-success",
      },
      {
        label: "Pedidos",
        value: String(data?.ordersCount ?? 0),
        icon: ShoppingBag,
        accent: "bg-primary/10 text-primary",
      },
      {
        label: "Ticket médio",
        value: brl(data?.averageTicket ?? 0),
        icon: TrendingUp,
        accent: "bg-chart-4/15 text-chart-4",
      },
    ],
    [data],
  );

  return (
    <AdminLayout title="Relatórios">
      <div className="space-y-6">
        {/* Filtros */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: "today", label: "Hoje" },
                  { id: "7d", label: "Últimos 7 dias" },
                  { id: "month", label: "Mês atual" },
                  { id: "custom", label: "Personalizado" },
                ] as { id: Preset; label: string }[]
              ).map((p) => (
                <Button
                  key={p.id}
                  variant={preset === p.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPresetAndRange(p.id)}
                >
                  {p.label}
                </Button>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading || !data}
                  onClick={() => {
                    try {
                      exportReportToPdf(data!, range);
                      toast.success("PDF exportado");
                    } catch (e) {
                      toast.error("Falha ao exportar PDF");
                    }
                  }}
                  aria-label="Exportar PDF"
                >
                  <FileText className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Exportar PDF</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading || !data}
                  onClick={() => {
                    try {
                      exportReportToExcel(data!, range);
                      toast.success("Excel exportado");
                    } catch (e) {
                      toast.error("Falha ao exportar Excel");
                    }
                  }}
                  aria-label="Exportar Excel"
                >
                  <FileSpreadsheet className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Exportar Excel</span>
                </Button>
              </div>
            </div>
            {preset === "custom" && (
              <div className="grid gap-3 sm:grid-cols-2 max-w-md">
                <div>
                  <Label className="text-xs">De</Label>
                  <Input
                    type="date"
                    value={range.from}
                    max={range.to}
                    onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Até</Label>
                  <Input
                    type="date"
                    value={range.to}
                    min={range.from}
                    onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                    className="mt-1 h-9"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isLoading || !data ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              {kpis.map((k) => (
                <Card key={k.label}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">{k.label}</p>
                        <p className="mt-1 text-2xl font-bold truncate">{k.value}</p>
                      </div>
                      <div className={`grid h-10 w-10 place-items-center rounded-xl ${k.accent}`}>
                        <k.icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Produtos mais vendidos</CardTitle></CardHeader>
                <CardContent>
                  {data.topProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem vendas no período.</p>
                  ) : (
                    <SimpleTable
                      headers={["Produto", "Qtd", "Receita"]}
                      rows={data.topProducts.map((p) => [p.name, String(p.qty), brl(p.revenue)])}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Pedidos por status</CardTitle></CardHeader>
                <CardContent>
                  {data.ordersByStatus.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem dados no período.</p>
                  ) : (
                    <SimpleTable
                      headers={["Status", "Pedidos"]}
                      rows={data.ordersByStatus.map((s) => [statusLabel[s.status] ?? s.status, String(s.count)])}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Formas de pagamento</CardTitle></CardHeader>
                <CardContent>
                  {data.paymentMethods.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem dados no período.</p>
                  ) : (
                    <SimpleTable
                      headers={["Método", "Pedidos", "Total"]}
                      rows={data.paymentMethods.map((m) => [m.method, String(m.count), brl(m.total)])}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Entrega vs retirada vs consumo local</CardTitle></CardHeader>
                <CardContent>
                  {data.ordersByType.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem dados no período.</p>
                  ) : (
                    <SimpleTable
                      headers={["Modalidade", "Pedidos", "Total"]}
                      rows={data.ordersByType.map((t) => [modeLabel[t.mode] ?? t.mode, String(t.count), brl(t.total)])}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
            {headers.map((h, i) => (
              <th key={h} className={`py-2 ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              {r.map((cell, j) => (
                <td key={j} className={`py-2 ${j === 0 ? "text-left" : "text-right tabular-nums"}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
