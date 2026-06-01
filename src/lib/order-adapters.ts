import type { DbOrder, DbOrderItem } from "./db-types";
import type { Order, OrderItem, OrderStatusHistoryEntry } from "./mock-data";

export function dbOrderItemToUi(it: DbOrderItem): OrderItem {
  return {
    productId: it.product_id ?? "",
    name: it.name_snapshot,
    qty: it.qty,
    unitPrice: Number(it.unit_price),
    addons: (it.addons ?? []).map((a, idx) => ({
      id: String(idx), name: a.name, price: Number(a.price),
    })),
    note: it.note ?? undefined,
  };
}

export function dbOrderToUi(o: DbOrder, history: OrderStatusHistoryEntry[] = []): Order {
  return {
    id: o.id,
    number: o.number,
    storeId: o.tenant_id,
    customerName: o.customer_name,
    whatsapp: o.whatsapp,
    mode: o.mode,
    status: o.status,
    paymentStatus: o.payment_status,
    payment: o.payment_label,
    changeFor: o.change_for ?? undefined,
    items: o.items.map(dbOrderItemToUi),
    subtotal: Number(o.subtotal),
    deliveryFee: Number(o.delivery_fee),
    total: Number(o.total),
    address: o.address ?? undefined,
    table: o.table_label ?? undefined,
    pickupTime: o.pickup_time ?? undefined,
    note: o.note ?? undefined,
    createdAt: o.created_at,
    acceptedAt: o.accepted_at ?? undefined,
    cancelledAt: o.cancelled_at ?? undefined,
    cancelReason: o.cancel_reason ?? undefined,
    completedAt: o.completed_at ?? undefined,
    statusHistory: history.length > 0 ? history : [{
      id: `init_${o.id}`,
      newStatus: "novo",
      note: "Pedido criado.",
      createdAt: o.created_at,
    }],
  };
}
