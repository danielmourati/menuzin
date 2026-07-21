import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMyPlanUsage } from "@/lib/plan-usage.functions";
import { PLAN_LABEL } from "@/lib/plan-features";

function Bar({ used, limit }: { used: number; limit: number | null }) {
  if (limit == null) return null;
  if (limit === 0) return null;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const tone =
    pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-warning" : "bg-primary";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Row({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}) {
  const suffix =
    limit == null ? "ilimitado" : limit === 0 ? "não incluso" : `de ${limit}`;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">
          {used} <span className="text-xs font-normal text-muted-foreground">{suffix}</span>
        </span>
      </div>
      <Bar used={used} limit={limit} />
    </div>
  );
}

interface Props {
  variant?: "full" | "compact";
}

export function PlanUsageCard({ variant = "full" }: Props) {
  const { data } = useQuery({
    queryKey: ["plan-usage"],
    queryFn: () => getMyPlanUsage(),
    staleTime: 60_000,
  });
  if (!data) return null;

  const {
    plan,
    monthly_orders_used,
    monthly_orders_limit,
    products_used,
    products_limit,
    categories_used,
    categories_limit,
  } = data;

  const ordersOver =
    monthly_orders_limit != null &&
    monthly_orders_limit > 0 &&
    monthly_orders_used >= monthly_orders_limit;
  const ordersNear =
    monthly_orders_limit != null &&
    monthly_orders_limit > 0 &&
    monthly_orders_used / monthly_orders_limit >= 0.8 &&
    !ordersOver;

  const showUpgrade = plan !== "pro";
  const nextPlan = plan === "presenca" ? "start" : "pro";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Uso do plano {PLAN_LABEL[plan]}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Contadores reiniciam no dia 1 de cada mês.
          </p>
        </div>
        {showUpgrade && (
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/assinatura">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Upgrade {PLAN_LABEL[nextPlan]}
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <Row
          label="Pedidos no mês"
          used={monthly_orders_used}
          limit={monthly_orders_limit}
        />
        {variant === "full" && (
          <>
            <Row label="Produtos" used={products_used} limit={products_limit} />
            <Row
              label="Categorias"
              used={categories_used}
              limit={categories_limit}
            />
          </>
        )}
        {ordersOver && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Limite mensal atingido. Novos pedidos serão bloqueados até o próximo mês
              ou até o upgrade do plano.
            </span>
          </div>
        )}
        {ordersNear && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Você já usou 80% do limite mensal de pedidos.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
