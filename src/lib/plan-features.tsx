import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMyTenant } from "@/lib/tenants.functions";
import { useAuth } from "@/lib/auth-context";
import { useActiveTenantId } from "@/lib/active-tenant";

export type TenantPlan = "start" | "pro";

export type PlanFeature =
  | "reports"
  | "whatsappOrders"
  | "dashboard"
  | "orderStatus"
  | "mercadoPago"
  | "multiplePrinters"
  | "kitchenPrinter"
  | "prioritySupport";

export const PLAN_FEATURES: Record<TenantPlan, Record<PlanFeature, boolean>> = {
  start: {
    reports: true,
    whatsappOrders: true,
    dashboard: true,
    orderStatus: true,
    mercadoPago: false,
    multiplePrinters: false,
    kitchenPrinter: false,
    prioritySupport: false,
  },
  pro: {
    reports: true,
    whatsappOrders: true,
    dashboard: true,
    orderStatus: true,
    mercadoPago: true,
    multiplePrinters: true,
    kitchenPrinter: true,
    prioritySupport: true,
  },
};

export function normalizePlan(raw: string | null | undefined): TenantPlan {
  return raw === "pro" ? "pro" : "start";
}

export function canUse(plan: TenantPlan | null | undefined, feature: PlanFeature): boolean {
  return PLAN_FEATURES[normalizePlan(plan)][feature];
}

export const PLAN_LABEL: Record<TenantPlan, string> = {
  start: "Start",
  pro: "Pro",
};

export function useTenantPlan() {
  const { profile, isAuthenticated } = useAuth();
  const activeTenantId = useActiveTenantId();
  const enabled = isAuthenticated && !!(profile?.tenant_id || activeTenantId);
  const { data, isLoading } = useQuery({
    queryKey: ["my-tenant", activeTenantId ?? profile?.tenant_id ?? "none"],
    queryFn: () => getMyTenant(),
    enabled,
    staleTime: 60_000,
  });
  const rawPlan = (data?.tenant as { plan?: string } | null | undefined)?.plan ?? null;
  const plan: TenantPlan = normalizePlan(rawPlan);
  return {
    plan,
    isPro: plan === "pro",
    can: (feature: PlanFeature) => canUse(plan, feature),
    loading: isLoading,
  };
}

interface UpgradeNoticeProps {
  title?: string;
  description?: string;
  className?: string;
}

export function UpgradeNotice({
  title = "Disponível no Plano Pro",
  description = "Este recurso está disponível no Plano Pro. Faça o upgrade para desbloquear.",
  className = "",
}: UpgradeNoticeProps) {
  return (
    <div
      className={`rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-6 ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="flex items-center gap-2 font-semibold">
            <Lock className="h-3.5 w-3.5 text-primary" />
            {title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <Button asChild size="sm" className="mt-4">
            <Link to="/">Conhecer o Plano Pro</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
