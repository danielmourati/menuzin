import { useState, useEffect, useCallback, useRef, useId } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  type Order,
  type OrderStatus,
  type AdminNotification,
} from "@/lib/domain-types";

import { listOrdersForMyTenant, updateOrderStatus as updateOrderStatusFn, createOrder } from "@/lib/orders.functions";
import { dbOrderToUi } from "@/lib/order-adapters";
import { useNotificationPrefs } from "./useNotificationPrefs";

// notificações continuam em memória (lightweight)
let globalNotifications: AdminNotification[] = [];
let globalNewOrderAlert: Order | null = null;
let autoSimulationActive = false;
const listeners = new Set<() => void>();
function notifyListeners() { listeners.forEach((l) => l()); }

const CLIENT_NAMES = ["Guilherme Santos","Beatriz Oliveira","Roberto Carlos","Juliana Mello","Renato Augusto","Fernanda Lima"];

let _alertAudio: HTMLAudioElement | null = null;
function getAlertAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!_alertAudio) {
    _alertAudio = new Audio("/sounds/alert.mp3");
    _alertAudio.preload = "auto";
    _alertAudio.volume = 0.9;
  }
  return _alertAudio;
}

export function playNotificationSound() {
  try {
    const audio = getAlertAudio();
    if (!audio) return;
    audio.currentTime = 0;
    const p = audio.play();
    if (p && typeof p.catch === "function") {
      p.catch((err) => console.warn("Autoplay bloqueado:", err));
    }
  } catch (e) {
    console.warn("Falha ao tocar alert.mp3:", e);
  }
}

export function useOrdersRealtime() {
  const queryClient = useQueryClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>(globalNotifications);
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(globalNewOrderAlert);
  const [isSimulating, setIsSimulating] = useState(autoSimulationActive);
  const { prefs } = useNotificationPrefs();
  const soundEnabledRef = useRef(prefs.soundEnabled);
  useEffect(() => { soundEnabledRef.current = prefs.soundEnabled; }, [prefs.soundEnabled]);
  const instanceId = useId();

  // load initial + refetch
  const refetch = useCallback(async () => {
    try {
      const res = await listOrdersForMyTenant();
      setOrders(res.orders.map((o) => dbOrderToUi(o)));
    } catch (err) {
      console.error("Falha ao carregar pedidos:", err);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  // Atualização por polling periódico. A publicação Realtime das tabelas
  // `orders` e `order_status_history` foi removida por segurança (evita que
  // staff de uma loja receba eventos de outra loja), então recarregamos a
  // lista a cada 10s. O som de novo pedido toca quando aparece um pedido
  // mais recente do que o último visto.
  const lastSeenIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await listOrdersForMyTenant();
        if (cancelled) return;
        const ui = res.orders.map((o) => dbOrderToUi(o));
        const known = lastSeenIdsRef.current;
        const hasNew = known.size > 0 && ui.some((o) => !known.has(o.id));
        ui.forEach((o) => known.add(o.id));
        setOrders(ui);
        if (hasNew && soundEnabledRef.current) playNotificationSound();
      } catch (err) {
        console.error("Falha ao recarregar pedidos:", err);
      }
    };
    void tick();
    const id = window.setInterval(tick, 10000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [instanceId]);

  // bridge para listeners locais (notificações)
  useEffect(() => {
    const handleChange = () => {
      setNotifications([...globalNotifications]);
      setNewOrderAlert(globalNewOrderAlert);
    };
    listeners.add(handleChange);
    return () => { listeners.delete(handleChange); };
  }, []);

  const updateOrderStatus = useCallback(async (
    orderId: string,
    newStatus: OrderStatus,
    note?: string,
  ) => {
    try {
      await updateOrderStatusFn({ data: { order_id: orderId, new_status: newStatus, note } });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      console.error("Falha ao atualizar status:", err);
    }
  }, [refetch, queryClient]);

  // Fluxo simplificado: "Aceitar" já manda direto para "preparo".
  const acceptOrder = useCallback((orderId: string, note?: string) => {
    return updateOrderStatus(orderId, "preparo", note || "Pedido aceito — iniciou preparo");
  }, [updateOrderStatus]);

  const cancelOrder = useCallback((orderId: string, reason: string, note?: string) => {
    const fullNote = reason + (note ? ` — Observação: ${note}` : "");
    return updateOrderStatus(orderId, "cancelado", fullNote);
  }, [updateOrderStatus]);

  const simulateNewOrder = useCallback(async () => {
    // Cria um pedido fake no banco do tenant do usuário logado
    try {
      const name = CLIENT_NAMES[Math.floor(Math.random() * CLIENT_NAMES.length)];
      // pega o primeiro tenant do usuário via /loja pública (slug do meu tenant)
      const { getMyTenant } = await import("@/lib/tenants.functions");
      const { tenant } = await getMyTenant();
      if (!tenant?.slug) return;
      await createOrder({
        data: {
          tenant_slug: tenant.slug,
          customer_name: name,
          whatsapp: `55869${Math.floor(10000000 + Math.random() * 90000000)}`,
          mode: "entrega",
          payment_label: "Pix online",
          delivery_fee: 5,
          items: [{
            product_id: null,
            name_snapshot: "Pedido simulado",
            qty: 1,
            unit_price: 35,
            addons: [],
            note: null,
          }],
        },
      });
      await refetch();
    } catch (err) {
      console.error("Falha ao simular pedido:", err);
    }
  }, [refetch]);

  const toggleSimulation = (active: boolean) => {
    autoSimulationActive = active;
    setIsSimulating(active);
  };

  const dismissAlert = () => {
    globalNewOrderAlert = null;
    setNewOrderAlert(null);
  };

  const markNotificationAsRead = (notifId: string) => {
    globalNotifications = globalNotifications.map((n) => n.id === notifId ? { ...n, read: true } : n);
    notifyListeners();
  };
  const markAllNotificationsAsRead = () => {
    globalNotifications = globalNotifications.map((n) => ({ ...n, read: true }));
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
  // mantém export para compat — agora no-op, simulação acontece via hook
  console.warn("triggerSimulatedOrder() deprecated. Use useOrdersRealtime().simulateNewOrder()");
};
