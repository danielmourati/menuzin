import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChefHat, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { Order } from "@/lib/domain-types";
import { listMyTenantPrinters } from "@/lib/tenant-printers.functions";
import { printKitchenTicket } from "@/lib/print-kitchen";
import { QzNotRunningError } from "@/lib/qz-tray";
import { useAuth } from "@/lib/auth-context";
import { useTenantPlan } from "@/lib/plan-features";

interface PrintKitchenButtonProps {
  order: Order;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
  label?: string;
}

export function PrintKitchenButton({
  order,
  size = "default",
  variant = "outline",
  className = "",
  label,
}: PrintKitchenButtonProps) {
  const { isAuthenticated } = useAuth();
  const { can } = useTenantPlan();
  const navigate = useNavigate();
  const [printing, setPrinting] = useState(false);

  const { data } = useQuery({
    queryKey: ["tenant-printers"],
    queryFn: () => listMyTenantPrinters(),
    enabled: isAuthenticated && can("kitchenPrinter"),
    staleTime: 60_000,
    retry: false,
  });

  if (!can("kitchenPrinter")) return null;

  const kitchenPrinter = (data?.printers ?? []).find(
    (p) => p.role === "kitchen" && p.is_active,
  );

  const handlePrint = async () => {
    if (printing) return;
    if (!kitchenPrinter) {
      toast.error("Nenhuma impressora de cozinha configurada.", {
        action: {
          label: "Configurar",
          onClick: () => navigate({ to: "/admin/configuracoes/impressora" }),
        },
      });
      return;
    }
    setPrinting(true);
    try {
      const { printer } = await printKitchenTicket(order, kitchenPrinter);
      toast.success(`Comanda enviada para ${printer}`);
    } catch (err) {
      if (err instanceof QzNotRunningError) {
        toast.error("QZ Tray não está aberto.");
      } else {
        toast.error(err instanceof Error ? err.message : "Falha ao imprimir comanda");
      }
    } finally {
      setPrinting(false);
    }
  };

  const isNew = order.status === "novo";
  const defaultLabel = isNew ? "Imprimir cozinha" : "Reimprimir cozinha";
  const finalLabel = label ?? defaultLabel;

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handlePrint}
      disabled={printing}
      title={finalLabel}
    >
      {printing ? (
        <Loader2 className={size === "icon" ? "h-3.5 w-3.5 animate-spin" : "mr-2 h-4 w-4 animate-spin"} />
      ) : (
        <ChefHat className={size === "icon" ? "h-3.5 w-3.5" : "mr-2 h-4 w-4"} />
      )}
      {size !== "icon" && (printing ? "Imprimindo..." : finalLabel)}
    </Button>
  );
}
