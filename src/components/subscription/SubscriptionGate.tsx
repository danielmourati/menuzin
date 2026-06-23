// Banner persistente + tela de bloqueio para assinatura
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Lock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMySubscription } from "@/lib/subscriptions.functions";
import { computeSubscriptionStatus, STATUS_LABEL } from "@/lib/subscription-status";
import { SubscriptionStatusBadge } from "./SubscriptionStatusBadge";

export function useEffectiveSubscription() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: () => getMySubscription(),
    staleTime: 60_000,
  });
  const sub = data?.subscription ?? null;
  const computed = computeSubscriptionStatus(sub as never);
  return { sub, computed, payments: data?.payments ?? [], loading: isLoading };
}

export function SubscriptionAlertBanner() {
  const { sub, computed, loading } = useEffectiveSubscription();
  if (loading || !sub) return null;
  if (!computed.expiringSoon && computed.effective !== "tolerancia" && computed.effective !== "vencida") return null;

  const days = computed.daysRemaining ?? 0;
  const msg =
    computed.effective === "vencida"
      ? "Sua assinatura está vencida. Regularize o pagamento para continuar usando o Menuzin."
      : computed.effective === "tolerancia"
        ? `Sua assinatura está em período de tolerância (${Math.abs(days)} dia(s) após vencimento).`
        : days <= 0
          ? "Sua assinatura vence hoje."
          : `Sua assinatura vence em ${days} dia(s).`;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm lg:px-8">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
        <span className="truncate">{msg}</span>
      </div>
      <Button asChild size="sm" variant="default">
        <Link to="/admin/assinatura">
          <CreditCard className="mr-1 h-4 w-4" /> Pagar agora
        </Link>
      </Button>
    </div>
  );
}

export function SubscriptionBlockedScreen() {
  const { sub, computed } = useEffectiveSubscription();
  const navigate = useNavigate();
  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/15 text-destructive">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold">Assinatura bloqueada</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Para continuar usando o Menuzin, regularize sua mensalidade.
          </p>
          {sub && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <SubscriptionStatusBadge status={computed.effective} />
              <span className="text-sm text-muted-foreground">
                {STATUS_LABEL[computed.effective]}
              </span>
            </div>
          )}
          <Button className="mt-6 h-11 w-full" onClick={() => navigate({ to: "/admin/assinatura" })}>
            <CreditCard className="mr-2 h-4 w-4" /> Pagar assinatura
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
