import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Printer, CheckCircle2, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { listMyTenantPrinters } from "@/lib/tenant-printers.functions";
import { useTenantPlan } from "@/lib/plan-features";
import { useAuth } from "@/lib/auth-context";
import { checkQzPrinterReady } from "@/lib/qz-tray";
import { getDeviceSettings } from "@/lib/device-printer";
import { webBluetoothPrinter } from "@/lib/bluetooth-printer";

export function PrinterStatusIndicator() {
  const { isAuthenticated } = useAuth();
  const { can } = useTenantPlan();
  const [devSettings, setDevSettings] = useState(() => getDeviceSettings());

  useEffect(() => {
    const syncDeviceSettings = () => setDevSettings(getDeviceSettings());
    window.addEventListener("focus", syncDeviceSettings);
    window.addEventListener("storage", syncDeviceSettings);
    return () => {
      window.removeEventListener("focus", syncDeviceSettings);
      window.removeEventListener("storage", syncDeviceSettings);
    };
  }, []);

  const { data } = useQuery({
    queryKey: ["tenant-printers-indicator"],
    queryFn: () => listMyTenantPrinters(),
    enabled: isAuthenticated && can("kitchenPrinter"),
    staleTime: 30_000,
    retry: false,
  });

  const printers = data?.printers ?? [];
  const kitchenPrinter = printers.find((p) => p.role === "kitchen" && p.is_active);
  const configuredPrinterName = kitchenPrinter?.printer_name?.trim() ?? "";
  const useBluetooth = devSettings.useBluetooth;
  const hasConfiguredPrinter = useBluetooth
    ? Boolean(kitchenPrinter || webBluetoothPrinter.getDeviceName())
    : Boolean(kitchenPrinter && configuredPrinterName);

  const { data: liveStatus, isLoading: checkingLive } = useQuery({
    queryKey: ["qz-printer-live-status", configuredPrinterName, useBluetooth],
    queryFn: async () => {
      if (useBluetooth) {
        const connected = webBluetoothPrinter.isConnected();
        return connected
          ? { ok: true as const }
          : {
              ok: false as const,
              reason: "Impressora Bluetooth desconectada neste aparelho.",
              code: "BT_OFFLINE",
            };
      }
      if (!configuredPrinterName) {
        return {
          ok: false as const,
          reason: "Nenhuma impressora configurada.",
          code: "UNCONFIGURED",
        };
      }
      return checkQzPrinterReady(configuredPrinterName);
    },
    enabled: isAuthenticated && can("kitchenPrinter") && hasConfiguredPrinter,
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  if (!can("kitchenPrinter")) return null;

  const formatPaperWidth = (w: string) => (w.endsWith("mm") ? w : `${w}mm`);

  // 1) Nenhuma impressora configurada (ou local criado sem impressora vinculada)
  if (!hasConfiguredPrinter || !kitchenPrinter) {
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
                  Conecte uma impressora de cozinha e inicie o QZ Tray para imprimir comandas automaticamente.
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
  const displayPrinterName = useBluetooth
    ? webBluetoothPrinter.getDeviceName() || configuredPrinterName || kitchenPrinter.name
    : configuredPrinterName;
  const isConnected = liveStatus?.ok === true;

  // 2) Impressora configurada no banco, mas QZ Tray desligado / impressora offline / verificando
  if (!isConnected) {
    const reasonText = checkingLive
      ? "Verificando comunicação com o QZ Tray e a impressora..."
      : liveStatus?.reason || "O QZ Tray está desligado ou a impressora não está conectada neste computador.";

    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 gap-2 rounded-full px-3 text-xs font-semibold border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 transition-all shadow-none"
            >
              <Link to="/admin/configuracoes/impressora">
                {checkingLive ? (
                  <Loader2 className="h-3 w-3 animate-spin text-amber-600 dark:text-amber-400" />
                ) : (
                  <span className="inline-flex rounded-full h-2 w-2 bg-amber-500" />
                )}
                <Printer className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden md:inline truncate max-w-[130px]">
                  {checkingLive
                    ? "Verificando..."
                    : `${kitchenPrinter.name || "Cozinha"} (Offline)`}
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
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-tight text-foreground">
                    {checkingLive
                      ? "Verificando Impressora..."
                      : "Impressora da Cozinha Desconectada"}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                    {displayPrinterName}
                    <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-semibold text-foreground">
                      {paperLabel}
                    </span>
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-2 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                {reasonText}
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

  // 3) Tudo configurado E comprovadamente conectado via QZ Tray (ou Bluetooth)
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
                {kitchenPrinter.name || displayPrinterName}
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
                  {displayPrinterName}
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
