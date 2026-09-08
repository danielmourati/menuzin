import { useEffect, useRef } from "react";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import { showNewOrderToast } from "./NewOrderToast";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { useNavigate } from "@tanstack/react-router";
import { useAcceptOrderWithKitchenPrint } from "@/hooks/useAcceptOrderWithKitchenPrint";

export function OrdersRealtimeListener() {
  const { newOrderAlert, dismissAlert, orders, updateOrderStatus } = useOrdersRealtime();
  const { acceptOrder, autoAcceptEnabled, autoAcceptOrder, printKitchenFor } =
    useAcceptOrderWithKitchenPrint(orders, updateOrderStatus);
  const { prefs } = useNotificationPrefs();
  const navigate = useNavigate();

  // Evitar duplicar toast/aceite de um mesmo pedido
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  // Fila sequencial para não disparar impressões simultâneas
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!newOrderAlert) return;

    const order = newOrderAlert;
    const orderId = order.id;

    // Se o pedido não estiver com status "novo" (já foi aceito/em produção) ou já tiver sido notificado:
    if (order.status !== "novo" || notifiedIdsRef.current.has(orderId)) {
      dismissAlert();
      return;
    }

    notifiedIdsRef.current.add(orderId);

    const openDetails = () => {
      navigate({ to: "/admin/pedidos" });
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("open-order-details", { detail: { orderId } })
        );
      }, 100);
    };

    if (autoAcceptEnabled) {
      // Aceita e imprime automaticamente, em série
      queueRef.current = queueRef.current
        .then(() => autoAcceptOrder(order))
        .catch(() => undefined);

      if (prefs.toastEnabled) {
        showNewOrderToast(order, openDetails, () => {}, {
          autoAccepted: true,
          onReprint: () => {
            void printKitchenFor(order);
          },
        });
      }
    } else if (prefs.toastEnabled) {
      showNewOrderToast(order, openDetails, () => {
        acceptOrder(orderId);
      });
    }

    dismissAlert();
  }, [
    newOrderAlert,
    prefs.toastEnabled,
    acceptOrder,
    autoAcceptEnabled,
    autoAcceptOrder,
    printKitchenFor,
    dismissAlert,
    navigate,
  ]);

  return null;
}
