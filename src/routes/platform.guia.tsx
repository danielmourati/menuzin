import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PlatformLayout } from "./platform.dashboard";

export const Route = createFileRoute("/platform/guia")({
  component: PlatformGuiaLayout,
});

const tabs: { to: string; label: string; exact?: boolean }[] = [
  { to: "/platform/guia", label: "Visão geral", exact: true },
  { to: "/platform/guia/secoes", label: "Seções" },
  { to: "/platform/guia/slots", label: "Destaques & Banners" },
  { to: "/platform/guia/categorias", label: "Categorias" },
  { to: "/platform/guia/solicitacoes", label: "Solicitações" },
  { to: "/platform/guia/planos", label: "Planos de Destaque" },
];

function PlatformGuiaLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <PlatformLayout title="Guia Menuzin">
      <div className="space-y-5">
        <nav className="flex flex-wrap gap-1 border-b">
          {tabs.map((t) => {
            const active = t.exact
              ? pathname === t.to
              : pathname === t.to || pathname.startsWith(t.to + "/");
            const cls = `-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (
              <Link key={t.to} to={t.to as any} className={cls}>
                {t.label}
              </Link>
            );
          })}
        </nav>

        <Outlet />
      </div>
    </PlatformLayout>
  );
}
