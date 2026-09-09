import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Printer, CheckCircle2, ChevronRight, AlertCircle } from "lucide-react";
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

  const formatPaperWidth = (w: string) => (w.endsWith("mm") ? w : `${w}mm`);

  if (!kitchenPrinter) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-full px-3 text-xs font-medium border-border bg-card/80 text-muted-foreground hover:bg-card hover:text-foreground transition-all shadow-none"
            >
              <Link to="/admin/configuracoes/impressora">
                <Printer className="h-3.5 w-3.5 opacity-70" />
                <span className="hidden md:inline">Sem Impressora</span>
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            align="end"
            className="w-72 rounded-2xl border border-border bg-popover p-3.5 text-popover-foreground shadow-xl z-50"
          >
            <div className="flex items-start gap-2.5">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold leading-tight">Impressora não configurada</p>
                <p className="text-[11px] leading-normal text-muted-foreground">
                  Conecte uma impressora de cozinha para imprimir comandas automaticamente.
                </p>
                <Link
                  to="/admin/configuracoes/impressora"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline pt-1"
                >
                  Configurar agora <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const paperLabel = formatPaperWidth(kitchenPrinter.paper_width);

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 gap-2 rounded-full px-3 text-xs font-semibold border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20 transition-all shadow-none"
          >
            <Link to="/admin/configuracoes/impressora">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <Printer className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden md:inline truncate max-w-[110px]">
                {kitchenPrinter.name || kitchenPrinter.printer_name}
              </span>
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="end"
          className="w-72 rounded-2xl border border-border bg-popover p-3.5 text-popover-foreground shadow-xl z-50"
        >
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold leading-tight text-foreground">
                  Impressora da Cozinha Conectada
                </p>
                <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                  {kitchenPrinter.printer_name || kitchenPrinter.name}
                  <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-semibold text-foreground">
                    {paperLabel}
                  </span>
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              ⚡ Pronta para impressão automática de novos pedidos.
            </div>

            <div className="pt-2 border-t border-border/60 flex justify-end">
              <Link
                to="/admin/configuracoes/impressora"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                Gerenciar impressoras <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
