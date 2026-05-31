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
  | "confirmado"
  | "preparo"
  | "saiu_entrega"
  | "pronto_retirada"
  | "finalizado"
  | "cancelado";

export type OrderMode = "entrega" | "retirada" | "consumo_local";

export type OrderItem = {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  addons: ProductAddon[];
  note?: string;
};

export type Order = {
  id: string;
  number: number;
  customerName: string;
  whatsapp: string;
  mode: OrderMode;
  status: OrderStatus;
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
  themeFrom: string; // CSS color (oklch / hex)
  themeTo: string;
  active: boolean;
  social?: { instagram?: string; facebook?: string };
};

export const store = {
  name: "Burger Prime",
  slug: "burger-prime",
  description:
    "Hambúrgueres artesanais, combos e sobremesas feitos com ingredientes selecionados.",
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
    id: "p1",
    name: "Classic Burger",
    category: "Hambúrgueres",
    description: "Pão brioche, blend 160g, queijo cheddar, alface e tomate.",
    price: 24.9,
    image: img("1568901346375-23c9450c58cd"),
    available: true,
    featured: true,
    prepTime: "25 min",
    addons: baseAddons,
  },
  {
    id: "p2",
    name: "Bacon Supreme",
    category: "Hambúrgueres",
    description: "Blend 180g, bacon crocante, cheddar duplo e cebola caramelizada.",
    price: 32.9,
    promoPrice: 28.9,
    image: img("1553979459-d2229ba7433b"),
    available: true,
    featured: true,
    addons: baseAddons,
  },
  {
    id: "p3",
    name: "Double Cheddar",
    category: "Hambúrgueres",
    description: "Dois blends 120g, cheddar cremoso, picles e maionese da casa.",
    price: 34.9,
    image: img("1551782450-a2132b4ba21d"),
    available: true,
    featured: false,
    addons: baseAddons,
  },
  {
    id: "p4",
    name: "Chicken Crispy",
    category: "Hambúrgueres",
    description: "Filé de frango empanado crocante, alface e molho especial.",
    price: 27.9,
    image: img("1606755962773-d324e0a13086"),
    available: false,
    featured: false,
    addons: baseAddons,
  },
  {
    id: "p5",
    name: "Combo Classic",
    category: "Combos",
    description: "Classic Burger + batata frita + refrigerante lata.",
    price: 39.9,
    image: img("1571091718767-18b5b1457add"),
    available: true,
    featured: true,
  },
  {
    id: "p6",
    name: "Combo Família",
    category: "Combos",
    description: "4 hambúrgueres, 2 batatas grandes e 2 refrigerantes 1L.",
    price: 119.9,
    image: img("1586816001966-79b736744398"),
    available: true,
    featured: false,
  },
  {
    id: "p7",
    name: "Batata Frita",
    category: "Combos",
    description: "Porção generosa de batata frita crocante com sal e ervas.",
    price: 18.9,
    image: img("1576107232684-1279f390859f"),
    available: true,
    featured: false,
  },
  {
    id: "p8",
    name: "Refrigerante Lata",
    category: "Bebidas",
    description: "Lata 350ml gelada. Coca-Cola, Guaraná ou Sprite.",
    price: 6.5,
    image: img("1622483767028-3f66f32aef97"),
    available: true,
    featured: false,
  },
  {
    id: "p9",
    name: "Suco Natural",
    category: "Bebidas",
    description: "500ml. Laranja, maracujá, abacaxi com hortelã ou limão.",
    price: 9.9,
    image: img("1600271886742-f049cd451bba"),
    available: true,
    featured: false,
  },
  {
    id: "p10",
    name: "Milkshake Chocolate",
    category: "Sobremesas",
    description: "Milkshake cremoso de chocolate com calda e chantilly.",
    price: 16.9,
    image: img("1572490122747-3968b75cc699"),
    available: true,
    featured: true,
  },
  {
    id: "p11",
    name: "Brownie",
    category: "Sobremesas",
    description: "Brownie quentinho com sorvete de creme e calda quente.",
    price: 14.9,
    image: img("1606313564200-e75d5e30476c"),
    available: true,
    featured: false,
  },
  {
    id: "p12",
    name: "Promo Burger + Refri",
    category: "Promoções",
    description: "Classic Burger + refrigerante lata por preço promocional.",
    price: 34.9,
    promoPrice: 29.9,
    image: img("1586190848861-99aa4a171e90"),
    available: true,
    featured: true,
  },
];


export const orders: Order[] = [
  {
    id: "o1", number: 1042, customerName: "Marina Souza", whatsapp: "5586988880001",
    mode: "entrega", status: "novo", payment: "Pix", subtotal: 58.8, deliveryFee: 5, total: 63.8,
    items: [
      { productId: "p2", name: "Bacon Supreme", qty: 1, unitPrice: 28.9, addons: [{ id: "a2", name: "Bacon", price: 5 }] },
      { productId: "p8", name: "Refrigerante Lata", qty: 1, unitPrice: 6.5, addons: [] },
    ],
    address: { street: "Rua das Flores", number: "120", neighborhood: "Centro" },
    createdAt: new Date().toISOString(),
  },
  {
    id: "o2", number: 1041, customerName: "João Pereira", whatsapp: "5586988880002",
    mode: "retirada", status: "confirmado", payment: "Dinheiro", changeFor: 50,
    subtotal: 39.9, deliveryFee: 0, total: 39.9,
    items: [{ productId: "p5", name: "Combo Classic", qty: 1, unitPrice: 39.9, addons: [] }],
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: "o3", number: 1040, customerName: "Lucas Lima", whatsapp: "5586988880003",
    mode: "entrega", status: "preparo", payment: "Cartão de crédito na entrega",
    subtotal: 119.9, deliveryFee: 5, total: 124.9,
    items: [{ productId: "p6", name: "Combo Família", qty: 1, unitPrice: 119.9, addons: [] }],
    address: { street: "Av. Brasil", number: "55", neighborhood: "São José" },
    createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
  },
  {
    id: "o4", number: 1039, customerName: "Ana Costa", whatsapp: "5586988880004",
    mode: "entrega", status: "saiu_entrega", payment: "Pix",
    subtotal: 49.8, deliveryFee: 5, total: 54.8,
    items: [
      { productId: "p1", name: "Classic Burger", qty: 2, unitPrice: 24.9, addons: [] },
    ],
    address: { street: "Rua Nova", number: "300", neighborhood: "Pirajá" },
    createdAt: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
  },
  {
    id: "o5", number: 1038, customerName: "Pedro Alves", whatsapp: "5586988880005",
    mode: "retirada", status: "pronto_retirada", payment: "Pix",
    subtotal: 27.9, deliveryFee: 0, total: 27.9,
    items: [{ productId: "p4", name: "Chicken Crispy", qty: 1, unitPrice: 27.9, addons: [] }],
    createdAt: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
  },
  {
    id: "o6", number: 1037, customerName: "Camila Reis", whatsapp: "5586988880006",
    mode: "consumo_local", status: "finalizado", payment: "Cartão de débito na entrega",
    subtotal: 65.7, deliveryFee: 0, total: 65.7, table: "Mesa 4",
    items: [
      { productId: "p3", name: "Double Cheddar", qty: 1, unitPrice: 34.9, addons: [] },
      { productId: "p10", name: "Milkshake Chocolate", qty: 1, unitPrice: 16.9, addons: [] },
      { productId: "p8", name: "Refrigerante Lata", qty: 2, unitPrice: 6.5, addons: [] },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "o7", number: 1036, customerName: "Rafael Nunes", whatsapp: "5586988880007",
    mode: "entrega", status: "finalizado", payment: "Pix",
    subtotal: 29.9, deliveryFee: 5, total: 34.9,
    items: [{ productId: "p12", name: "Promo Burger + Refri", qty: 1, unitPrice: 29.9, addons: [] }],
    address: { street: "Rua do Sol", number: "10", neighborhood: "Centro" },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "o8", number: 1035, customerName: "Bianca Melo", whatsapp: "5586988880008",
    mode: "entrega", status: "cancelado", payment: "Dinheiro",
    subtotal: 24.9, deliveryFee: 5, total: 29.9,
    items: [{ productId: "p1", name: "Classic Burger", qty: 1, unitPrice: 24.9, addons: [] }],
    address: { street: "Rua Belém", number: "77", neighborhood: "Centro" },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
];

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

export const platformStores = [
  { id: "s1", name: "Burger Prime", slug: "burger-prime", city: "Parnaíba/PI", status: "ativa", plan: "Pro", ordersMonth: 412, revenue: 18420, createdAt: "2024-11-10" },
  { id: "s2", name: "Pizzaria Forno Real", slug: "forno-real", city: "Teresina/PI", status: "ativa", plan: "Plus", ordersMonth: 638, revenue: 32140, createdAt: "2024-09-02" },
  { id: "s3", name: "Açaí da Praia", slug: "acai-praia", city: "Luís Correia/PI", status: "teste", plan: "Start", ordersMonth: 58, revenue: 1240, createdAt: "2025-04-21" },
  { id: "s4", name: "Café Aurora", slug: "cafe-aurora", city: "Fortaleza/CE", status: "ativa", plan: "Pro", ordersMonth: 287, revenue: 9820, createdAt: "2025-01-14" },
  { id: "s5", name: "Marmita Fit", slug: "marmita-fit", city: "Recife/PE", status: "suspensa", plan: "Start", ordersMonth: 0, revenue: 0, createdAt: "2024-08-30" },
  { id: "s6", name: "Doceria Bella", slug: "doceria-bella", city: "Salvador/BA", status: "ativa", plan: "Pro", ordersMonth: 196, revenue: 7430, createdAt: "2025-02-05" },
];

export const platformGrowth = [
  { mes: "Jan", lojas: 18 },
  { mes: "Fev", lojas: 26 },
  { mes: "Mar", lojas: 38 },
  { mes: "Abr", lojas: 51 },
  { mes: "Mai", lojas: 67 },
  { mes: "Jun", lojas: 84 },
];

export const plans = [
  { id: "start", name: "Start", price: 0, features: ["Até 50 produtos", "Catálogo público", "Pedidos via WhatsApp", "Personalização básica"] },
  { id: "pro", name: "Pro", price: 79, features: ["Produtos ilimitados", "Dashboard completo", "Status de pedidos", "Cupons simples", "QR Code para mesas"] },
  { id: "plus", name: "Plus", price: 149, features: ["Login de clientes", "Pagamento online", "WhatsApp automático", "Entregadores", "Integração com PDV"] },
];
