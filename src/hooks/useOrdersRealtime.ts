import { useState, useEffect } from "react";
import {
  orders as initialOrders,
  adminNotifications as initialNotifications,
  products,
  type Order,
  type OrderStatus,
  type PaymentStatus,
  type OrderItem,
  type AdminNotification,
  type OrderStatusHistoryEntry,
  type OrderMode,
} from "@/lib/mock-data";
import { useNotificationPrefs } from "./useNotificationPrefs";

// Estado global compartilhado em memória para simular banco em tempo real
let globalOrders: Order[] = [...initialOrders];
let globalNotifications: AdminNotification[] = [...initialNotifications];
let globalNewOrderAlert: Order | null = null;
let autoSimulationActive = false;

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((l) => l());
}

// Lista de nomes para novos pedidos simulados
const CLIENT_NAMES = [
  "Guilherme Santos",
  "Beatriz Oliveira",
  "Roberto Carlos",
  "Juliana Mello",
  "Renato Augusto",
  "Fernanda Lima",
  "Thiago Silva",
  "Clara Mendes",
];

const STREET_NAMES = [
  "Rua das Palmeiras",
  "Av. Central",
  "Rua Sergipe",
  "Av. São Sebastião",
  "Rua 15 de Novembro",
];

const NEIGHBORHOODS = ["Fátima", "Jóquei", "Piauí", "São Francisco", "Cantagalo"];

// Função para simular som (sintetizador Web Audio API)
export function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.warn("Autoplay bloqueado ou Web Audio não suportado", e);
  }
}

// Função de simulação exportável
export function triggerSimulatedOrder() {
  const nextNum = globalOrders.length > 0 ? Math.max(...globalOrders.map((o) => o.number)) + 1 : 1049;
  const name = CLIENT_NAMES[Math.floor(Math.random() * CLIENT_NAMES.length)];
  const isDelivery = Math.random() > 0.3;
  const isTable = !isDelivery && Math.random() > 0.5;
  const mode: OrderMode = isDelivery ? "entrega" : isTable ? "consumo_local" : "retirada";

  // Seleciona 1 a 3 itens aleatórios
  const itemCount = Math.floor(Math.random() * 3) + 1;
  const selectedProducts = [...products].sort(() => 0.5 - Math.random()).slice(0, itemCount);
  
  const items: OrderItem[] = selectedProducts.map((p) => {
    const qty = Math.floor(Math.random() * 2) + 1;
    return {
      productId: p.id,
      name: p.name,
      qty,
      unitPrice: p.price,
      addons: [],
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const deliveryFee = mode === "entrega" ? 5.0 : 0;
  const total = subtotal + deliveryFee;

  const paymentMethods = ["Pix online", "Dinheiro", "Cartão de crédito na entrega", "Pix manual"];
  const payment = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
  const paymentStatus: PaymentStatus = payment === "Pix online" ? "approved" : "manual";

  const orderId = `o_sim_${nextNum}`;
  const nowIso = new Date().toISOString();

  const newOrder: Order = {
    id: orderId,
    number: nextNum,
    storeId: "s1",
    customerName: name,
    whatsapp: `55869${Math.floor(10000000 + Math.random() * 90000000)}`,
    mode,
    status: "novo",
    paymentStatus,
    payment,
    items,
    subtotal,
    deliveryFee,
    total,
    createdAt: nowIso,
    statusHistory: [
      {
        id: `sh_sim_${nextNum}`,
        newStatus: "novo",
        note: paymentStatus === "approved" ? "Pedido recebido com pagamento online aprovado." : "Pedido recebido.",
        createdAt: nowIso,
      },
    ],
  };

  if (mode === "entrega") {
    newOrder.address = {
      street: STREET_NAMES[Math.floor(Math.random() * STREET_NAMES.length)],
      number: String(Math.floor(Math.random() * 900) + 10),
      neighborhood: NEIGHBORHOODS[Math.floor(Math.random() * NEIGHBORHOODS.length)],
      reference: Math.random() > 0.5 ? "Perto do supermercado" : undefined,
    };
  } else if (mode === "consumo_local") {
    newOrder.table = `Mesa ${Math.floor(Math.random() * 15) + 1}`;
  }

  // Cria notificação associada
  const notificationId = `n_sim_${nextNum}`;
  const newNotif: AdminNotification = {
    id: notificationId,
    storeId: "s1",
    orderId,
    type: "new_order",
    title: "Novo pedido recebido!",
    message: `Pedido #${nextNum} — ${name} — R$ ${total.toFixed(2).replace(".", ",")}`,
    read: false,
    createdAt: nowIso,
  };

  globalOrders = [newOrder, ...globalOrders];
  globalNotifications = [newNotif, ...globalNotifications];
  globalNewOrderAlert = newOrder;

  notifyListeners();

  // Dispara o som se configurado localmente
  try {
    const prefsRaw = localStorage.getItem("menuzin_notification_prefs");
    const prefs = prefsRaw ? JSON.parse(prefsRaw) : { soundEnabled: true };
    if (prefs.soundEnabled) {
      playNotificationSound();
    }
  } catch (e) {
    // Silencia
  }
}

export function useOrdersRealtime() {
  const [orders, setOrders] = useState<Order[]>(globalOrders);
  const [notifications, setNotifications] = useState<AdminNotification[]>(globalNotifications);
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(globalNewOrderAlert);
  const [isSimulating, setIsSimulating] = useState(autoSimulationActive);
  const { prefs } = useNotificationPrefs();

  useEffect(() => {
    const handleChange = () => {
      setOrders([...globalOrders]);
      setNotifications([...globalNotifications]);
      setNewOrderAlert(globalNewOrderAlert);
    };

    listeners.add(handleChange);
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  // Simulação periódica
  useEffect(() => {
    if (!isSimulating) return;
    
    const interval = setInterval(() => {
      triggerSimulatedOrder();
    }, 45000); // a cada 45s

    return () => clearInterval(interval);
  }, [isSimulating]);

  const toggleSimulation = (active: boolean) => {
    autoSimulationActive = active;
    setIsSimulating(active);
  };

  const dismissAlert = () => {
    globalNewOrderAlert = null;
    setNewOrderAlert(null);
  };

  const updateOrderStatus = (
    orderId: string,
    newStatus: OrderStatus,
    note?: string,
    changedByName = "Atendente"
  ) => {
    globalOrders = globalOrders.map((o) => {
      if (o.id !== orderId) return o;

      const historyEntry: OrderStatusHistoryEntry = {
        id: `sh_upd_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        previousStatus: o.status,
        newStatus,
        note,
        changedByName,
        createdAt: new Date().toISOString(),
      };

      const updates: Partial<Order> = {
        status: newStatus,
        statusHistory: [...o.statusHistory, historyEntry],
      };

      if (newStatus === "aceito") {
        updates.acceptedAt = new Date().toISOString();
      } else if (newStatus === "cancelado") {
        updates.cancelledAt = new Date().toISOString();
        updates.cancelReason = note || "Cancelado pelo estabelecimento";
      } else if (newStatus === "finalizado") {
        updates.completedAt = new Date().toISOString();
      }

      return { ...o, ...updates };
    });

    // Cria notificação dependendo da alteração
    if (newStatus === "cancelado") {
      const target = globalOrders.find((o) => o.id === orderId);
      if (target) {
        const notif: AdminNotification = {
          id: `n_status_${Date.now()}`,
          storeId: target.storeId,
          orderId,
          type: "order_cancelled",
          title: `Pedido #${target.number} cancelado`,
          message: `O pedido de ${target.customerName} foi cancelado.`,
          read: false,
          createdAt: new Date().toISOString(),
        };
        globalNotifications = [notif, ...globalNotifications];
      }
    }

    notifyListeners();
  };

  const acceptOrder = (orderId: string, note?: string) => {
    updateOrderStatus(orderId, "aceito", note || "Pedido aceito e em processamento.");
  };

  const cancelOrder = (orderId: string, reason: string, note?: string) => {
    const fullNote = reason + (note ? ` — Observação: ${note}` : "");
    updateOrderStatus(orderId, "cancelado", fullNote);
  };

  const markNotificationAsRead = (notifId: string) => {
    globalNotifications = globalNotifications.map((n) =>
      n.id === notifId ? { ...n, read: true } : n
    );
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
    simulateNewOrder: triggerSimulatedOrder,
    toggleSimulation,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
  };
}
