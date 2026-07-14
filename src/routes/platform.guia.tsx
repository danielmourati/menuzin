import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PlatformLayout } from "./platform.dashboard";
import { AlertCircle } from "lucide-react";

export const Route = createFileRoute("/platform/guia")({
  component: PlatformGuiaLayout,
});

const tabs: { to: string; label: string; exact?: boolean }[] = [
  { to: "/platform/guia", label: "Visão geral", exact: true },
  { to: "/platform/guia/secoes", label: "Seções" },
  { to: "/platform/guia/slots", label: "Destaques & Banners" },
  { to: "/platform/guia/categorias", label: "Categorias" },
  { to: "/platform/guia/solicitacoes", label: "Solicitações" },
];

function PlatformGuiaLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <PlatformLayout title="Guia Menuzin">
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-amber-500/50 bg-amber-500/5 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">Modo demonstração</p>
            <p className="text-xs text-amber-800/80 dark:text-amber-200/70">
              Dados do Guia são mockados no navegador (localStorage). Alterações persistem só neste dispositivo enquanto migramos para o banco.
            </p>
          </div>
        </div>

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
