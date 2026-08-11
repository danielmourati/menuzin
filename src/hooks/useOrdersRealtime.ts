import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  type Order,
  type OrderStatus,
  type AdminNotification,
} from "@/lib/domain-types";

import { listOrdersForMyTenant, updateOrderStatus as updateOrderStatusFn, createOrder } from "@/lib/orders.functions";
import { dbOrderToUi } from "@/lib/order-adapters";
import { useNotificationPrefs } from "./useNotificationPrefs";
import {
  playNotificationSound,
  unlockAudioOnFirstGesture,
} from "@/lib/order-alert-sound";

export { playNotificationSound } from "@/lib/order-alert-sound";

const SEEN_ORDERS_STORAGE_KEY = "menuzin_seen_order_ids";

function getStoredSeenOrderIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SEEN_ORDERS_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveSeenOrderIdToStorage(orderId: string) {
  if (typeof window === "undefined" || !orderId) return;
  try {
    const current = getStoredSeenOrderIds();
    current.add(orderId);
    const arr = Array.from(current).slice(-500);
    localStorage.setItem(SEEN_ORDERS_STORAGE_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

// Notificações e estado global em memória
let globalNotifications: AdminNotification[] = [];
let globalNewOrderAlert: Order | null = null;
let autoSimulationActive = false;
let globalSeenOrderIds = getStoredSeenOrderIds();
let globalHasLoadedOrderSnapshot = false;

const listeners = new Set<() => void>();
function notifyListeners() {
  listeners.forEach((l) => l());
}

function markOrderAsSeen(orderId: string) {
  if (!orderId) return;
  globalSeenOrderIds.add(orderId);
  saveSeenOrderIdToStorage(orderId);
}

const CLIENT_NAMES = [
  "Guilherme Santos",
  "Beatriz Oliveira",
  "Roberto Carlos",
  "Juliana Mello",
  "Renato Augusto",
  "Fernanda Lima",
];

function processNewOrders(newOnes: Order[], soundEnabled: boolean) {
  if (newOnes.length === 0) return;

  // REGRA ESTRITA: Apenas pedidos com status "novo" (pendentes de aceite)
  // e que NUNCA foram notificados ou vistos anteriormente.
  const alertable = newOnes.filter(
    (o) => o.status === "novo" && !globalSeenOrderIds.has(o.id)
  );

  if (alertable.length === 0) return;

  const sorted = [...alertable].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });

  const newest = sorted[0];

  // Marcar todos os pedidos deste lote como vistos para não notificar novamente
  for (const o of sorted) {
    markOrderAsSeen(o.id);
  }

  if (!globalNewOrderAlert || globalNewOrderAlert.id !== newest.id) {
    globalNewOrderAlert = newest;
  }

  for (const o of sorted) {
    const notifId = `notif-${o.id}`;
    if (!globalNotifications.some((n) => n.id === notifId)) {
      globalNotifications = [
        {
          id: notifId,
          storeId: o.storeId ?? "",
          orderId: o.id,
          type: "new_order",
          title: "Novo pedido recebido",
          message: `Pedido #${o.number} · ${o.customerName}`,
          read: false,
          createdAt: o.createdAt,
        },
        ...globalNotifications,
      ];
    }
  }

  notifyListeners();
  if (soundEnabled) playNotificationSound();
}

export function useOrdersRealtime() {
  const queryClient = useQueryClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>(globalNotifications);
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(globalNewOrderAlert);
  const [isSimulating, setIsSimulating] = useState(autoSimulationActive);
  const { prefs } = useNotificationPrefs();
  const soundEnabledRef = useRef(prefs.soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = prefs.soundEnabled;
  }, [prefs.soundEnabled]);

  // Carrega inicial + refetch manual
  const refetch = useCallback(async () => {
    try {
      const res = await listOrdersForMyTenant();
      const ui = res.orders.map((o) => dbOrderToUi(o));
      setOrders(ui);

      // Atualiza IDs vistos com pedidos já aceitos / em produção
      for (const o of ui) {
        if (o.status !== "novo") {
          markOrderAsSeen(o.id);
        }
      }
    } catch (err) {
      console.error("Falha ao carregar pedidos:", err);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Polling periódico a cada 10s
  useEffect(() => {
    unlockAudioOnFirstGesture();
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await listOrdersForMyTenant();
        if (cancelled) return;

        const ui = res.orders.map((o) => dbOrderToUi(o));

        // 1. Qualquer pedido que NÃO esteja com status "novo" (já aceito, em preparo, concluído, etc.)
        // é imediatamente marcado como visto para nunca disparar alerta sonoro/visual.
        for (const o of ui) {
          if (o.status !== "novo") {
            markOrderAsSeen(o.id);
          }
        }

        // 2. Se o alerta visual ativo no momento já mudou de status (ex: foi aceito em outra tela/dispositivo),
        // remove o alerta visual imediatamente.
        if (globalNewOrderAlert) {
          const currentAlertOrder = ui.find((o) => o.id === globalNewOrderAlert?.id);
          if (!currentAlertOrder || currentAlertOrder.status !== "novo") {
            globalNewOrderAlert = null;
          }
        }

        // 3. No primeiro carregamento da plataforma (login ou F5):
        // Todos os pedidos existentes são registrados como vistos e NUNCA disparam alarme/toast.
        const isFirstLoad = !globalHasLoadedOrderSnapshot;
        if (isFirstLoad) {
          for (const o of ui) {
            markOrderAsSeen(o.id);
          }
          globalHasLoadedOrderSnapshot = true;
          setOrders(ui);
          notifyListeners();
          return;
        }

        // 4. Em ticks subsequentes: filtrar somente novos pedidos com status "novo" ainda não vistos
        const newOnes = ui.filter(
          (o) => o.status === "novo" && !globalSeenOrderIds.has(o.id)
        );

        setOrders(ui);
        if (newOnes.length > 0) {
          processNewOrders(newOnes, soundEnabledRef.current);
        }
      } catch (err) {
        console.error("Falha ao recarregar pedidos:", err);
      }
    };

    void tick();
    const id = window.setInterval(tick, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  // Bridge para listeners locais (notificações)
  useEffect(() => {
    const handleChange = () => {
      setNotifications([...globalNotifications]);
      setNewOrderAlert(globalNewOrderAlert);
    };
    listeners.add(handleChange);
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  const updateOrderStatus = useCallback(
    async (orderId: string, newStatus: OrderStatus, note?: string) => {
      try {
        // Ao alterar o status (aceitar, enviar para preparo, cancelar, etc.),
        // marca como visto e cancela o alerta visual/sonoro ativo para ele.
        markOrderAsSeen(orderId);
        if (globalNewOrderAlert?.id === orderId) {
          globalNewOrderAlert = null;
        }

        await updateOrderStatusFn({
          data: { order_id: orderId, new_status: newStatus, note },
        });
        await refetch();
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        notifyListeners();
      } catch (err) {
        console.error("Falha ao atualizar status:", err);
      }
    },
    [refetch, queryClient]
  );

  // "Aceitar" envia para "preparo" e limpa alerta
  const acceptOrder = useCallback(
    (orderId: string, note?: string) => {
      markOrderAsSeen(orderId);
      if (globalNewOrderAlert?.id === orderId) {
        globalNewOrderAlert = null;
        notifyListeners();
      }
      return updateOrderStatus(
        orderId,
        "preparo",
        note || "Pedido aceito — iniciou preparo"
      );
    },
    [updateOrderStatus]
  );

  const cancelOrder = useCallback(
    (orderId: string, reason: string, note?: string) => {
      markOrderAsSeen(orderId);
      if (globalNewOrderAlert?.id === orderId) {
        globalNewOrderAlert = null;
        notifyListeners();
      }
      const fullNote = reason + (note ? ` — Observação: ${note}` : "");
      return updateOrderStatus(orderId, "cancelado", fullNote);
    },
    [updateOrderStatus]
  );

  const simulateNewOrder = useCallback(async () => {
    try {
      const name = CLIENT_NAMES[Math.floor(Math.random() * CLIENT_NAMES.length)];
      const { getMyTenant } = await import("@/lib/tenants.functions");
      const { tenant } = await getMyTenant();
      if (!tenant?.slug) return;
      const created = await createOrder({
        data: {
          tenant_slug: tenant.slug,
          customer_name: name,
          whatsapp: `55869${Math.floor(10000000 + Math.random() * 90000000)}`,
          mode: "entrega",
          payment_label: "Pix online",
          delivery_fee: 5,
          items: [
            {
              product_id: null,
              name_snapshot: "Pedido simulado",
              qty: 1,
              unit_price: 35,
              addons: [],
              note: null,
            },
          ],
        },
      });
      if (!created.order) return;
      const res = await listOrdersForMyTenant();
      const ui = res.orders.map((o) => dbOrderToUi(o));
      const createdOrder = ui.find((o) => o.id === created.order.id);

      globalHasLoadedOrderSnapshot = true;
      setOrders(ui);
      if (createdOrder) {
        processNewOrders([createdOrder], soundEnabledRef.current);
      }
    } catch (err) {
      console.error("Falha ao simular pedido:", err);
    }
  }, []);

  const toggleSimulation = (active: boolean) => {
    autoSimulationActive = active;
    setIsSimulating(active);
  };

  const dismissAlert = () => {
    if (globalNewOrderAlert?.id) {
      markOrderAsSeen(globalNewOrderAlert.id);
    }
    globalNewOrderAlert = null;
    setNewOrderAlert(null);
    notifyListeners();
  };

  const markNotificationAsRead = (notifId: string) => {
    globalNotifications = globalNotifications.map((n) =>
      n.id === notifId ? { ...n, read: true } : n
    );
    notifyListeners();
  };

  const markAllNotificationsAsRead = () => {
    globalNotifications = globalNotifications.map((n) => ({
      ...n,
      read: true,
    }));
    notifyListeners();
  };

  const clearNotifications = () => {
    globalNotifications = [];
    notifyListeners();
  };

  return {
    orders,
    notifications,
    newOrderAlert,
    isSimulating,
    dismissAlert,
    updateOrderStatus,
    acceptOrder,
    cancelOrder,
    simulateNewOrder,
    toggleSimulation,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
  };
}

export const triggerSimulatedOrder = () => {
  console.warn(
    "triggerSimulatedOrder() deprecated. Use useOrdersRealtime().simulateNewOrder()"
  );
};
