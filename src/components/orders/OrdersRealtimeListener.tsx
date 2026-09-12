import { useEffect, useRef } from "react";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import { showNewOrderToast } from "./NewOrderToast";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { useNavigate } from "@tanstack/react-router";
import {
  useAcceptOrderWithKitchenPrint,
  isOnlinePaymentOrder,
} from "@/hooks/useAcceptOrderWithKitchenPrint";

export function OrdersRealtimeListener() {
  const { newOrderAlert, dismissAlert, orders, updateOrderStatus } = useOrdersRealtime();
  const { acceptOrder, autoAcceptEnabled, autoAcceptOrder, printKitchenFor } =
    useAcceptOrderWithKitchenPrint(orders, updateOrderStatus);
  const { prefs } = useNotificationPrefs();
  const navigate = useNavigate();

  // Evitar duplicar toast/aceite de um mesmo pedido
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  // Evitar duplicar auto-aceite de pedidos online aprovados via webhook
  const autoAcceptedApprovedIdsRef = useRef<Set<string>>(new Set());
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

    const isOnline = isOnlinePaymentOrder(order);
    const isApproved = order.paymentStatus === "approved";

    // Impressão automática só dispara imediatamente para pagamentos offline
    // ou se o pagamento online já foi 100% confirmado (ex: webhook já aprovou)
    if (autoAcceptEnabled && (!isOnline || isApproved)) {
      autoAcceptedApprovedIdsRef.current.add(orderId);
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

  // Monitorar pedidos online em aberto que foram aprovados via Webhook MP em tempo real
  useEffect(() => {
    if (!autoAcceptEnabled || !orders || orders.length === 0) return;

    for (const order of orders) {
      if (
        order.status === "novo" &&
        isOnlinePaymentOrder(order) &&
        order.paymentStatus === "approved" &&
        !autoAcceptedApprovedIdsRef.current.has(order.id)
      ) {
        autoAcceptedApprovedIdsRef.current.add(order.id);
        queueRef.current = queueRef.current
          .then(() => autoAcceptOrder(order))
          .catch(() => undefined);
      }
    }
  }, [orders, autoAcceptEnabled, autoAcceptOrder]);

  return null;
}
