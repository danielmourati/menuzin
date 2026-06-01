import { useState, useEffect, useCallback, useRef, useId } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  type Order,
  type OrderStatus,
  type AdminNotification,
} from "@/lib/domain-types";
import { supabase } from "@/integrations/supabase/client";
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

export function playNotificationSound() {
  try {
    const w = window as Window & { webkitAudioContext?: typeof AudioContext };
    const Ctx = window.AudioContext || w.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.warn("Web Audio falhou:", e);
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

  // realtime subscription — canal único por instância para evitar
  // "cannot add postgres_changes callbacks after subscribe()" quando
  // múltiplos componentes montam o hook simultaneamente.
  useEffect(() => {
    const channelName = `orders-changes:${instanceId}:${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        refetch();
        if (payload.eventType === "INSERT" && soundEnabledRef.current) {
          playNotificationSound();
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refetch, instanceId]);

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

  const acceptOrder = useCallback((orderId: string, note?: string) => {
    return updateOrderStatus(orderId, "aceito", note || "Pedido aceito.");
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
