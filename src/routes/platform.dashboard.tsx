import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Store, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { brl } from "@/lib/format";
import { platformStores, platformGrowth } from "@/lib/mock-data";

export const Route = createFileRoute("/platform/dashboard")({ component: PlatformDashboard });

const navItems = [
  { to: "/platform/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { to: "/platform/lojas", label: "Lojas", icon: Store },
] as const;

export function PlatformLayout({ children, title }: { children: ReactNode; title: string }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [open, setOpen] = useState(false);
  const Inner = ({ onNav }: { onNav?: () => void }) => (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="border-b border-sidebar-border px-5 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg gradient-brand text-primary-foreground font-bold">F</div>
          <span className="font-display font-bold">FoodCatálogo</span>
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
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function PlatformDashboard() {
  const totalStores = platformStores.length;
  const active = platformStores.filter((s) => s.status === "ativa").length;
  const trial = platformStores.filter((s) => s.status === "teste").length;
  const orders = platformStores.reduce((s, x) => s + x.ordersMonth, 0);
  const revenue = platformStores.reduce((s, x) => s + x.revenue, 0);

  const topByOrders = [...platformStores].sort((a, b) => b.ordersMonth - a.ordersMonth).slice(0, 5);
  const topByRevenue = [...platformStores].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <PlatformLayout title="Visão geral">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { l: "Total de lojas", v: String(totalStores) },
            { l: "Lojas ativas", v: String(active) },
            { l: "Em teste", v: String(trial) },
            { l: "Pedidos no mês", v: String(orders) },
            { l: "MRR simulado", v: brl(8540) },
            { l: "Receita lojas", v: brl(revenue) },
            { l: "Churn simulado", v: "2,4%" },
            { l: "NPS", v: "72" },
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
                <LineChart data={platformGrowth}>
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
            <CardHeader><CardTitle>Top lojas por pedidos</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topByOrders} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={12} width={130} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Bar dataKey="ordersMonth" fill="var(--primary)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Top lojas por faturamento</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topByRevenue.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border p-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 font-bold text-primary">{i + 1}</span>
                  <div><p className="font-semibold">{s.name}</p><p className="text-xs text-muted-foreground">{s.city}</p></div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{brl(s.revenue)}</p>
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
