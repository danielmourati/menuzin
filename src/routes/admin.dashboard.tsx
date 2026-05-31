import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { TrendingUp, DollarSign, ShoppingBag, Package, Users, AlertCircle, ChevronRight } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, Pie, PieChart, Legend, Line, LineChart, CartesianGrid } from "recharts";
import { brl, modeLabel, statusColor, statusLabel } from "@/lib/format";
import { orders, salesLast7Days, ordersByMode, topProducts, store } from "@/lib/mock-data";

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
  const pending = orders.filter((o) => ["novo", "confirmado", "preparo"].includes(o.status)).length;
  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={ShoppingBag} label="Pedidos hoje" value="24" hint="+12% vs ontem" />
          <StatCard icon={DollarSign} label="Faturamento hoje" value={brl(1284.5)} hint="+18% vs ontem" accent="bg-success/15 text-success" />
          <StatCard icon={TrendingUp} label="Ticket médio" value={brl(53.5)} />
          <StatCard icon={AlertCircle} label="Pendentes" value={String(pending)} accent="bg-warning/20 text-warning-foreground" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Package} label="Produtos ativos" value="11" />
          <StatCard icon={Users} label="Clientes do mês" value="187" />
          <StatCard icon={ShoppingBag} label="Pedidos no mês" value="412" />
          <StatCard icon={DollarSign} label="MRR estimado" value={brl(18420)} accent="bg-chart-4/15 text-chart-4" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Vendas dos últimos 7 dias</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={salesLast7Days}>
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
                  <Pie data={ordersByMode} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                    {ordersByMode.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
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
              <CardTitle>Produtos mais vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={12} width={120} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Bar dataKey="vendas" fill="var(--primary)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Últimos pedidos</CardTitle>
              <Button asChild size="sm" variant="ghost"><Link to="/admin/pedidos">Ver todos <ChevronRight className="ml-1 h-4 w-4" /></Link></Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {orders.slice(0, 5).map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl border p-3">
                  <div className="min-w-0">
                    <p className="font-semibold">#{o.number} · {o.customerName}</p>
                    <p className="text-xs text-muted-foreground">{modeLabel[o.mode]} · {brl(o.total)}</p>
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
            <Alert tone="success">Sua loja está {store.open ? "aberta" : "fechada"}.</Alert>
            <Alert tone="warning">Você possui {pending} pedidos pendentes.</Alert>
            <Alert tone="default">1 produto está indisponível.</Alert>
            <Alert tone="default">Compartilhe seu link no Instagram para vender mais.</Alert>
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
