import { useState, useEffect, useCallback, useRef, useContext, useMemo } from "react";
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
  stopNotificationSound,
  unlockAudioOnFirstGesture,
} from "@/lib/order-alert-sound";
import { AuthContext } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export { playNotificationSound, stopNotificationSound } from "@/lib/order-alert-sound";

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

/** Purgar notificações de memória que não pertencem ao tenant ativo atual. */
function purgeForeignNotifications(storeId: string) {
  if (!storeId) return;
  globalNotifications = globalNotifications.filter(
    (n) => !n.storeId || n.storeId === storeId
  );
  if (globalNewOrderAlert && globalNewOrderAlert.storeId && globalNewOrderAlert.storeId !== storeId) {
    globalNewOrderAlert = null;
  }
}

const CLIENT_NAMES = [
  "Guilherme Santos",
  "Beatriz Oliveira",
  "Roberto Carlos",
  "Juliana Mello",
  "Renato Augusto",
  "Fernanda Lima",
];

function processNewOrders(newOnes: Order[], soundEnabled: boolean, isFresh?: (o: Order) => boolean) {
  if (newOnes.length === 0) return;

  const currentStoreId = newOnes[0]?.storeId;
  if (currentStoreId) {
    purgeForeignNotifications(currentStoreId);
  }

  // REGRA ESTRITA: Apenas pedidos com status "novo" (pendentes de aceite)
  // e que NUNCA foram notificados ou vistos anteriormente.
  const alertable = newOnes.filter(
    (o) => o.status === "novo" && !globalSeenOrderIds.has(o.id)
  );

  if (alertable.length === 0) return;
  // Só pedidos realmente recentes tocam som (evita alarme atrasado após o aparelho dormir).
  const fresh = alertable.filter(isFresh ?? (() => true));

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
  // Um só disparo por pedido no aparelho inteiro (todas as abas).
  if (soundEnabled && fresh.some((o) => claimSoundForOrder(o.id))) playNotificationSound();
}

const SOUND_CLAIM_PREFIX = "menuzin_alert_sound_";

function claimSoundForOrder(orderId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const key = SOUND_CLAIM_PREFIX + orderId;
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, String(Date.now()));
    // limpeza de marcas antigas
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(SOUND_CLAIM_PREFIX) && Date.now() - Number(localStorage.getItem(k)) > 3600_000) localStorage.removeItem(k);
    }
    return true;
  } catch {
    return true;
  }
}

const alertChannel: BroadcastChannel | null =
  typeof window !== "undefined" && "BroadcastChannel" in window ? new BroadcastChannel("menuzin-order-alert") : null;
alertChannel?.addEventListener("message", (ev) => {
  const msg = ev.data as { type?: string; orderId?: string };
  if (msg?.type === "handled" && msg.orderId) {
    markOrderAsSeen(msg.orderId);
    if (globalNewOrderAlert?.id === msg.orderId) {
      globalNewOrderAlert = null;
      stopNotificationSound();
      notifyListeners();
    }
  }
});

// ===== Conferência única por aba (compartilhada por todas as partes do painel) =====
const ALERT_WINDOW_MS = 10 * 60 * 1000;
let globalOrders: Order[] = [];
let globalBaselineMs: number | null = null; // maior createdAt (relógio do servidor) do 1º snapshot
let pollerUsers = 0;
let pollerTimer: number | undefined;
let pollerChannel: ReturnType<typeof supabase.channel> | null = null;
let pollerChannelTenant: string | null = null;
let tickInFlight: Promise<void> | null = null;
let tickAgain = false;
let soundEnabledGlobal = true;
const orderListeners = new Set<(o: Order[]) => void>();

function ts(o: Order) {
  return new Date(o.createdAt).getTime() || 0;
}

function ensureChannel(tenantId: string | undefined) {
  if (!tenantId || pollerChannelTenant === tenantId) return;
  if (pollerChannel) void supabase.removeChannel(pollerChannel);
  pollerChannelTenant = tenantId;
  let debounce: number | undefined;
  pollerChannel = supabase
    .channel(`tenant-orders:${tenantId}`)
    .on("broadcast", { event: "order" }, () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => void sharedTick(), 300);
    })
    .subscribe();
}

async function runTick() {
  const res = await listOrdersForMyTenant();
  const ui = res.orders.map((o) => dbOrderToUi(o));
  const storeId = ui[0]?.storeId;
  if (storeId) purgeForeignNotifications(storeId);

  for (const o of ui) if (o.status !== "novo") markOrderAsSeen(o.id);

  if (globalNewOrderAlert) {
    const cur = ui.find((o) => o.id === globalNewOrderAlert?.id);
    if (!cur || cur.status !== "novo") {
      globalNewOrderAlert = null;
      stopNotificationSound();
      notifyListeners();
    }
  }

  globalOrders = ui;
  orderListeners.forEach((l) => l(ui));
  ensureChannel(storeId);

  const newestMs = ui.reduce((m, o) => Math.max(m, ts(o)), 0);
  if (!globalHasLoadedOrderSnapshot || globalBaselineMs === null) {
    // 1º carregamento: nada toca; guarda a linha de base pelo horário do servidor.
    for (const o of ui) markOrderAsSeen(o.id);
    globalBaselineMs = newestMs;
    globalHasLoadedOrderSnapshot = true;
    notifyListeners();
    return;
  }

  const newOnes = ui.filter((o) => o.status === "novo" && !globalSeenOrderIds.has(o.id));
  if (newOnes.length > 0) {
    const base = globalBaselineMs;
    processNewOrders(newOnes, soundEnabledGlobal, (o) => ts(o) > base && newestMs - ts(o) <= ALERT_WINDOW_MS);
  }
}

export function sharedTick(): Promise<void> {
  if (tickInFlight) {
    tickAgain = true;
    return tickInFlight;
  }
  tickInFlight = runTick()
    .catch((err) => console.error("Falha ao recarregar pedidos:", err))
    .finally(() => {
      tickInFlight = null;
      if (tickAgain) {
        tickAgain = false;
        void sharedTick();
      }
    });
  return tickInFlight;
}

function onWake() {
  if (document.visibilityState === "visible") void sharedTick();
}

function startPoller() {
  pollerUsers++;
  if (pollerUsers > 1) return;
  void sharedTick();
  pollerTimer = window.setInterval(() => void sharedTick(), 10000);
  document.addEventListener("visibilitychange", onWake);
  window.addEventListener("focus", onWake);
  window.addEventListener("online", onWake);
  window.addEventListener("pageshow", onWake);
}

function stopPoller() {
  pollerUsers = Math.max(0, pollerUsers - 1);
  if (pollerUsers > 0) return;
  window.clearInterval(pollerTimer);
  document.removeEventListener("visibilitychange", onWake);
  window.removeEventListener("focus", onWake);
  window.removeEventListener("online", onWake);
  window.removeEventListener("pageshow", onWake);
  if (pollerChannel) void supabase.removeChannel(pollerChannel);
  pollerChannel = null;
  pollerChannelTenant = null;
}

export function useOrdersRealtime() {
  const queryClient = useQueryClient();
  const authCtx = useContext(AuthContext);
  const profileTenantId = authCtx?.profile?.tenant_id ?? undefined;
  // Só consulta pedidos com sessão pronta — evita 401 durante hidratação/logout.
  const canFetch = !!authCtx && !authCtx.loading && authCtx.isAuthenticated;

  const [orders, setOrders] = useState<Order[]>(globalOrders);
  const [notifications, setNotifications] = useState<AdminNotification[]>(globalNotifications);
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(globalNewOrderAlert);
  const [isSimulating, setIsSimulating] = useState(autoSimulationActive);
  const { prefs } = useNotificationPrefs();
  const soundEnabledRef = useRef(prefs.soundEnabled);

  const activeTenantId = orders[0]?.storeId || profileTenantId;

  // Filtrar notificações exclusivamente para o tenant ativo
  const filteredNotifications = useMemo(() => {
    if (!activeTenantId) return notifications;
    return notifications.filter((n) => !n.storeId || n.storeId === activeTenantId);
  }, [notifications, activeTenantId]);

  const filteredNewOrderAlert = useMemo(() => {
    if (!activeTenantId || !newOrderAlert?.storeId) return newOrderAlert;
    return newOrderAlert.storeId === activeTenantId ? newOrderAlert : null;
  }, [newOrderAlert, activeTenantId]);

  useEffect(() => {
    soundEnabledRef.current = prefs.soundEnabled;
    soundEnabledGlobal = prefs.soundEnabled;
  }, [prefs.soundEnabled]);

  const refetch = useCallback(() => sharedTick(), []);

  useEffect(() => {
    orderListeners.add(setOrders);
    return () => {
      orderListeners.delete(setOrders);
    };
  }, []);

  useEffect(() => {
    unlockAudioOnFirstGesture();
    if (!canFetch) return;
    startPoller();
    return () => stopPoller();
  }, [canFetch]);

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
        alertChannel?.postMessage({ type: "handled", orderId });
        if (globalNewOrderAlert?.id === orderId) {
          globalNewOrderAlert = null;
          stopNotificationSound();
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
        stopNotificationSound();
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
        stopNotificationSound();
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
      globalOrders = ui;
      orderListeners.forEach((l) => l(ui));
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
    stopNotificationSound();
    notifyListeners();
  };

  const markNotificationAsRead = (notifId: string) => {
    globalNotifications = globalNotifications.map((n) =>
      n.id === notifId ? { ...n, read: true } : n
    );
    notifyListeners();
  };

  const markAllNotificationsAsRead = () => {
    globalNotifications = globalNotifications.map((n) =>
      !activeTenantId || !n.storeId || n.storeId === activeTenantId ? { ...n, read: true } : n
    );
    notifyListeners();
  };

  const clearNotifications = () => {
    if (activeTenantId) {
      globalNotifications = globalNotifications.filter(
        (n) => n.storeId && n.storeId !== activeTenantId
      );
    } else {
      globalNotifications = [];
    }
    notifyListeners();
  };

  return {
    orders,
    notifications: filteredNotifications,
    newOrderAlert: filteredNewOrderAlert,
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
