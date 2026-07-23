import { AdminLayout } from "@/components/admin/AdminLayout";
import { UpgradeNotice, useTenantPlan, planAtLeast, type TenantPlan } from "@/lib/plan-features";

interface PlanGateProps {
  min: TenantPlan;
  title: string;
  featureLabel: string;
  children: React.ReactNode;
}

export function PlanGate({ min, title, featureLabel, children }: PlanGateProps) {
  const { plan, loading } = useTenantPlan();
  if (loading) return <>{children}</>;
  if (planAtLeast(plan, min)) return <>{children}</>;
  return (
    <AdminLayout title={title}>
      <UpgradeNotice
        requiredPlan={min}
        title={`${featureLabel} — Plano ${min === "start" ? "Start" : "Pro"}`}
        description={`${featureLabel} está disponível a partir do Plano ${min === "start" ? "Start" : "Pro"}. Faça upgrade para desbloquear.`}
      />
    </AdminLayout>
  );
}
