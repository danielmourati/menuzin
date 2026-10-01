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

function processNewOrders(newOnes: Order[], soundEnabled: boolean) {
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
  const fresh = alertable.filter((o) => Date.now() - new Date(o.createdAt).getTime() <= ALERT_MAX_AGE_MS);

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

const ALERT_MAX_AGE_MS = 3 * 60 * 1000;
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

export function useOrdersRealtime() {
  const queryClient = useQueryClient();
  const authCtx = useContext(AuthContext);
  const profileTenantId = authCtx?.profile?.tenant_id ?? undefined;
  // Só consulta pedidos com sessão pronta — evita 401 durante hidratação/logout.
  const canFetch = !!authCtx && !authCtx.loading && authCtx.isAuthenticated;

  const [orders, setOrders] = useState<Order[]>([]);
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
  }, [prefs.soundEnabled]);

  // Carrega inicial + refetch manual
  const refetch = useCallback(async () => {
    try {
      const res = await listOrdersForMyTenant();
      const ui = res.orders.map((o) => dbOrderToUi(o));
      const currentStoreId = ui[0]?.storeId;
      if (currentStoreId) {
        purgeForeignNotifications(currentStoreId);
      }
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
    if (!canFetch) return;
    refetch();
  }, [refetch, canFetch]);

  // Polling periódico a cada 10s
  useEffect(() => {
    unlockAudioOnFirstGesture();
    if (!canFetch) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await listOrdersForMyTenant();
        if (cancelled) return;

        const ui = res.orders.map((o) => dbOrderToUi(o));
        const currentStoreId = ui[0]?.storeId;
        if (currentStoreId) {
          purgeForeignNotifications(currentStoreId);
        }

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
            stopNotificationSound();
            notifyListeners();
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
    // Aviso imediato: qualquer INSERT/UPDATE de pedido da loja dispara uma conferência na hora.
    let debounce: number | undefined;
    const channel = profileTenantId
      ? supabase
          .channel(`orders-live-${profileTenantId}-${Math.random().toString(36).slice(2)}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "orders", filter: `tenant_id=eq.${profileTenantId}` },
            () => {
              window.clearTimeout(debounce);
              debounce = window.setTimeout(() => void tick(), 400);
            },
          )
          .subscribe()
      : null;
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.clearTimeout(debounce);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [canFetch, profileTenantId]);

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
