// Tipos DTO compartilhados (do banco para o frontend). Espelham as colunas
// das tabelas e são usados pelas server functions e componentes.

export type DbTenant = {
  id: string;
  slug: string;
  name: string;
  description: string;
  whatsapp: string;
  city: string;
  state: string;
  address: string;
  open: boolean;
  prep_time: string;
  min_order: number;
  delivery_fee: number;
  hours: string;
  hours_schedule: { weekday: number; enabled: boolean; open: string; close: string }[] | null;
  open_mode: "auto" | "open" | "closed";
  accepts_delivery: boolean;
  accepts_takeout: boolean;
  accepts_dinein: boolean;
  delivery_mode: "none" | "single" | "neighborhood";

  logo_url: string | null;
  logo_letter: string;
  theme_from: string;
  theme_to: string;
  plan: string;
  status: "ativa" | "teste" | "suspensa";
  social: Record<string, string>;
  active: boolean;
};


export type DbCategory = {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  sort_order: number;
  active: boolean;
  kind: "standard" | "pizza" | "oferta";
};

export type DbCategoryPizzaSize = {
  id: string;
  category_id: string;
  name: string;
  pieces: number;
  max_flavors: number;
  pdv_code: string | null;
  active: boolean;
  sort_order: number;
};

export type DbCategoryPizzaDough = {
  id: string;
  category_id: string;
  name: string;
  extra_price: number;
  pdv_code: string | null;
  active: boolean;
  sort_order: number;
};

export type DbCategoryPizzaCrust = {
  id: string;
  category_id: string;
  name: string;
  extra_price: number;
  pdv_code: string | null;
  active: boolean;
  sort_order: number;
};

export type DbAddon = {
  id: string;
  product_id: string;
  name: string;
  price: number;
};

export type DbProductSize = {
  id: string;
  product_id: string;
  name: string;
  price: number;
  sort_order: number;
  category_size_id: string | null;
};

export type DbProductFlavor = {
  id: string;
  product_id: string;
  name: string;
  description: string;
  price_delta: number;
  available: boolean;
  sort_order: number;
};

export type DbAddonOption = {
  id: string;
  group_id: string;
  name: string;
  price: number;
  active: boolean;
  sort_order: number;
};

export type AddonGroupKind = "adicional" | "observacao";

export type DbAddonGroup = {
  id: string;
  tenant_id: string;
  name: string;
  kind: AddonGroupKind;
  required: boolean;
  min_select: number;
  max_select: number;
  active: boolean;
  sort_order: number;
  options: DbAddonOption[];
};

export type DbAddonGroupTarget = {
  id: string;
  group_id: string;
  category_id: string | null;
  product_id: string | null;
};

export type DbProduct = {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  description: string;
  price: number;
  promo_price: number | null;
  image_url: string | null;
  available: boolean;
  featured: boolean;
  prep_time: string | null;
  sort_order: number;
  type: "standard" | "pizza";
  max_flavors: number | null;
  allow_observations: boolean;
  free_gift_kind: "crust" | "product" | null;
  free_gift_ref_id: string | null;
  free_crust_mode?: "none" | "fixed" | "customer_choice" | null;
  // Oferta do Dia (snapshot)
  offer_original_price?: number | null;
  offer_fixed_size_id?: string | null;
  offer_fixed_crust_id?: string | null;
  offer_included_product_id?: string | null;
  offer_fixed_flavor_ids?: string[] | null;
  offer_pieces?: number | null;
  offer_max_flavors?: number | null;
  addons: DbAddon[];
  sizes?: DbProductSize[];
  flavors?: DbProductFlavor[];
  addonGroups?: DbAddonGroup[];
  // legacy compat
  category?: string;
};

export type OrderStatus =
  | "novo" | "aceito" | "preparo" | "saiu_entrega"
  | "pronto_retirada" | "servido" | "finalizado" | "cancelado";

export type PaymentStatus = "pending" | "approved" | "rejected" | "refunded" | "manual";
export type OrderMode = "entrega" | "retirada" | "consumo_local";

export type DbOrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  name_snapshot: string;
  qty: number;
  unit_price: number;
  addons: { name: string; price: number }[];
  note: string | null;
};

export type DbOrder = {
  id: string;
  tenant_id: string;
  number: number;
  customer_name: string;
  whatsapp: string;
  mode: OrderMode;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_label: string;
  change_for: number | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  address: Record<string, string> | null;
  table_label: string | null;
  pickup_time: string | null;
  note: string | null;
  cancel_reason: string | null;
  accepted_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  created_at: string;
  items: DbOrderItem[];
};

export type DbHistoryRow = {
  id: string;
  previous_status: string | null;
  new_status: string;
  note: string | null;
  changed_by_name: string | null;
  created_at: string;
};
