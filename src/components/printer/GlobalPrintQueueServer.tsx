import { useEffect } from "react";
import { getDeviceSettings, getEffectivePrinterName } from "@/lib/device-printer";
import { usePrintQueue } from "@/hooks/usePrintQueue";
import { useQuery } from "@tanstack/react-query";
import { getMyPrinterSettings } from "@/lib/printer-settings.functions";
import { useAuth } from "@/lib/auth-context";

export function GlobalPrintQueueServer() {
  const { isAuthenticated } = useAuth();
  
  // Need to safely call getDeviceSettings on mount to avoid hydration mismatch if SSR (though this is an SPA, it's safer)
  // Wait, getDeviceSettings is synchronous and safe in SPA.
  const devSettings = getDeviceSettings();
  
  const { data: settingsData } = useQuery({
    queryKey: ["printer-settings"],
    queryFn: () => getMyPrinterSettings(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const settings = settingsData?.settings;
  const targetPrinter = settings ? getEffectivePrinterName(settings.printer_name, settings.tenant_id) : "";

  usePrintQueue(devSettings.printForOthers, targetPrinter, devSettings.useBluetooth);

  return null;
}
