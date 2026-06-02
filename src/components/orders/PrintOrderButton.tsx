import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Order } from "@/lib/domain-types";
import { useQuery } from "@tanstack/react-query";
import { getMyPrinterSettings } from "@/lib/printer-settings.functions";
import { getMyTenant } from "@/lib/tenants.functions";
import { useAuth } from "@/lib/auth-context";
import { DEFAULT_PRINTER_SETTINGS } from "@/lib/printer-types";
import { printOrderViaQz } from "@/lib/print-order";
import { QzNotRunningError } from "@/lib/qz-tray";

interface PrintOrderButtonProps {
  order: Order;
  storeName?: string;
  storePhone?: string;
  storeAddress?: string;
  /** Compat — ignorado. */
  paperWidth?: "55mm" | "80mm";
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
}

export function PrintOrderButton({
  order,
  storeName,
  storePhone,
  storeAddress,
  size = "default",
  variant = "outline",
  className = "",
}: PrintOrderButtonProps) {
  const { isAuthenticated } = useAuth();
  const [printing, setPrinting] = useState(false);

  const { data: settingsData } = useQuery({
    queryKey: ["printer-settings"],
    queryFn: () => getMyPrinterSettings(),
    enabled: isAuthenticated,
    staleTime: 60_000,
    retry: false,
  });
  const settings = settingsData?.settings ?? DEFAULT_PRINTER_SETTINGS;

  const { data: tenantData } = useQuery({
    queryKey: ["my-tenant"],
    queryFn: () => getMyTenant(),
    enabled: isAuthenticated,
    staleTime: 60_000,
    retry: false,
  });
  const tenant = tenantData?.tenant as
    | {
        name?: string;
        whatsapp?: string;
        address?: string;
        social?: { instagram?: string; pix?: string; cnpj?: string };
      }
    | null
    | undefined;

  const handlePrint = async () => {
    if (printing) return;
    setPrinting(true);
    try {
      const { printer } = await printOrderViaQz(order, settings, {
        storeName: storeName ?? tenant?.name,
        storePhone: storePhone ?? tenant?.whatsapp,
        storeAddress: storeAddress ?? tenant?.address,
        storeInstagram: tenant?.social?.instagram,
        storePixKey: tenant?.social?.pix,
        storeCnpj: tenant?.social?.cnpj,
      });
      toast.success(`Cupom enviado para ${printer}`);
    } catch (err) {
      if (err instanceof QzNotRunningError) {
        toast.error("QZ Tray não está aberto. Inicie o aplicativo e tente novamente.");
      } else {
        const msg = err instanceof Error ? err.message : "Falha ao imprimir.";
        toast.error(msg);
      }
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      title="Imprimir pedido"
      onClick={handlePrint}
      disabled={printing}
    >
      {printing ? (
        <Loader2 className={size === "icon" ? "h-3.5 w-3.5 animate-spin" : "mr-2 h-4 w-4 animate-spin"} />
      ) : (
        <Printer className={size === "icon" ? "h-3.5 w-3.5" : "mr-2 h-4 w-4"} />
      )}
      {size !== "icon" && (printing ? "Imprimindo..." : "Imprimir")}
    </Button>
  );
}
