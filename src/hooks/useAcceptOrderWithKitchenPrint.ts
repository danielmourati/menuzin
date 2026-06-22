// Helper para "Aceitar pedido": muda o status para "preparo" (fluxo
// simplificado) e dispara a impressão da comanda de cozinha quando há
// impressora configurada. Falhas de impressão não bloqueiam a aceitação.

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { Order, OrderStatus } from "@/lib/domain-types";
import { listMyTenantPrinters } from "@/lib/tenant-printers.functions";
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
        if (err instanceof QzNotRunningError) {
          toast.error("Pedido aceito, mas QZ Tray não está aberto para imprimir.");
        } else {
          toast.error(err instanceof Error ? err.message : "Falha ao imprimir comanda");
        }
      }
    },
    [can, kitchenPrinter, navigate],
  );

  const acceptOrder = useCallback(
    async (orderId: string) => {
      const order = orders.find((o) => o.id === orderId);
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

  return { acceptOrder, updateOrderStatus: updateOrderStatusWithPrint };
}
