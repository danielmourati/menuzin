import primeBurguerLogo from "@/assets/prime-burguer-logo.png";

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
  payment: string; // label legível
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

export const store = {
  id: "s1",
  name: "Burger Prime",
  slug: "burger-prime",
  description: "Hambúrgueres artesanais, combos e sobremesas feitos com ingredientes selecionados.",
  whatsapp: "5586999999999",
  city: "Parnaíba",
  state: "PI",
  address: "Av. Beira Rio, 123 — Centro",
  open: true,
  prepTime: "35 a 45 min",
  minOrder: 20,
  deliveryFee: 5,
  hours: "Seg–Dom · 18h às 23h",
  logoLetter: "B",
};

export const categories: Category[] = [
  { id: "c1", name: "Hambúrgueres", order: 1, active: true },
  { id: "c2", name: "Combos", order: 2, active: true },
  { id: "c3", name: "Bebidas", order: 3, active: true },
  { id: "c4", name: "Sobremesas", order: 4, active: true },
  { id: "c5", name: "Promoções", order: 5, active: true },
];

const baseAddons: ProductAddon[] = [
  { id: "a1", name: "Queijo extra", price: 4 },
  { id: "a2", name: "Bacon", price: 5 },
  { id: "a3", name: "Ovo", price: 3 },
  { id: "a4", name: "Molho especial", price: 2 },
  { id: "a5", name: "Batata extra", price: 6 },
];

const img = (seed: string) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=600&q=70`;

export const products: Product[] = [
  {
    id: "p1", name: "Classic Burger", category: "Hambúrgueres",
    description: "Pão brioche, blend 160g, queijo cheddar, alface e tomate.",
    price: 24.9, image: img("1568901346375-23c9450c58cd"), available: true, featured: true, prepTime: "25 min", addons: baseAddons,
  },
  {
    id: "p2", name: "Bacon Supreme", category: "Hambúrgueres",
    description: "Blend 180g, bacon crocante, cheddar duplo e cebola caramelizada.",
    price: 32.9, promoPrice: 28.9, image: img("1553979459-d2229ba7433b"), available: true, featured: true, addons: baseAddons,
  },
  {
    id: "p3", name: "Double Cheddar", category: "Hambúrgueres",
    description: "Dois blends 120g, cheddar cremoso, picles e maionese da casa.",
    price: 34.9, image: img("1551782450-a2132b4ba21d"), available: true, featured: false, addons: baseAddons,
  },
  {
    id: "p4", name: "Chicken Crispy", category: "Hambúrgueres",
    description: "Filé de frango empanado crocante, alface e molho especial.",
    price: 27.9, image: img("1606755962773-d324e0a13086"), available: false, featured: false, addons: baseAddons,
  },
  {
    id: "p5", name: "Combo Classic", category: "Combos",
    description: "Classic Burger + batata frita + refrigerante lata.",
    price: 39.9, image: img("1571091718767-18b5b1457add"), available: true, featured: true,
  },
  {
    id: "p6", name: "Combo Família", category: "Combos",
    description: "4 hambúrgueres, 2 batatas grandes e 2 refrigerantes 1L.",
    price: 119.9, image: img("1586816001966-79b736744398"), available: true, featured: false,
  },
  {
    id: "p7", name: "Batata Frita", category: "Combos",
    description: "Porção generosa de batata frita crocante com sal e ervas.",
    price: 18.9, image: img("1576107232684-1279f390859f"), available: true, featured: false,
  },
  {
    id: "p8", name: "Refrigerante Lata", category: "Bebidas",
    description: "Lata 350ml gelada. Coca-Cola, Guaraná ou Sprite.",
    price: 6.5, image: img("1622483767028-3f66f32aef97"), available: true, featured: false,
  },
  {
    id: "p9", name: "Suco Natural", category: "Bebidas",
    description: "500ml. Laranja, maracujá, abacaxi com hortelã ou limão.",
    price: 9.9, image: img("1600271886742-f049cd451bba"), available: true, featured: false,
  },
  {
    id: "p10", name: "Milkshake Chocolate", category: "Sobremesas",
    description: "Milkshake cremoso de chocolate com calda e chantilly.",
    price: 16.9, image: img("1572490122747-3968b75cc699"), available: true, featured: true,
  },
  {
    id: "p11", name: "Brownie", category: "Sobremesas",
    description: "Brownie quentinho com sorvete de creme e calda quente.",
    price: 14.9, image: img("1606313564200-e75d5e30476c"), available: true, featured: false,
  },
  {
    id: "p12", name: "Promo Burger + Refri", category: "Promoções",
    description: "Classic Burger + refrigerante lata por preço promocional.",
    price: 34.9, promoPrice: 29.9, image: img("1586190848861-99aa4a171e90"), available: true, featured: true,
  },
];

const now = Date.now();
const mins = (m: number) => new Date(now - m * 60 * 1000).toISOString();
const hrs = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString();

// ─── 10 pedidos mockados ─────────────────────────────────────────────────────
export const orders: Order[] = [
  // 1. Novo pedido aguardando aceite — Pix online aprovado
  {
    id: "o1", number: 1048, storeId: "s1",
    customerName: "Mariana Silva", whatsapp: "5586988880001",
    mode: "entrega", status: "novo", paymentStatus: "approved", payment: "Pix online",
    subtotal: 52.8, deliveryFee: 5, total: 57.8,
    items: [
      { productId: "p2", name: "Bacon Supreme", qty: 2, unitPrice: 28.9, addons: [{ id: "a1", name: "Queijo extra", price: 4 }], note: "Sem cebola" },
      { productId: "p8", name: "Refrigerante Lata", qty: 1, unitPrice: 6.5, addons: [] },
    ],
    address: { street: "Rua das Flores", number: "100", neighborhood: "Centro", reference: "Próximo à praça" },
    note: "Porta com interfone. Ligar antes.",
    createdAt: mins(2),
    statusHistory: [
      { id: "sh1a", newStatus: "novo", note: "Pedido criado pelo cliente.", changedByName: "Sistema", createdAt: mins(2) },
    ],
  },

  // 2. Pedido aceito — Dinheiro
  {
    id: "o2", number: 1047, storeId: "s1",
    customerName: "João Pereira", whatsapp: "5586988880002",
    mode: "retirada", status: "aceito", paymentStatus: "manual", payment: "Dinheiro",
    changeFor: 100,
    subtotal: 79.8, deliveryFee: 0, total: 79.8,
    items: [
      { productId: "p5", name: "Combo Classic", qty: 2, unitPrice: 39.9, addons: [] },
    ],
    createdAt: mins(18), acceptedAt: mins(12),
    statusHistory: [
      { id: "sh2a", newStatus: "novo", note: "Pedido criado.", createdAt: mins(18) },
      { id: "sh2b", previousStatus: "novo", newStatus: "aceito", note: "Pedido aceito pelo estabelecimento.", changedByName: "Atendente", createdAt: mins(12) },
    ],
  },

  // 3. Em preparo — Cartão de crédito na entrega
  {
    id: "o3", number: 1046, storeId: "s1",
    customerName: "Lucas Lima", whatsapp: "5586988880003",
    mode: "entrega", status: "preparo", paymentStatus: "manual", payment: "Cartão de crédito na entrega",
    subtotal: 119.9, deliveryFee: 5, total: 124.9,
    items: [{ productId: "p6", name: "Combo Família", qty: 1, unitPrice: 119.9, addons: [] }],
    address: { street: "Av. Brasil", number: "55", neighborhood: "São José", complement: "Apto 302" },
    createdAt: mins(45), acceptedAt: mins(40),
    statusHistory: [
      { id: "sh3a", newStatus: "novo", createdAt: mins(45) },
      { id: "sh3b", previousStatus: "novo", newStatus: "aceito", changedByName: "Atendente", createdAt: mins(40) },
      { id: "sh3c", previousStatus: "aceito", newStatus: "preparo", note: "Pedido entrou em preparo.", changedByName: "Atendente", createdAt: mins(30) },
    ],
  },

  // 4. Saiu para entrega — Pix manual
  {
    id: "o4", number: 1045, storeId: "s1",
    customerName: "Ana Costa", whatsapp: "5586988880004",
    mode: "entrega", status: "saiu_entrega", paymentStatus: "manual", payment: "Pix manual",
    subtotal: 49.8, deliveryFee: 5, total: 54.8,
    items: [{ productId: "p1", name: "Classic Burger", qty: 2, unitPrice: 24.9, addons: [] }],
    address: { street: "Rua Nova", number: "300", neighborhood: "Pirajá" },
    createdAt: mins(80), acceptedAt: mins(75),
    statusHistory: [
      { id: "sh4a", newStatus: "novo", createdAt: mins(80) },
      { id: "sh4b", previousStatus: "novo", newStatus: "aceito", createdAt: mins(75) },
      { id: "sh4c", previousStatus: "aceito", newStatus: "preparo", createdAt: mins(60) },
      { id: "sh4d", previousStatus: "preparo", newStatus: "saiu_entrega", note: "Pedido saiu para entrega.", createdAt: mins(15) },
    ],
  },

  // 5. Pronto para retirada — Pix online
  {
    id: "o5", number: 1044, storeId: "s1",
    customerName: "Pedro Alves", whatsapp: "5586988880005",
    mode: "retirada", status: "pronto_retirada", paymentStatus: "approved", payment: "Pix online",
    subtotal: 27.9, deliveryFee: 0, total: 27.9,
    items: [{ productId: "p4", name: "Chicken Crispy", qty: 1, unitPrice: 27.9, addons: [] }],
    createdAt: mins(110),
    statusHistory: [
      { id: "sh5a", newStatus: "novo", createdAt: mins(110) },
      { id: "sh5b", previousStatus: "novo", newStatus: "aceito", createdAt: mins(100) },
      { id: "sh5c", previousStatus: "aceito", newStatus: "preparo", createdAt: mins(90) },
      { id: "sh5d", previousStatus: "preparo", newStatus: "pronto_retirada", note: "Pedido pronto para retirada.", createdAt: mins(20) },
    ],
  },

  // 6. Finalizado — Cartão débito
  {
    id: "o6", number: 1043, storeId: "s1",
    customerName: "Camila Reis", whatsapp: "5586988880006",
    mode: "consumo_local", status: "finalizado", paymentStatus: "manual", payment: "Cartão de débito",
    subtotal: 65.7, deliveryFee: 0, total: 65.7, table: "Mesa 4",
    items: [
      { productId: "p3", name: "Double Cheddar", qty: 1, unitPrice: 34.9, addons: [] },
      { productId: "p10", name: "Milkshake Chocolate", qty: 1, unitPrice: 16.9, addons: [] },
      { productId: "p8", name: "Refrigerante Lata", qty: 2, unitPrice: 6.5, addons: [] },
    ],
    createdAt: hrs(3), acceptedAt: hrs(3),
    statusHistory: [
      { id: "sh6a", newStatus: "novo", createdAt: hrs(3) },
      { id: "sh6b", previousStatus: "novo", newStatus: "aceito", createdAt: hrs(3) },
      { id: "sh6c", previousStatus: "aceito", newStatus: "preparo", createdAt: new Date(now - 2.8 * 3600000).toISOString() },
      { id: "sh6d", previousStatus: "preparo", newStatus: "servido", createdAt: new Date(now - 2.5 * 3600000).toISOString() },
      { id: "sh6e", previousStatus: "servido", newStatus: "finalizado", note: "Pedido finalizado.", createdAt: new Date(now - 2 * 3600000).toISOString() },
    ],
  },

  // 7. Cancelado — com motivo
  {
    id: "o7", number: 1042, storeId: "s1",
    customerName: "Rafael Nunes", whatsapp: "5586988880007",
    mode: "entrega", status: "cancelado", paymentStatus: "manual", payment: "Pix manual",
    subtotal: 29.9, deliveryFee: 5, total: 34.9,
    items: [{ productId: "p12", name: "Promo Burger + Refri", qty: 1, unitPrice: 29.9, addons: [] }],
    address: { street: "Rua do Sol", number: "10", neighborhood: "Centro" },
    createdAt: hrs(5), cancelledAt: hrs(4),
    cancelReason: "Endereço fora da área de entrega",
    statusHistory: [
      { id: "sh7a", newStatus: "novo", createdAt: hrs(5) },
      { id: "sh7b", previousStatus: "novo", newStatus: "cancelado", note: "Pedido cancelado pelo estabelecimento. Motivo: Endereço fora da área de entrega.", changedByName: "Atendente", createdAt: hrs(4) },
    ],
  },

  // 8. Pix online aprovado — aguardando aceite
  {
    id: "o8", number: 1041, storeId: "s1",
    customerName: "Bianca Melo", whatsapp: "5586988880008",
    mode: "entrega", status: "novo", paymentStatus: "approved", payment: "Pix online",
    subtotal: 55.8, deliveryFee: 5, total: 60.8,
    items: [
      { productId: "p1", name: "Classic Burger", qty: 1, unitPrice: 24.9, addons: [{ id: "a2", name: "Bacon", price: 5 }] },
      { productId: "p7", name: "Batata Frita", qty: 1, unitPrice: 18.9, addons: [] },
      { productId: "p9", name: "Suco Natural", qty: 1, unitPrice: 9.9, addons: [] },
    ],
    address: { street: "Rua Belém", number: "77", neighborhood: "Centro", complement: "Casa" },
    note: "Não tem troco.",
    createdAt: mins(5),
    statusHistory: [
      { id: "sh8a", newStatus: "novo", note: "Pedido criado. Pagamento Pix aprovado.", createdAt: mins(5) },
    ],
  },

  // 9. Dinheiro na entrega — em preparo
  {
    id: "o9", number: 1040, storeId: "s1",
    customerName: "Fernanda Sousa", whatsapp: "5586988880009",
    mode: "entrega", status: "preparo", paymentStatus: "manual", payment: "Dinheiro",
    changeFor: 80,
    subtotal: 49.8, deliveryFee: 5, total: 54.8,
    items: [
      { productId: "p2", name: "Bacon Supreme", qty: 1, unitPrice: 28.9, addons: [] },
      { productId: "p10", name: "Milkshake Chocolate", qty: 1, unitPrice: 16.9, addons: [] },
    ],
    address: { street: "Av. das Palmeiras", number: "210", neighborhood: "Boa Vista" },
    createdAt: mins(55), acceptedAt: mins(50),
    statusHistory: [
      { id: "sh9a", newStatus: "novo", createdAt: mins(55) },
      { id: "sh9b", previousStatus: "novo", newStatus: "aceito", createdAt: mins(50) },
      { id: "sh9c", previousStatus: "aceito", newStatus: "preparo", createdAt: mins(40) },
    ],
  },

  // 10. Consumo no local — mesa — aceito
  {
    id: "o10", number: 1039, storeId: "s1",
    customerName: "Carlos Mendes", whatsapp: "5586988880010",
    mode: "consumo_local", status: "aceito", paymentStatus: "manual", payment: "Cartão na entrega",
    subtotal: 92.6, deliveryFee: 0, total: 92.6, table: "Mesa 7",
    items: [
      { productId: "p2", name: "Bacon Supreme", qty: 2, unitPrice: 28.9, addons: [{ id: "a3", name: "Ovo", price: 3 }], note: "Ponto médio" },
      { productId: "p7", name: "Batata Frita", qty: 2, unitPrice: 18.9, addons: [] },
    ],
    createdAt: mins(25), acceptedAt: mins(20),
    statusHistory: [
      { id: "sh10a", newStatus: "novo", createdAt: mins(25) },
      { id: "sh10b", previousStatus: "novo", newStatus: "aceito", changedByName: "Atendente", createdAt: mins(20) },
    ],
  },
];

// ─── Notificações mockadas ────────────────────────────────────────────────────
export const adminNotifications: AdminNotification[] = [
  { id: "n1", storeId: "s1", orderId: "o1", type: "new_order", title: "Novo pedido recebido!", message: "Pedido #1048 — Mariana Silva — R$ 57,80", read: false, createdAt: mins(2) },
  { id: "n2", storeId: "s1", orderId: "o8", type: "order_paid", title: "Pagamento aprovado", message: "Pix aprovado no pedido #1041 — Bianca Melo", read: false, createdAt: mins(5) },
  { id: "n3", storeId: "s1", orderId: "o7", type: "order_cancelled", title: "Pedido cancelado", message: "Pedido #1042 foi cancelado.", read: true, createdAt: hrs(4) },
];

// ─── Dados de analytics ───────────────────────────────────────────────────────
export const salesLast7Days = [
  { day: "Seg", vendas: 820, pedidos: 18 },
  { day: "Ter", vendas: 940, pedidos: 22 },
  { day: "Qua", vendas: 1120, pedidos: 27 },
  { day: "Qui", vendas: 1380, pedidos: 31 },
  { day: "Sex", vendas: 1980, pedidos: 44 },
  { day: "Sáb", vendas: 2640, pedidos: 58 },
  { day: "Dom", vendas: 2210, pedidos: 49 },
];

export const ordersByMode = [
  { name: "Entrega", value: 58 },
  { name: "Retirada", value: 24 },
  { name: "Consumo local", value: 18 },
];

export const topProducts = [
  { name: "Classic Burger", vendas: 142 },
  { name: "Bacon Supreme", vendas: 121 },
  { name: "Combo Classic", vendas: 98 },
  { name: "Double Cheddar", vendas: 76 },
  { name: "Promo Burger + Refri", vendas: 64 },
];

// ─── Multi-tenant ─────────────────────────────────────────────────────────────
export const tenants: Tenant[] = [
  {
    id: "t1", slug: "burger-prime", name: "Burger Prime",
    description: "Hambúrgueres artesanais, combos e sobremesas feitos com ingredientes selecionados.",
    whatsapp: "5586999999999", city: "Parnaíba", state: "PI", address: "Av. Beira Rio, 123 — Centro",
    open: true, prepTime: "35 a 45 min", minOrder: 20, deliveryFee: 5, hours: "Seg–Dom · 18h às 23h",
    logoLetter: "B", logoUrl: primeBurguerLogo, themeFrom: "#FF6A1F", themeTo: "#FF9A3C", active: true,
    social: { instagram: "@burgerprime" },
  },
  {
    id: "t2", slug: "pizzaria-napoli", name: "Pizzaria Napoli",
    description: "Pizzas artesanais de forno a lenha, massa de fermentação natural.",
    whatsapp: "5586988887777", city: "Teresina", state: "PI", address: "Rua das Oliveiras, 45 — Jóquei",
    open: true, prepTime: "40 a 55 min", minOrder: 30, deliveryFee: 7, hours: "Ter–Dom · 18h às 23h30",
    logoLetter: "N", themeFrom: "#C0392B", themeTo: "#E67E22", active: true, social: { instagram: "@pizzarianapoli" },
  },
  {
    id: "t3", slug: "acai-tropical", name: "Açaí Tropical",
    description: "Açaí cremoso, bowls, sucos naturais e sobremesas geladas.",
    whatsapp: "5586977776666", city: "Luís Correia", state: "PI", address: "Av. da Praia, 880 — Atalaia",
    open: true, prepTime: "20 a 30 min", minOrder: 15, deliveryFee: 4, hours: "Todos os dias · 14h às 22h",
    logoLetter: "A", themeFrom: "#5B2A86", themeTo: "#9B59B6", active: true,
  },
  {
    id: "t4", slug: "cafe-aurora", name: "Café Aurora",
    description: "Cafés especiais, brunch e confeitaria artesanal.",
    whatsapp: "5585966665555", city: "Fortaleza", state: "CE", address: "Rua Barbosa de Freitas, 200",
    open: false, prepTime: "15 a 25 min", minOrder: 18, deliveryFee: 6, hours: "Seg–Sáb · 07h às 19h",
    logoLetter: "A", themeFrom: "#6B4226", themeTo: "#C28B5C", active: true,
  },
];

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

export const getTenantBySlug = (slug: string): Tenant | undefined =>
  tenants.find((t) => t.slug === slug && t.active);

export const isSlugAvailable = (slug: string, ignoreId?: string) =>
  !tenants.some((t) => t.slug === slug && t.id !== ignoreId);

export const platformStores = [
  { id: "s1", name: "Burger Prime", slug: "burger-prime", city: "Parnaíba/PI", status: "ativa", plan: "Pro", ordersMonth: 412, revenue: 18420, createdAt: "2024-11-10" },
  { id: "s2", name: "Pizzaria Forno Real", slug: "forno-real", city: "Teresina/PI", status: "ativa", plan: "Plus", ordersMonth: 638, revenue: 32140, createdAt: "2024-09-02" },
  { id: "s3", name: "Açaí da Praia", slug: "acai-praia", city: "Luís Correia/PI", status: "teste", plan: "Start", ordersMonth: 58, revenue: 1240, createdAt: "2025-04-21" },
  { id: "s4", name: "Café Aurora", slug: "cafe-aurora", city: "Fortaleza/CE", status: "ativa", plan: "Pro", ordersMonth: 287, revenue: 9820, createdAt: "2025-01-14" },
  { id: "s5", name: "Marmita Fit", slug: "marmita-fit", city: "Recife/PE", status: "suspensa", plan: "Start", ordersMonth: 0, revenue: 0, createdAt: "2024-08-30" },
  { id: "s6", name: "Doceria Bella", slug: "doceria-bella", city: "Salvador/BA", status: "ativa", plan: "Pro", ordersMonth: 196, revenue: 7430, createdAt: "2025-02-05" },
];

export const platformGrowth = [
  { mes: "Jan", lojas: 18 }, { mes: "Fev", lojas: 26 }, { mes: "Mar", lojas: 38 },
  { mes: "Abr", lojas: 51 }, { mes: "Mai", lojas: 67 }, { mes: "Jun", lojas: 84 },
];

export const plans = [
  { id: "start", name: "Start", price: 0, features: ["Até 50 produtos", "Catálogo público", "Pedidos via WhatsApp", "Personalização básica"] },
  { id: "pro", name: "Pro", price: 79, features: ["Produtos ilimitados", "Dashboard completo", "Status de pedidos", "Cupons simples", "QR Code para mesas"] },
  { id: "plus", name: "Plus", price: 149, features: ["Login de clientes", "Pagamento online", "WhatsApp automático", "Entregadores", "Integração com PDV"] },
];
