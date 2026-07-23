import { Link } from "@tanstack/react-router";
import { ChevronRight, Settings as SettingsIcon } from "lucide-react";

interface SettingsBreadcrumbProps {
  /** Rótulo da etapa atual (sub-tela) */
  current: string;
}

/**
 * Indicador de etapa do fluxo de Configurações.
 * Exibido no topo de cada sub-rota (pagamentos, pedidos, impressora, promocao)
 * para que o usuário sempre saiba onde está.
 */
export function SettingsBreadcrumb({ current }: SettingsBreadcrumbProps) {
  return (
    <nav
      aria-label="Fluxo de configurações"
      className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground"
    >
      <Link
        to="/admin/configuracoes"
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium transition hover:bg-muted hover:text-foreground"
      >
        <SettingsIcon className="h-3.5 w-3.5" />
        Configurações
      </Link>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
      <span className="rounded-md bg-muted/60 px-2 py-1 font-semibold text-foreground">
        {current}
      </span>
    </nav>
  );
}
