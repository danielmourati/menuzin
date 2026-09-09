import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Sparkles, Package, MapPin, Printer, ShoppingBag, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type OnboardingProps = {
  hasCategories: boolean;
  hasProducts: boolean;
  hasPrinter: boolean;
  hasOrders: boolean;
};

const DISMISS_KEY = "menuzin_onboarding_dismissed";

export function OnboardingChecklist({
  hasCategories,
  hasProducts,
  hasPrinter,
  hasOrders,
}: OnboardingProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "true");
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISS_KEY, "true");
    }
  };

  const steps = [
    {
      id: "catalog",
      label: "Cadastrar produtos e categorias no cardápio",
      done: hasCategories && hasProducts,
      href: "/admin/produtos",
      icon: Package,
    },
    {
      id: "delivery",
      label: "Configurar taxas de entrega e modalidades",
      done: true, // Já vem pré-configurado por padrão no Menuzin
      href: "/admin/taxas-entrega",
      icon: MapPin,
    },
    {
      id: "printer",
      label: "Configurar impressora da cozinha (opcional)",
      done: hasPrinter,
      href: "/admin/configuracoes/impressora",
      icon: Printer,
    },
    {
      id: "order",
      label: "Receber ou simular o primeiro pedido",
      done: hasOrders,
      href: "/admin/pedidos",
      icon: ShoppingBag,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // Se o lojista dispensou ou se já concluiu todos os passos principais
  if (dismissed || (hasCategories && hasProducts && hasOrders)) {
    return null;
  }

  return (
    <Card className="border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card shadow-sm transition-all">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              Primeiros passos para sua loja
              <span className="text-xs font-normal text-muted-foreground">
                ({completedCount} de {steps.length} concluídos)
              </span>
            </CardTitle>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "Expandir checklist" : "Recolher checklist"}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            Dispensar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        <div className="flex items-center gap-3">
          <Progress value={progressPercent} className="h-2 flex-1" />
          <span className="text-xs font-semibold text-primary">{progressPercent}%</span>
        </div>

        {!collapsed && (
          <div className="grid gap-2 pt-1 sm:grid-cols-2">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`flex items-center justify-between rounded-xl border p-3 transition ${
                    step.done
                      ? "border-emerald-500/20 bg-emerald-500/5 text-muted-foreground"
                      : "bg-card hover:border-primary/40 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    {step.done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                    )}
                    <span className={`text-xs font-medium truncate ${step.done ? "line-through" : "text-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                  {!step.done && (
                    <Button asChild size="sm" variant="outline" className="h-7 text-[11px] font-semibold shrink-0">
                      <Link to={step.href}>Configurar</Link>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
