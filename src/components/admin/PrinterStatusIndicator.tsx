import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { listMyTenantPrinters } from "@/lib/tenant-printers.functions";
import { useTenantPlan } from "@/lib/plan-features";
import { useAuth } from "@/lib/auth-context";

export function PrinterStatusIndicator() {
  const { isAuthenticated } = useAuth();
  const { can } = useTenantPlan();

  const { data } = useQuery({
    queryKey: ["tenant-printers-indicator"],
    queryFn: () => listMyTenantPrinters(),
    enabled: isAuthenticated && can("kitchenPrinter"),
    staleTime: 30_000,
    retry: false,
  });

  if (!can("kitchenPrinter")) return null;

  const printers = data?.printers ?? [];
  const kitchenPrinter = printers.find((p) => p.role === "kitchen" && p.is_active);

  if (!kitchenPrinter) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Link to="/admin/configuracoes/impressora">
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Sem Impressora</span>
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Nenhuma impressora de cozinha configurada. Clique para configurar.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-full px-3 text-xs font-medium border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
          >
            <Link to="/admin/configuracoes/impressora">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden md:inline truncate max-w-[120px]">{kitchenPrinter.name || kitchenPrinter.printer_name}</span>
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-xs">
          <p className="font-semibold">Impressora da Cozinha Conectada</p>
          <p className="text-muted-foreground">
            {kitchenPrinter.printer_name} ({kitchenPrinter.paper_width}mm)
          </p>
          <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            Pronta para impressão automática de novos pedidos.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
