import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMyTenant } from "@/lib/tenants.functions";
import { useAuth } from "@/lib/auth-context";
import { useActiveTenantId } from "@/lib/active-tenant";

export type TenantPlan = "presenca" | "start" | "pro";

export type PlanFeature =
  | "ordersPanel"
  | "onlinePayment"
  | "autoPrint"
  | "kitchenPrinter"
  | "pizzaFractional"
  | "advancedAddons"
  | "combos"
  | "distanceDeliveryFee"
  | "advancedCoupons"
  | "basicCoupons"
  | "upsell"
  | "customerCrm"
  | "customerRecovery"
  | "fullReports"
  | "basicReports"
  | "orderStatus"
  | "manualPrint"
  | "directoryFeatured"
  | "hideMenuzinBrand"
  | "multipleUsers"
  | "dashboard"
  | "whatsappOrders"
  // legado
  | "reports"
  | "mercadoPago"
  | "multiplePrinters"
  | "prioritySupport";

export interface PlanLimits {
  maxProducts: number | null; // null = ilimitado
  maxCategories: number | null;
  maxOrdersPerMonth: number | null; // 0 = não permite pedidos; null = ilimitado
  maxUsers: number | null;
}

const PRESENCA: Record<PlanFeature, boolean> = {
  ordersPanel: false,
  onlinePayment: false,
  autoPrint: false,
  kitchenPrinter: false,
  pizzaFractional: false,
  advancedAddons: false,
  combos: false,
  distanceDeliveryFee: false,
  advancedCoupons: false,
  basicCoupons: false,
  upsell: false,
  customerCrm: false,
  customerRecovery: false,
  fullReports: false,
  basicReports: false,
  orderStatus: false,
  manualPrint: false,
  directoryFeatured: false,
  hideMenuzinBrand: false,
  multipleUsers: false,
  dashboard: false,
  whatsappOrders: true, // Presença mantém botão de WhatsApp
  reports: false,
  mercadoPago: false,
  multiplePrinters: false,
  prioritySupport: false,
};

const START: Record<PlanFeature, boolean> = {
  ordersPanel: true,
  onlinePayment: false,
  autoPrint: false,
  kitchenPrinter: false,
  pizzaFractional: false,
  advancedAddons: false,
  combos: false,
  distanceDeliveryFee: false,
  advancedCoupons: false,
  basicCoupons: true,
  upsell: false,
  customerCrm: true,
  customerRecovery: false,
  fullReports: false,
  basicReports: true,
  orderStatus: true,
  manualPrint: true,
  directoryFeatured: false,
  hideMenuzinBrand: false,
  multipleUsers: true,
  dashboard: true,
  whatsappOrders: true,
  reports: true,
  mercadoPago: false,
  multiplePrinters: false,
  prioritySupport: false,
};

const PRO: Record<PlanFeature, boolean> = {
  ordersPanel: true,
  onlinePayment: true,
  autoPrint: true,
  kitchenPrinter: true,
  pizzaFractional: true,
  advancedAddons: true,
  combos: true,
  distanceDeliveryFee: true,
  advancedCoupons: true,
  basicCoupons: true,
  upsell: true,
  customerCrm: true,
  customerRecovery: true,
  fullReports: true,
  basicReports: true,
  orderStatus: true,
  manualPrint: true,
  directoryFeatured: true,
  hideMenuzinBrand: true,
  multipleUsers: true,
  dashboard: true,
  whatsappOrders: true,
  reports: true,
  mercadoPago: true,
  multiplePrinters: true,
  prioritySupport: true,
};

export const PLAN_FEATURES: Record<TenantPlan, Record<PlanFeature, boolean>> = {
  presenca: PRESENCA,
  start: START,
  pro: PRO,
};

export const PLAN_LIMITS: Record<TenantPlan, PlanLimits> = {
  presenca: { maxProducts: 20, maxCategories: 4, maxOrdersPerMonth: 0, maxUsers: 1 },
  start: { maxProducts: null, maxCategories: null, maxOrdersPerMonth: 400, maxUsers: 2 },
  pro: { maxProducts: null, maxCategories: null, maxOrdersPerMonth: null, maxUsers: null },
};

export function normalizePlan(raw: string | null | undefined): TenantPlan {
  if (raw === "pro") return "pro";
  if (raw === "start") return "start";
  return "presenca";
}

export function canUse(plan: TenantPlan | null | undefined, feature: PlanFeature): boolean {
  return PLAN_FEATURES[normalizePlan(plan)][feature];
}

export function getPlanLimits(plan: TenantPlan | null | undefined): PlanLimits {
  return PLAN_LIMITS[normalizePlan(plan)];
}

export const PLAN_LABEL: Record<TenantPlan, string> = {
  presenca: "Presença",
  start: "Start",
  pro: "Pro",
};

const PLAN_RANK: Record<TenantPlan, number> = { presenca: 0, start: 1, pro: 2 };

export function planAtLeast(plan: TenantPlan | null | undefined, min: TenantPlan): boolean {
  return PLAN_RANK[normalizePlan(plan)] >= PLAN_RANK[min];
}

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
    isStart: plan === "start",
    isPresenca: plan === "presenca",
    can: (feature: PlanFeature) => canUse(plan, feature),
    atLeast: (min: TenantPlan) => planAtLeast(plan, min),
    limits: getPlanLimits(plan),
    loading: isLoading,
  };
}

interface UpgradeNoticeProps {
  title?: string;
  description?: string;
  requiredPlan?: TenantPlan;
  className?: string;
}

export function UpgradeNotice({
  title,
  description,
  requiredPlan = "pro",
  className = "",
}: UpgradeNoticeProps) {
  const label = PLAN_LABEL[requiredPlan];
  const finalTitle = title ?? `Disponível no Plano ${label}`;
  const finalDescription =
    description ??
    `Este recurso está disponível no Plano ${label}. Faça o upgrade para desbloquear.`;
  return (
    <div
      className={`rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-6 ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Crown className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="flex items-center gap-2 font-semibold">
            <Lock className="h-3.5 w-3.5 text-primary" />
            {finalTitle}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{finalDescription}</p>
          <Button asChild size="sm" className="mt-4">
            <Link to="/admin/assinatura">Ver planos</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
