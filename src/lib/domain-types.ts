// Tipos de domínio compartilhados entre UI, server functions e adapters.
// NÃO contém dados — apenas o contrato de UI sobre as tabelas do banco.

export type ProductAddon = { id: string; name: string; price: number };

export type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  promoPrice?: number;
  image: string;
  available: boolean;
  featured: boolean;
  prepTime?: string;
  addons?: ProductAddon[];
};

export type Category = {
  id: string;
  name: string;
  description?: string;
  order: number;
  active: boolean;
};

export type OrderStatus =
  | "novo"
  | "aceito"
  | "preparo"
  | "saiu_entrega"
  | "pronto_retirada"
  | "servido"
  | "finalizado"
  | "cancelado";

export type PaymentStatus = "pending" | "approved" | "rejected" | "refunded" | "manual";
export type OrderMode = "entrega" | "retirada" | "consumo_local";

export type OrderItem = {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  addons: ProductAddon[];
  note?: string;
};

export type OrderStatusHistoryEntry = {
  id: string;
  previousStatus?: OrderStatus;
  newStatus: OrderStatus;
  note?: string;
  changedByName?: string;
  createdAt: string;
};

export type Order = {
  id: string;
  number: number;
  storeId: string;
  customerName: string;
  whatsapp: string;
  mode: OrderMode;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  payment: string;
  changeFor?: number;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  address?: {
    cep?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    complement?: string;
    reference?: string;
  };
  table?: string;
  pickupTime?: string;
  note?: string;
  createdAt: string;
  acceptedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  completedAt?: string;
  statusHistory: OrderStatusHistoryEntry[];
};

export type AdminNotification = {
  id: string;
  storeId: string;
  orderId?: string;
  type: "new_order" | "order_paid" | "order_cancelled" | "payment_rejected" | "order_stale";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  description: string;
  whatsapp: string;
  city: string;
  state: string;
  address: string;
  open: boolean;
  prepTime: string;
  minOrder: number;
  deliveryFee: number;
  hours: string;
  logoLetter: string;
  logoUrl?: string;
  themeFrom: string;
  themeTo: string;
  active: boolean;
  social?: { instagram?: string; facebook?: string };
};
