// Badge visual para status de assinatura
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, type SubscriptionStatus } from "@/lib/subscription-status";

const TONE: Record<SubscriptionStatus, string> = {
  ativa: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  pendente: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  vencida: "bg-destructive/15 text-destructive border-destructive/30",
  tolerancia: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  bloqueada: "bg-destructive/20 text-destructive border-destructive/40",
  cancelada: "bg-muted text-muted-foreground border-border",
  teste: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
  cortesia: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30",
};

export function SubscriptionStatusBadge({
  status,
  label,
}: {
  status: SubscriptionStatus;
  label?: string;
}) {
  return (
    <Badge variant="outline" className={`${TONE[status]} font-medium`}>
      {label ?? STATUS_LABEL[status]}
    </Badge>
  );
}
