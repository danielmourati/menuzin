import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ShoppingBag, Package, FolderTree, Settings, Palette, LogOut, Menu, ExternalLink } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { store } from "@/lib/mock-data";

const items = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { to: "/admin/produtos", label: "Produtos", icon: Package },
  { to: "/admin/categorias", label: "Categorias", icon: FolderTree },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
  { to: "/admin/aparencia", label: "Aparência", icon: Palette },
] as const;

function Nav({ onClick }: { onClick?: () => void }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {items.map((i) => {
        const active = pathname === i.to;
        const Icon = i.icon;
        return (
          <Link
            key={i.to}
            to={i.to}
            onClick={onClick}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active ? "bg-primary text-primary-foreground shadow-sm" : "text-sidebar-foreground hover:bg-sidebar-accent"
            }`}
          >
            <Icon className="h-4 w-4" /> {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarInner({ onNav }: { onNav?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="border-b border-sidebar-border px-5 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg gradient-brand text-primary-foreground font-bold">F</div>
          <span className="font-display font-bold">FoodCatálogo</span>
        </Link>
        <div className="mt-3 rounded-xl border border-sidebar-border bg-card p-2.5">
          <p className="text-xs text-muted-foreground">Loja conectada</p>
          <p className="text-sm font-semibold">{store.name}</p>
        </div>
      </div>
      <Nav onClick={onNav} />
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <Button asChild variant="ghost" size="sm" className="w-full justify-start" onClick={onNav}>
          <Link to="/loja/$slug" params={{ slug: store.slug }} target="_blank"><ExternalLink className="mr-2 h-4 w-4" /> Ver loja pública</Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={onNav}>
          <Link to="/admin/login"><LogOut className="mr-2 h-4 w-4" /> Sair</Link>
        </Button>
      </div>
    </div>
  );
}

export function AdminLayout({ children, title, action }: { children?: ReactNode; title?: string; action?: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block">
        <SidebarInner />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-card/80 px-4 backdrop-blur lg:px-8">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SidebarInner onNav={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <h1 className="text-base font-semibold lg:text-lg">{title}</h1>
          <div className="ml-auto">{action}</div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}
