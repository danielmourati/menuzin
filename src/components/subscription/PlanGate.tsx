import { AdminLayout } from "@/components/admin/AdminLayout";
import { UpgradeNotice, useTenantPlan, planAtLeast, type TenantPlan } from "@/lib/plan-features";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

interface PlanGateProps {
  min: TenantPlan;
  title: string;
  featureLabel: string;
  children: React.ReactNode;
  /** Se fornecido, exibe botão "Voltar" no cabeçalho quando o gate bloqueia. */
  backTo?: string;
}

export function PlanGate({ min, title, featureLabel, children, backTo }: PlanGateProps) {
  const { plan, loading } = useTenantPlan();
  if (loading) return <>{children}</>;
  if (planAtLeast(plan, min)) return <>{children}</>;
  return (
    <AdminLayout
      title={title}
      action={
        backTo ? (
          <Button asChild variant="outline" size="sm">
            <Link to={backTo}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Link>
          </Button>
        ) : undefined
      }
    >
      <UpgradeNotice
        requiredPlan={min}
        title={`${featureLabel} — Plano ${min === "start" ? "Start" : "Pro"}`}
        description={`${featureLabel} está disponível a partir do Plano ${min === "start" ? "Start" : "Pro"}. Faça upgrade para desbloquear.`}
      />
    </AdminLayout>
  );
}
