import { PlanGate } from "@/components/subscription/PlanGate";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  FileText,
  FileSpreadsheet,
  Search,
  ChevronLeft,
  ChevronRight,
  Phone,
  ListFilter,
} from "lucide-react";
import { toast } from "sonner";
import { brl, statusLabel, modeLabel } from "@/lib/format";
import { getBasicReports, type DetailedOrderReportItem } from "@/lib/reports.functions";
import { useAuth } from "@/lib/auth-context";
import { exportReportToPdf, exportReportToExcel } from "@/lib/reports-export";

export const Route = createFileRoute("/admin/relatorios")({
  component: () => (
    <PlanGate min="pro" title="Relatórios" featureLabel="Relatórios">
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
        accent: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
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
        accent: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
      },
    ],
    [data],
  );

  return (
    <AdminLayout title="Relatórios">
      <div className="space-y-6">
        {/* Filtros de Período & Ações de Exportação */}
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
                  className="rounded-lg text-xs"
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
                      toast.success("PDF exportado com sucesso");
                    } catch (e) {
                      toast.error("Falha ao exportar PDF");
                    }
                  }}
                  className="rounded-lg text-xs"
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
                      toast.success("Excel exportado com sucesso");
                    } catch (e) {
                      toast.error("Falha ao exportar Excel");
                    }
                  }}
                  className="rounded-lg text-xs"
                  aria-label="Exportar Excel"
                >
                  <FileSpreadsheet className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Exportar Excel</span>
                </Button>
              </div>
            </div>

            {preset === "custom" && (
              <div className="grid gap-3 sm:grid-cols-2 max-w-md pt-2 border-t">
                <div>
                  <Label className="text-xs font-medium">Data Inicial (De)</Label>
                  <Input
                    type="date"
                    value={range.from}
                    max={range.to}
                    onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Data Final (Até)</Label>
                  <Input
                    type="date"
                    value={range.to}
                    min={range.from}
                    onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isLoading || !data ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid gap-4 sm:grid-cols-3">
              {kpis.map((k) => (
                <Card key={k.label} className="overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{k.label}</p>
                        <p className="mt-1.5 text-2xl font-bold tracking-tight truncate">{k.value}</p>
                      </div>
                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${k.accent}`}>
                        <k.icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Grid de Resumos Agregados */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base font-semibold">Produtos mais vendidos</CardTitle></CardHeader>
                <CardContent>
                  {data.topProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Sem vendas registradas no período.</p>
                  ) : (
                    <SimpleTable
                      headers={["Produto", "Qtd", "Receita"]}
                      rows={data.topProducts.map((p) => [p.name, String(p.qty), brl(p.revenue)])}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base font-semibold">Pedidos por status</CardTitle></CardHeader>
                <CardContent>
                  {data.ordersByStatus.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Sem pedidos registrados no período.</p>
                  ) : (
                    <SimpleTable
                      headers={["Status", "Pedidos"]}
                      rows={data.ordersByStatus.map((s) => [statusLabel[s.status] ?? s.status, String(s.count)])}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base font-semibold">Formas de pagamento</CardTitle></CardHeader>
                <CardContent>
                  {data.paymentMethods.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Sem dados no período.</p>
                  ) : (
                    <SimpleTable
                      headers={["Método", "Pedidos", "Total"]}
                      rows={data.paymentMethods.map((m) => [m.method, String(m.count), brl(m.total)])}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base font-semibold">Entrega vs retirada vs consumo local</CardTitle></CardHeader>
                <CardContent>
                  {data.ordersByType.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Sem dados no período.</p>
                  ) : (
                    <SimpleTable
                      headers={["Modalidade", "Pedidos", "Total"]}
                      rows={data.ordersByType.map((t) => [modeLabel[t.mode] ?? t.mode, String(t.count), brl(t.total)])}
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tabela Interativa de Detalhamento dos Pedidos */}
            <DetailedOrdersSection orders={data.detailedOrders ?? []} />
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
          <tr className="border-b text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            {headers.map((h, i) => (
              <th key={h} className={`pb-2.5 ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-muted/40 transition-colors">
              {r.map((cell, j) => (
                <td key={j} className={`py-2.5 ${j === 0 ? "text-left font-medium" : "text-right tabular-nums text-muted-foreground"}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailedOrdersSection({ orders }: { orders: DetailedOrderReportItem[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filtragem dos pedidos
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        !searchTerm ||
        o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.whatsapp.includes(searchTerm) ||
        String(o.number).includes(searchTerm) ||
        o.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === "all" || o.status === statusFilter;

      const matchMode =
        modeFilter === "all" || o.mode === modeFilter;

      return matchSearch && matchStatus && matchMode;
    });
  }, [orders, searchTerm, statusFilter, modeFilter]);

  // Paginação
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginatedOrders = filteredOrders.slice(startIdx, startIdx + pageSize);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "finalizado":
      case "servido":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">Finalizado</Badge>;
      case "cancelado":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-medium">Cancelado</Badge>;
      case "saiu_entrega":
      case "pronto_retirada":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-medium">{statusLabel[status] ?? status}</Badge>;
      case "preparo":
      case "aceito":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-medium">{statusLabel[status] ?? status}</Badge>;
      default:
        return <Badge variant="outline" className="bg-muted text-muted-foreground font-medium">{statusLabel[status] ?? status}</Badge>;
    }
  };

  const formatDateTime = (iso: string) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <CardTitle className="text-base font-semibold">Detalhamento dos Pedidos</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Listagem completa dos {orders.length} pedido(s) no período selecionado
          </p>
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Busca textual */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar cliente, nº ou tel..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 h-9 text-xs"
            />
          </div>

          {/* Filtro por Status */}
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="finalizado">Finalizados</SelectItem>
              <SelectItem value="preparo">Em preparo</SelectItem>
              <SelectItem value="aceito">Aceitos</SelectItem>
              <SelectItem value="cancelado">Cancelados</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro por Modalidade */}
          <Select
            value={modeFilter}
            onValueChange={(v) => {
              setModeFilter(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Modalidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Modalidades</SelectItem>
              <SelectItem value="entrega">Entrega</SelectItem>
              <SelectItem value="retirada">Retirada</SelectItem>
              <SelectItem value="consumo_local">Consumo Local</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                <th className="py-3 px-4">Pedido</th>
                <th className="py-3 px-4">Data &amp; Hora</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Modalidade</th>
                <th className="py-3 px-4">Pagamento</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum pedido encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/40 transition-colors">
                    {/* Pedido */}
                    <td className="py-3 px-4 font-mono font-semibold text-xs">
                      #{o.number || o.id.slice(0, 6)}
                    </td>

                    {/* Data */}
                    <td className="py-3 px-4 text-xs whitespace-nowrap text-muted-foreground">
                      {formatDateTime(o.createdAt)}
                    </td>

                    {/* Cliente */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-xs text-foreground">{o.customerName}</div>
                      {o.whatsapp && (
                        <a
                          href={`https://wa.me/55${o.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:underline mt-0.5"
                        >
                          <Phone className="w-3 h-3" />
                          {o.whatsapp}
                        </a>
                      )}
                      {o.itemsSummary && (
                        <p className="text-[11px] text-muted-foreground truncate max-w-xs mt-0.5" title={o.itemsSummary}>
                          {o.itemsSummary}
                        </p>
                      )}
                    </td>

                    {/* Modalidade */}
                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      {modeLabel[o.mode] ?? o.mode}
                    </td>

                    {/* Pagamento */}
                    <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                      {o.paymentLabel}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(o.status)}
                    </td>

                    {/* Valor Total */}
                    <td className="py-3 px-4 text-right font-semibold text-xs tabular-nums">
                      {brl(o.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé de Paginação */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t text-xs text-muted-foreground">
          <div>
            Mostrando {filteredOrders.length > 0 ? startIdx + 1 : 0} a{" "}
            {Math.min(startIdx + pageSize, filteredOrders.length)} de{" "}
            <span className="font-medium text-foreground">{filteredOrders.length}</span> pedido(s)
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Por página:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[70px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2">
                {safePage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
