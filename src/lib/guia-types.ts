// Shared types + constants for the Guia Menuzin.
// Data itself lives in the database (guia_slots / guia_categories / guia_sections /
// guia_promo_requests) and is read through src/lib/guia.functions.ts.

export type GuiaSlotKind =
  | "hero"
  | "featured"
  | "top_stores"
  | "banner"
  | "collection"
  | "flash_offer";

export type GuiaSlot = {
  id: string;
  kind: GuiaSlotKind;
  title: string;
  subtitle?: string;
  emoji?: string;
  gradient?: string;
  imageUrl?: string;
  imageFit?: "cover" | "contain";
  href?: string;
  price?: number;
  promoPrice?: number;
  discountPct?: number;
  rating?: number;
  deliveryFee?: number;
  storeName?: string;
  storeLogo?: string;
  storeSlug?: string;
  storeRating?: number;
  storeRatingCount?: number;
  endsAt?: string;
  tenantId?: string;
  productId?: string;
  city?: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
};

export type GuiaCategory = {
  id: string;
  slug: string;
  label: string;
  emoji: string;
  imageUrl?: string;
  imageFit?: "cover" | "contain";
  city?: string;
  active: boolean;
  sortOrder: number;
};

export type GuiaPromoRequestStatus = "pending_payment" | "paid" | "rejected";

export type GuiaPromoRequest = {
  id: string;
  tenantId: string | null;
  tenantName: string;
  slotKind: GuiaSlotKind;
  durationDays: number;
  amount: number;
  status: GuiaPromoRequestStatus;
  productId?: string | null;
  productSlug?: string | null;
  productHref?: string | null;
  pixCode?: string;
  note?: string;
  createdAt: string;
};

export type GuiaSectionId =
  | "categories"
  | "featured"
  | "top_stores"
  | "flash_offer"
  | "banner_1"
  | "collection"
  | "banner_2"
  | "featured_real"
  | "famozin"
  | "publish_cta";

export const DEFAULT_SECTION_ORDER: GuiaSectionId[] = [
  "categories",
  "featured",
  "top_stores",
  "flash_offer",
  "banner_1",
  "collection",
  "banner_2",
  "featured_real",
  "famozin",
  "publish_cta",
];

export const SECTION_LABELS: Record<GuiaSectionId, { title: string; desc: string }> = {
  categories: { title: "Categorias", desc: "grade de categorias do bairro" },
  featured: { title: "Destaques da semana", desc: "carrossel de produtos em destaque" },
  top_stores: { title: "Lojas em alta", desc: "cards de lojas em destaque" },
  flash_offer: { title: "Ofertas relâmpago", desc: "carrossel de ofertas com contagem regressiva" },
  banner_1: { title: "Banner full-width (1)", desc: "primeiro banner grande" },
  collection: { title: "Coleções", desc: "carrossel de coleções de lojas/promos" },
  banner_2: { title: "Banner full-width (2)", desc: "segundo banner grande" },
  featured_real: { title: "Em destaque agora", desc: "produtos reais do banco em destaque" },
  famozin: { title: "Famozin na cidade", desc: "grid das lojas mais conhecidas da cidade" },
  publish_cta: { title: "CTA publique seu cardápio", desc: "chamada para lojistas" },
};

export const SLOT_KIND_LABELS: Record<GuiaSlotKind, string> = {
  hero: "Hero (topo)",
  featured: "Destaque (produto)",
  top_stores: "Loja em alta",
  banner: "Banner full-width",
  collection: "Coleção",
  flash_offer: "Oferta relâmpago",
};

export const SLOT_KIND_PRICES: Record<GuiaSlotKind, Record<7 | 14 | 30, number>> = {
  hero: { 7: 149.9, 14: 249.9, 30: 449.9 },
  featured: { 7: 49.9, 14: 89.9, 30: 149.9 },
  top_stores: { 7: 39.9, 14: 69.9, 30: 119.9 },
  banner: { 7: 199.9, 14: 349.9, 30: 599.9 },
  collection: { 7: 79.9, 14: 139.9, 30: 229.9 },
  flash_offer: { 7: 29.9, 14: 49.9, 30: 79.9 },
};

export type ImageSpec = {
  width: number;
  height: number;
  ratio: string;
  maxKB: number;
  hint: string;
};

export const SLOT_IMAGE_SPECS: Record<GuiaSlotKind | "category", ImageSpec> = {
  hero:        { width: 1600, height: 900, ratio: "16:9", maxKB: 400, hint: "Banner do topo. Deixe o texto principal em pouca área da imagem — o título é sobreposto." },
  featured:    { width: 800,  height: 800, ratio: "1:1",  maxKB: 250, hint: "Foto quadrada do produto. Fundo neutro funciona melhor." },
  top_stores:  { width: 400,  height: 400, ratio: "1:1",  maxKB: 150, hint: "Logo ou ícone da loja. Preferencialmente PNG com fundo transparente." },
  banner:      { width: 1920, height: 640, ratio: "3:1",  maxKB: 500, hint: "Banner full-width. Foco visual à direita; texto vai à esquerda." },
  collection:  { width: 1200, height: 800, ratio: "3:2",  maxKB: 350, hint: "Capa da coleção. Composição em landscape." },
  flash_offer: { width: 800,  height: 600, ratio: "4:3",  maxKB: 250, hint: "Card de oferta relâmpago. Destaque o produto." },
  category:    { width: 200,  height: 200, ratio: "1:1",  maxKB: 80,  hint: "Ícone da categoria. PNG com fundo transparente é ideal." },
};

export const DEFAULT_GRADIENTS = [
  "from-orange-500 via-red-500 to-rose-600",
  "from-purple-600 via-fuchsia-500 to-pink-500",
  "from-emerald-600 via-lime-600 to-amber-500",
  "from-yellow-500 via-amber-600 to-orange-600",
  "from-indigo-700 via-purple-700 to-fuchsia-600",
  "from-cyan-500 via-teal-500 to-emerald-500",
  "from-pink-500 via-rose-500 to-red-500",
  "from-sky-500 via-blue-600 to-indigo-700",
];
