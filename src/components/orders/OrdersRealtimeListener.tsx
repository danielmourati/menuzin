import { useEffect, useRef } from "react";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import { showNewOrderToast } from "./NewOrderToast";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { useNavigate } from "@tanstack/react-router";

export function OrdersRealtimeListener() {
  const { newOrderAlert, dismissAlert, acceptOrder } = useOrdersRealtime();
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

    // Se preferência de toast estiver ativa, dispara o toast customizado
    if (prefs.toastEnabled) {
      showNewOrderToast(
        newOrderAlert,
        // Ao clicar em "Ver Pedido"
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
        // Ao clicar em "Aceitar"
        () => {
          acceptOrder(orderId);
        }
      );
    }

    dismissAlert();
  }, [newOrderAlert, prefs.toastEnabled, acceptOrder, dismissAlert, navigate]);

  return null; // componente puramente lógico
}
