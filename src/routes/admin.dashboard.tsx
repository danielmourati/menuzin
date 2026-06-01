import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { TrendingUp, DollarSign, ShoppingBag, Package, AlertCircle, ChevronRight, Loader2 } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, Pie, PieChart, Legend, Line, LineChart, CartesianGrid } from "recharts";
import { brl, modeLabel, statusColor, statusLabel } from "@/lib/format";
import { getMyTenantAnalytics } from "@/lib/analytics.functions";
import { listOrdersForMyTenant } from "@/lib/orders.functions";

export const Route = createFileRoute("/admin/dashboard")({
  component: DashboardPage,
});

const chartColors = ["oklch(0.66 0.22 35)", "oklch(0.78 0.16 75)", "oklch(0.62 0.16 145)", "oklch(0.55 0.18 260)"];

function StatCard({ icon: Icon, label, value, hint, accent }: { icon: typeof TrendingUp; label: string; value: string; hint?: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            {hint && <p className="mt-1 text-xs text-success">{hint}</p>}
          </div>
          <div className={`grid h-10 w-10 place-items-center rounded-xl ${accent ?? "bg-primary/10 text-primary"}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["admin", "analytics", 7],
    queryFn: () => getMyTenantAnalytics({ data: { days: 7 } }),
  });

  const { data: ordersData } = useQuery({
    queryKey: ["admin", "recent-orders"],
    queryFn: () => listOrdersForMyTenant(),
  });
  const recentOrders = (ordersData?.orders ?? []).slice(0, 5);

  if (isLoading || !analytics) {
    return (
      <AdminLayout title="Dashboard">
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={ShoppingBag} label="Pedidos hoje" value={String(analytics.todayOrdersCount)} />
          <StatCard icon={DollarSign} label="Faturamento hoje" value={brl(analytics.todayRevenue)} accent="bg-success/15 text-success" />
          <StatCard icon={TrendingUp} label="Ticket médio (finalizados)" value={brl(analytics.avgTicket)} />
          <StatCard icon={AlertCircle} label="Pendentes" value={String(analytics.pendingCount)} accent="bg-warning/20 text-warning-foreground" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Package} label="Produtos ativos" value={String(analytics.productsActive)} />
          <StatCard icon={ShoppingBag} label="Pedidos no mês" value={String(analytics.monthOrdersCount)} />
          <StatCard icon={DollarSign} label="Receita finalizada (30d)" value={brl(analytics.monthRevenue)} accent="bg-chart-4/15 text-chart-4" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Vendas dos últimos 7 dias</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={analytics.salesByDay}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Line type="monotone" dataKey="vendas" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Pedidos por modalidade</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={analytics.ordersByMode} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                    {analytics.ordersByMode.map((_entry, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Produtos mais vendidos (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics.topProducts} layout="vertical" margin={{ left: 10 }}>
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={12} width={120} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                    <Bar dataKey="vendas" fill="var(--primary)" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Últimos pedidos</CardTitle>
              <Button asChild size="sm" variant="ghost"><Link to="/admin/pedidos">Ver todos <ChevronRight className="ml-1 h-4 w-4" /></Link></Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentOrders.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p>
              )}
              {recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl border p-3">
                  <div className="min-w-0">
                    <p className="font-semibold">#{o.number} · {o.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{modeLabel[o.mode]} · {brl(Number(o.total))}</p>
                  </div>
                  <Badge className={statusColor[o.status]} variant="secondary">{statusLabel[o.status]}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Alertas</CardTitle></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <Alert tone="success">Sua loja está {analytics.storeOpen ? "aberta" : "fechada"}.</Alert>
            <Alert tone="warning">Você possui {analytics.pendingCount} pedidos pendentes.</Alert>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function Alert({ tone, children }: { tone: "success" | "warning" | "default"; children: React.ReactNode }) {
  const tones = {
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/15 text-warning-foreground border-warning/30",
    default: "bg-muted text-foreground border-border",
  };
  return <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}
