import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, ShoppingBag, Package, FolderTree, Settings, Palette, LogOut, Menu, ExternalLink, Loader2, Layers, Store, X, Power, PanelLeftClose, PanelLeftOpen, Ticket, MapPin } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AdminNotificationsBell } from "@/components/admin/AdminNotificationsBell";
import { OrdersRealtimeListener } from "@/components/orders/OrdersRealtimeListener";
import { useAuth } from "@/lib/auth-context";
import { getMyTenant, claimNewTenant, updateMyTenant } from "@/lib/tenants.functions";
import { useActiveTenantId, clearActiveTenant } from "@/lib/active-tenant";
import { toast } from "sonner";

const items = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { to: "/admin/produtos", label: "Produtos", icon: Package },
  { to: "/admin/categorias", label: "Categorias", icon: FolderTree },
  { to: "/admin/adicionais", label: "Adicionais", icon: Layers },
  { to: "/admin/cupons", label: "Cupons", icon: Ticket },
  { to: "/admin/taxas-entrega", label: "Taxas de entrega", icon: MapPin },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },

  { to: "/admin/aparencia", label: "Aparência", icon: Palette },
] as const;

function Nav({ onClick, collapsed }: { onClick?: () => void; collapsed?: boolean }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <TooltipProvider delayDuration={200}>
      <nav className={`flex flex-1 flex-col gap-1 py-4 ${collapsed ? "px-2" : "px-3"}`}>
        {items.map((i) => {
          const active = pathname === i.to;
          const Icon = i.icon;
          const link = (
            <Link
              key={i.to}
              to={i.to}
              onClick={onClick}
              className={`flex items-center gap-3 rounded-xl text-sm font-medium transition ${
                collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
              } ${
                active ? "bg-primary text-primary-foreground shadow-sm" : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" /> {!collapsed && i.label}
            </Link>
          );
          return collapsed ? (
            <Tooltip key={i.to}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{i.label}</TooltipContent>
            </Tooltip>
          ) : (
            link
          );
        })}
      </nav>
    </TooltipProvider>
  );
}

function SidebarInner({ onNav, collapsed }: { onNav?: () => void; collapsed?: boolean }) {
  const { signOut, profile } = useAuth();
  const activeTenantId = useActiveTenantId();
  const { data } = useQuery({
    queryKey: ["my-tenant", activeTenantId ?? profile?.tenant_id ?? "none"],
    queryFn: () => getMyTenant(),
    enabled: !!(profile?.tenant_id || activeTenantId),
  });
  const tenant = data?.tenant;
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className={`border-b border-sidebar-border ${collapsed ? "px-2 py-4" : "px-5 py-4"}`}>
        <Link to="/" className={`flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
          <div className="grid h-8 w-8 place-items-center rounded-lg gradient-brand text-primary-foreground font-bold">M</div>
          {!collapsed && <span className="font-display font-bold">Menuzin</span>}
        </Link>
        {!collapsed && (
          <div className="mt-3 rounded-xl border border-sidebar-border bg-card p-2.5">
            <p className="text-xs text-muted-foreground">Loja conectada</p>
            <p className="text-sm font-semibold">{tenant?.name ?? "—"}</p>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        <Nav onClick={onNav} collapsed={collapsed} />
      </div>
      <div className={`mt-auto border-t border-sidebar-border space-y-1 ${collapsed ? "p-2" : "p-3"}`}>
        {tenant?.slug && (
          <Button asChild variant="ghost" size="sm" className={`w-full ${collapsed ? "justify-center px-0" : "justify-start"}`} onClick={onNav} title="Ver loja pública">
            <Link to="/$slug" params={{ slug: tenant.slug }} target="_blank">
              <ExternalLink className={collapsed ? "h-4 w-4" : "mr-2 h-4 w-4"} />
              {!collapsed && "Ver loja pública"}
            </Link>
          </Button>
        )}
        <Button
          variant="ghost" size="sm"
          className={`w-full text-muted-foreground ${collapsed ? "justify-center px-0" : "justify-start"}`}
          title="Sair"
          onClick={async () => {
            await signOut();
            navigate({ to: "/admin/login" });
          }}
        >
          <LogOut className={collapsed ? "h-4 w-4" : "mr-2 h-4 w-4"} />
          {!collapsed && "Sair"}
        </Button>
      </div>
    </div>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated, profile, isPlatformAdmin } = useAuth();
  const activeTenantId = useActiveTenantId();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate({ to: "/admin/login" });
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    if (
      !loading &&
      isAuthenticated &&
      profile?.must_change_password &&
      pathname !== "/admin/trocar-senha"
    ) {
      navigate({ to: "/admin/trocar-senha", replace: true });
    }
  }, [loading, isAuthenticated, profile?.must_change_password, pathname, navigate]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  // Quando precisa trocar a senha, renderiza apenas a página de troca (sem sidebar/tenant gate).
  if (profile?.must_change_password && pathname === "/admin/trocar-senha") {
    return <>{children}</>;
  }
  if (profile?.must_change_password) return null;

  const hasOwnTenant = !!profile?.tenant_id;
  if (!hasOwnTenant && !activeTenantId) {
    if (isPlatformAdmin) return <PlatformAdminEmptyState />;
    return <OnboardingClaim />;
  }
  return <>{children}</>;
}

function PlatformAdminEmptyState() {
  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-[var(--shadow-soft)]">
        <Store className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-bold">Selecione uma loja</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Como administrador da plataforma, escolha uma loja em <strong>Lojas</strong> para acessar o painel correspondente.
        </p>
        <Button asChild className="mt-5 h-11 w-full">
          <Link to="/platform/lojas">Ir para Lojas</Link>
        </Button>
        <Button asChild variant="ghost" className="mt-2 h-11 w-full">
          <Link to="/platform/dashboard">Voltar ao painel da plataforma</Link>
        </Button>
      </div>
    </div>
  );
}

function OnboardingClaim() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await claimNewTenant({ data: { slug, name, whatsapp, city } });
      toast.success("Loja criada com sucesso!");
      await refresh();
      navigate({ to: "/admin/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar loja");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
        <h1 className="text-xl font-bold">Vamos criar sua loja</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure as informações básicas para começar a receber pedidos.</p>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <Label>Nome da loja *</Label>
            <Input value={name} onChange={(e) => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }} required minLength={2} className="mt-1.5" />
          </div>
          <div>
            <Label>Endereço público (slug) *</Label>
            <div className="mt-1.5 flex items-center rounded-md border bg-background">
              <span className="px-3 text-sm text-muted-foreground">menuzin.app/</span>
              <input
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                required pattern="[a-z0-9-]{2,60}"
                className="h-10 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <div>
            <Label>WhatsApp (com DDI) *</Label>
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="5586999999999" required className="mt-1.5" />
          </div>
          <div>
            <Label>Cidade *</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} required className="mt-1.5" />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar minha loja
          </Button>
        </form>
      </div>
    </div>
  );
}

export function AdminLayout({ children, title, action }: { children?: ReactNode; title?: string; action?: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true); // always start collapsed
  return (
    <AuthGate>
      <div className="flex min-h-screen bg-muted/30">
        <OrdersRealtimeListener />
        <aside
          className={`hidden shrink-0 border-r border-sidebar-border lg:block transition-[width] duration-200 ${
            collapsed ? "w-16" : "w-64"
          }`}
        >
          <SidebarInner collapsed={collapsed} />
        </aside>
        <div className="flex flex-1 flex-col min-w-0">
          <ImpersonationBanner />
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-card/80 px-4 backdrop-blur lg:px-8">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SidebarInner onNav={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:inline-flex"
              onClick={() => setCollapsed((v) => !v)}
              title={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </Button>
            <h1 className="text-base font-semibold lg:text-lg truncate">{title}</h1>
            <div className="ml-auto flex items-center gap-2">
              <StoreOpenToggle />
              <AdminNotificationsBell />
              {action}
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-8">{children ?? <Outlet />}</main>
        </div>
      </div>
    </AuthGate>
  );
}

function ImpersonationBanner() {
  const { isPlatformAdmin } = useAuth();
  const activeTenantId = useActiveTenantId();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["my-tenant", activeTenantId ?? "none"],
    queryFn: () => getMyTenant(),
    enabled: !!activeTenantId,
  });
  if (!isPlatformAdmin || !activeTenantId) return null;
  const name = data?.tenant?.name ?? "loja";
  return (
    <div className="flex items-center justify-between gap-2 border-b border-warning/40 bg-warning/15 px-4 py-2 text-sm lg:px-8">
      <span className="truncate">
        <strong>Modo admin:</strong> acessando o painel de <strong>{name}</strong>
      </span>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          clearActiveTenant();
          qc.invalidateQueries();
          navigate({ to: "/platform/lojas" });
        }}
      >
        <X className="mr-1 h-4 w-4" /> Sair da loja
      </Button>
    </div>
  );
}

function StoreOpenToggle() {
  const { profile, isPlatformAdmin } = useAuth();
  const activeTenantId = useActiveTenantId();
  const qc = useQueryClient();
  const tenantKey = activeTenantId ?? profile?.tenant_id ?? "none";
  const { data } = useQuery({
    queryKey: ["my-tenant", tenantKey],
    queryFn: () => getMyTenant(),
    enabled: !!(profile?.tenant_id || activeTenantId),
    // Recalcula o status com base no relógio a cada minuto.
    refetchInterval: 60_000,
  });
  const tenant = data?.tenant;

  const canToggle = !!tenant && (isPlatformAdmin || !!profile?.tenant_id);

  const mut = useMutation({
    mutationFn: (open_mode: "auto" | "open" | "closed") =>
      updateMyTenant({ data: { open_mode } }),
    onSuccess: (_r, mode) => {
      toast.success(
        mode === "auto"
          ? "Voltou ao modo automático pelo horário"
          : mode === "open"
            ? "Atendimento forçado ABERTO"
            : "Atendimento forçado FECHADO",
      );
      qc.invalidateQueries({ queryKey: ["my-tenant"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!canToggle) return null;

  const status = computeStoreOpen({
    openMode: (tenant as { open_mode?: "auto" | "open" | "closed" }).open_mode,
    hoursSchedule: (tenant as { hours_schedule?: unknown }).hours_schedule,
    legacyOpen: tenant.open,
  });
  const mode = status.mode;
  const open = status.open;

  // Próximo modo no ciclo: auto → open → closed → auto.
  const nextMode = mode === "auto" ? "open" : mode === "open" ? "closed" : "auto";
  const label = mode === "auto" ? (open ? "Aberta" : "Fechada") : mode === "open" ? "Aberta" : "Fechada";
  const sub = mode === "auto" ? "auto" : "manual";

  return (
    <Button
      size="sm"
      variant={open ? "default" : "outline"}
      onClick={() => mut.mutate(nextMode)}
      disabled={mut.isPending}
      className={
        open
          ? "bg-success text-success-foreground hover:bg-success/90"
          : "border-destructive text-destructive hover:bg-destructive/10"
      }
      title={`${status.reason}. Clique para alternar para "${
        nextMode === "auto" ? "Auto" : nextMode === "open" ? "Forçar aberta" : "Forçar fechada"
      }".`}
    >
      {mut.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Power className="h-4 w-4" />
      )}
      <span className="ml-1.5 hidden sm:inline">
        {label} <span className="opacity-70">· {sub}</span>
      </span>
    </Button>
  );
}

