import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { getCashShiftStatus } from "@/lib/cash.functions";
import { useAuth } from "@/lib/auth-context";

export function CashShiftBadge() {
  const { user } = useAuth() as { user: unknown };
  const { data } = useQuery({
    queryKey: ["cash-shift-status"],
    queryFn: () => getCashShiftStatus(),
    enabled: !!user,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  if (!data?.enabled) return null;
  const time = data.opened_at
    ? new Date(data.opened_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
    : "";
  return data.open ? (
    <Link
      to="/admin/caixa" search={{ tab: undefined }}
      title={`Turno aberto desde ${time}`}
      className="hidden sm:inline-flex h-8 items-center gap-1.5 rounded-lg border border-success/40 bg-success/10 px-2.5 text-xs font-semibold text-success hover:bg-success/20"
    >
      <span className="h-2 w-2 rounded-full bg-success" />
      <Wallet className="h-3.5 w-3.5" /> Turno aberto <span className="font-normal opacity-80">· {time}</span>
    </Link>
  ) : (
    <Link
      to="/admin/caixa" search={{ tab: undefined }}
      title="Nenhum turno aberto — clique para abrir"
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-warning/50 bg-warning/10 px-2.5 text-xs font-semibold text-warning-foreground hover:bg-warning/20"
    >
      <span className="h-2 w-2 rounded-full bg-warning" />
      <Wallet className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Turno fechado ·</span> <u>Abrir turno</u>
    </Link>
  );
}
