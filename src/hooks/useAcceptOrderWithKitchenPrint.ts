// Helper para "Aceitar pedido": muda o status para "preparo" (fluxo
// simplificado) e dispara a impressão da comanda de cozinha quando há
// impressora configurada. Falhas de impressão não bloqueiam a aceitação.

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { Order, OrderStatus } from "@/lib/domain-types";
import { listMyTenantPrinters } from "@/lib/tenant-printers.functions";
import { getMyPrinterSettings } from "@/lib/printer-settings.functions";
import { printKitchenTicket } from "@/lib/print-kitchen";
import { QzNotRunningError } from "@/lib/qz-tray";
import { useAuth } from "@/lib/auth-context";
import { useTenantPlan } from "@/lib/plan-features";

type UpdateStatusFn = (orderId: string, status: OrderStatus, note?: string) => Promise<unknown>;

/**
 * Devolve handlers de "aceitar" e "atualizar status" que disparam a
 * impressão automática da comanda de cozinha sempre que o pedido entra em
 * "preparo" (fluxo simplificado: clicar em Aceitar já manda para preparo).
 */
export function useAcceptOrderWithKitchenPrint(
  orders: Order[],
  updateOrderStatus: UpdateStatusFn,
) {
  const { isAuthenticated } = useAuth();
  const { can } = useTenantPlan();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["tenant-printers"],
    queryFn: () => listMyTenantPrinters(),
    enabled: isAuthenticated && can("kitchenPrinter"),
    staleTime: 60_000,
    retry: false,
  });

  const kitchenPrinter = (data?.printers ?? []).find(
    (p) => p.role === "kitchen" && p.is_active,
  );

  const { data: printerSettings } = useQuery({
    queryKey: ["printer-settings-auto-accept"],
    queryFn: () => getMyPrinterSettings(),
    enabled: isAuthenticated && can("kitchenPrinter"),
    staleTime: 60_000,
    retry: false,
  });

  const autoAcceptEnabled =
    can("kitchenPrinter") && printerSettings?.settings?.auto_accept_orders === true;

  const printKitchenFor = useCallback(
    async (order: Order) => {
      if (!can("kitchenPrinter")) return;
      if (!kitchenPrinter) {
        toast.info("Pedido aceito. Configure a impressora da cozinha para impressão automática.", {
          action: {
            label: "Configurar",
            onClick: () => navigate({ to: "/admin/configuracoes/impressora" }),
          },
        });
        return;
      }
      try {
        const { printer } = await printKitchenTicket(order, kitchenPrinter);
        toast.success(`Comanda enviada para ${printer}`);
      } catch (err) {
        const retry = {
          label: "Reimprimir",
          onClick: () => {
            void printKitchenFor(order);
          },
        };
        if (err instanceof QzNotRunningError) {
          toast.error("Pedido aceito, mas o QZ Tray não está aberto para imprimir.", { action: retry });
        } else {
          toast.error(err instanceof Error ? err.message : "Falha ao imprimir comanda", { action: retry });
        }
      }
    },
    [can, kitchenPrinter, navigate],
  );

export function isOnlinePaymentOrder(order: { payment?: string | null }): boolean {
  if (!order?.payment) return false;
  const label = order.payment.toLowerCase();
  return (
    label.includes("online") ||
    label.includes("mercado pago") ||
    label.includes("mercadopago") ||
    label.includes("pix_online") ||
    label.includes("credit_card") ||
    label.includes("debit_card")
  );
}

  /**
   * Aceite automático: aprova o pedido assim que ele chega (ou quando o pagamento online
   * é confirmado pelo webhook) e manda a comanda para a cozinha.
   */
  const autoAcceptOrder = useCallback(
    async (order: Order) => {
      if (order.status !== "novo") return;
      // Para pagamentos online, a impressão e aceite automático aguardam confirmação do webhook MP
      if (isOnlinePaymentOrder(order) && order.paymentStatus !== "approved") {
        return;
      }
      try {
        await updateOrderStatus(order.id, "preparo", "Aceito automaticamente");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao aceitar pedido automaticamente");
        return;
      }
      await printKitchenFor(order);
    },
    [updateOrderStatus, printKitchenFor],
  );

  const acceptOrder = useCallback(
    async (orderOrId: string | Order) => {
      const order = typeof orderOrId === "string" ? orders.find((o) => o.id === orderOrId) : orderOrId;
      const orderId = typeof orderOrId === "string" ? orderOrId : orderOrId.id;
      await updateOrderStatus(orderId, "preparo", "Pedido aceito — iniciou preparo");
      if (order) await printKitchenFor(order);
    },
    [orders, updateOrderStatus, printKitchenFor],
  );

  const updateOrderStatusWithPrint = useCallback(
    async (orderId: string, newStatus: OrderStatus) => {
      const order = orders.find((o) => o.id === orderId);
      const wasNew = order?.status === "novo";
      await updateOrderStatus(orderId, newStatus);
      // Se aceitou (novo -> preparo), imprime a comanda
      if (order && wasNew && newStatus === "preparo") {
        await printKitchenFor(order);
      }
    },
    [orders, updateOrderStatus, printKitchenFor],
  );

  return {
    acceptOrder,
    updateOrderStatus: updateOrderStatusWithPrint,
    autoAcceptEnabled,
    autoAcceptOrder,
    printKitchenFor,
  };
}
