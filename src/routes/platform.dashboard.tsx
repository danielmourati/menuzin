import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Store, Menu, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { clearActiveTenant } from "@/lib/active-tenant";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { brl } from "@/lib/format";
import { listPlatformStores, getPlatformGrowth } from "@/lib/platform.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/platform/dashboard")({ component: PlatformDashboard });

const navItems = [
  { to: "/platform/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { to: "/platform/lojas", label: "Lojas", icon: Store },
] as const;

export function PlatformLayout({ children, title }: { children: ReactNode; title: string }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { loading, isAuthenticated, isPlatformAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) { navigate({ to: "/admin/login" }); return; }
    if (!isPlatformAdmin) { navigate({ to: "/admin/dashboard" }); }
  }, [loading, isAuthenticated, isPlatformAdmin, navigate]);

  if (loading || !isAuthenticated || !isPlatformAdmin) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  const handleLogout = async () => {
    try {
      clearActiveTenant();
      await signOut();
      toast.success("Sessão encerrada.");
      navigate({ to: "/admin/login" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao sair");
    }
  };
  const Inner = ({ onNav }: { onNav?: () => void }) => (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="border-b border-sidebar-border px-5 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg gradient-brand text-primary-foreground font-bold">F</div>
          <span className="font-display font-bold">Menuzin</span>
        </Link>
        <p className="mt-2 text-xs text-muted-foreground">Painel da plataforma</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((i) => {
          const Icon = i.icon;
          const active = pathname === i.to;
          return (
            <Link key={i.to} to={i.to} onClick={onNav}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-primary text-primary-foreground" : "hover:bg-sidebar-accent"}`}>
              <Icon className="h-4 w-4" /> {i.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sm font-medium text-muted-foreground hover:text-foreground"
          onClick={() => { onNav?.(); handleLogout(); }}
        >
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>
    </div>
  );
  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block"><Inner /></aside>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-card/80 px-4 backdrop-blur lg:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden"><Menu className="h-5 w-5" /></Button></SheetTrigger>
            <SheetContent side="left" className="w-72 p-0"><Inner onNav={() => setOpen(false)} /></SheetContent>
          </Sheet>
          <h1 className="text-base font-semibold lg:text-lg">{title}</h1>
          <div className="ml-auto">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function PlatformDashboard() {
  const { data: storesData, isLoading: storesLoading, error: storesError } = useQuery({
    queryKey: ["platform", "stores"],
    queryFn: () => listPlatformStores(),
  });
  const { data: growthData } = useQuery({
    queryKey: ["platform", "growth"],
    queryFn: () => getPlatformGrowth(),
  });

  if (storesLoading) {
    return (
      <PlatformLayout title="Visão geral">
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </PlatformLayout>
    );
  }
  if (storesError) {
    return (
      <PlatformLayout title="Visão geral">
        <p className="rounded-xl border bg-destructive/10 p-4 text-destructive">{(storesError as Error).message}</p>
      </PlatformLayout>
    );
  }

  const stores = storesData?.stores ?? [];
  const growth = growthData?.points ?? [];

  const totalStores = stores.length;
  const active = stores.filter((s) => s.status === "ativa").length;
  const trial = stores.filter((s) => s.status === "teste").length;
  const orders = stores.reduce((s, x) => s + x.orders_month, 0);
  const revenue = stores.reduce((s, x) => s + x.revenue_month, 0);

  const topByOrders = [...stores].sort((a, b) => b.orders_month - a.orders_month).slice(0, 5);
  const topByRevenue = [...stores].sort((a, b) => b.revenue_month - a.revenue_month).slice(0, 5);

  return (
    <PlatformLayout title="Visão geral">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { l: "Total de lojas", v: String(totalStores) },
            { l: "Lojas ativas", v: String(active) },
            { l: "Em teste", v: String(trial) },
            { l: "Pedidos no mês", v: String(orders) },
            { l: "Receita lojas (30d)", v: brl(revenue) },
          ].map((s) => (
            <Card key={s.l}><CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{s.l}</p>
              <p className="mt-1 text-2xl font-bold">{s.v}</p>
            </CardContent></Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Crescimento de lojas</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={growth}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Line dataKey="lojas" stroke="var(--primary)" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Top lojas por pedidos (30d)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topByOrders} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={12} width={130} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Bar dataKey="orders_month" fill="var(--primary)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Top lojas por faturamento (30d)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topByRevenue.length === 0 && <p className="text-sm text-muted-foreground">Nenhum dado ainda.</p>}
            {topByRevenue.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border p-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 font-bold text-primary">{i + 1}</span>
                  <div><p className="font-semibold">{s.name}</p><p className="text-xs text-muted-foreground">{s.city}{s.state ? `/${s.state}` : ""}</p></div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{brl(s.revenue_month)}</p>
                  <Badge variant="outline">{s.plan}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PlatformLayout>
  );
}
