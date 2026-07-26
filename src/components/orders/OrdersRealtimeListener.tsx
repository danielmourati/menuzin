import { useEffect, useRef } from "react";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import { showNewOrderToast } from "./NewOrderToast";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { useNavigate } from "@tanstack/react-router";
import { useAcceptOrderWithKitchenPrint } from "@/hooks/useAcceptOrderWithKitchenPrint";

export function OrdersRealtimeListener() {
  const { newOrderAlert, dismissAlert, orders, updateOrderStatus } = useOrdersRealtime();
  const { acceptOrder } = useAcceptOrderWithKitchenPrint(orders, updateOrderStatus);
  const { prefs } = useNotificationPrefs();
  const navigate = useNavigate();

  // Evitar duplicar toast de um mesmo pedido
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!newOrderAlert) return;

    const orderId = newOrderAlert.id;
    if (notifiedIdsRef.current.has(orderId)) {
      dismissAlert();
      return;
    }

    notifiedIdsRef.current.add(orderId);

    if (prefs.toastEnabled) {
      showNewOrderToast(
        newOrderAlert,
        () => {
          navigate({ to: "/admin/pedidos" });
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent("open-order-details", {
                detail: { orderId },
              })
            );
          }, 100);
        },
        // Ao clicar em "Aceitar" — dispara impressão automática quando configurada
        () => {
          acceptOrder(orderId);
        }
      );
    }

    dismissAlert();
  }, [newOrderAlert, prefs.toastEnabled, acceptOrder, dismissAlert, navigate]);

  return null;
}
