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

// notificações continuam em memória (lightweight)
let globalNotifications: AdminNotification[] = [];
let globalNewOrderAlert: Order | null = null;
let autoSimulationActive = false;
let globalSeenOrderIds = new Set<string>();
let globalHasLoadedOrderSnapshot = false;
const listeners = new Set<() => void>();
function notifyListeners() { listeners.forEach((l) => l()); }

const CLIENT_NAMES = ["Guilherme Santos","Beatriz Oliveira","Roberto Carlos","Juliana Mello","Renato Augusto","Fernanda Lima"];

let _alertAudio: HTMLAudioElement | null = null;
let _audioUnlocked = false;
let _unlockListenersAttached = false;
let _audioContext: AudioContext | null = null;
function getAlertAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!_alertAudio) {
    _alertAudio = new Audio("/sounds/alert.mp3");
    _alertAudio.preload = "auto";
    _alertAudio.volume = 0.9;
  }
  return _alertAudio;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!_audioContext || _audioContext.state === "closed") {
    _audioContext = new AudioContextCtor();
  }
  return _audioContext;
}

async function unlockNotificationAudio(): Promise<boolean> {
  let unlocked = false;

  const context = getAudioContext();
  if (context) {
    try {
      if (context.state === "suspended") await context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      gain.gain.value = 0.0001;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.03);
      unlocked = context.state === "running";
    } catch {
      // Continua para o fallback em HTMLAudioElement.
    }
  }

  const audio = getAlertAudio();
  if (audio) {
    const prevVol = audio.volume;
    try {
      audio.volume = 0;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      unlocked = true;
    } catch {
      // O Web Audio acima já cobre navegadores que bloqueiam <audio> após gesto.
    } finally {
      audio.volume = prevVol;
    }
  }

  _audioUnlocked = unlocked;
  return unlocked;
}

function unlockAudioOnFirstGesture() {
  if (typeof window === "undefined" || _audioUnlocked || _unlockListenersAttached) return;
  const unlock = () => {
    void unlockNotificationAudio().then((ok) => {
      if (!ok) return;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
      _unlockListenersAttached = false;
    });
  };
  _unlockListenersAttached = true;
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  window.addEventListener("touchstart", unlock, { once: true });
}

function playGeneratedChime(context: AudioContext) {
  const now = context.currentTime;
  [880, 1174.66, 1567.98].forEach((frequency, index) => {
    const start = now + index * 0.11;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.34);
  });
}

export function playNotificationSound() {
  const play = async () => {
    const context = getAudioContext();
    if (context) {
      if (context.state === "suspended") await context.resume();
      if (context.state === "running") {
        playGeneratedChime(context);
        _audioUnlocked = true;
        return;
      }
    }

    const audio = getAlertAudio();
    if (!audio) return;
    audio.currentTime = 0;
    await audio.play();
    _audioUnlocked = true;
  };

  void play().catch((e) => {
    console.warn("Falha ao tocar alerta sonoro de novo pedido:", e);
    unlockAudioOnFirstGesture();
  });
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
    unlockAudioOnFirstGesture();
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await listOrdersForMyTenant();
        if (cancelled) return;
        const ui = res.orders.map((o) => dbOrderToUi(o));
        const known = lastSeenIdsRef.current;
        const isFirstLoad = known.size === 0;
        const newOnes = isFirstLoad ? [] : ui.filter((o) => !known.has(o.id));
        ui.forEach((o) => known.add(o.id));
        setOrders(ui);
        if (newOnes.length > 0) {
          // ordena por createdAt desc — mais recente primeiro
          const sorted = [...newOnes].sort((a, b) => {
            const ta = new Date(a.createdAt).getTime();
            const tb = new Date(b.createdAt).getTime();
            return tb - ta;
          });
          const newest = sorted[0];
          // Evita sobrescrever um alerta que ainda não foi consumido
          if (!globalNewOrderAlert || globalNewOrderAlert.id !== newest.id) {
            globalNewOrderAlert = newest;
          }
          // Push notifications (dedupe por orderId)
          const existingOrderIds = new Set(
            globalNotifications.map((n) => n.orderId).filter(Boolean) as string[],
          );
          for (const o of sorted) {
            if (existingOrderIds.has(o.id)) continue;
            globalNotifications = [
              {
                id: `notif-${o.id}`,
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
          notifyListeners();
          if (soundEnabledRef.current) playNotificationSound();
        }
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
