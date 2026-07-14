// Frontend-only mock store for the Guia Menuzin (superadmin managed).
// Persists to localStorage; SSR-safe via useSyncExternalStore.
import { useSyncExternalStore } from "react";

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
  endsAt?: string;
  tenantId?: string;
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
  active: boolean;
  sortOrder: number;
};


export type GuiaPromoRequest = {
  id: string;
  tenantName: string;
  slotKind: GuiaSlotKind;
  durationDays: 7 | 14 | 30;
  amount: number;
  status: "pending_payment" | "paid" | "rejected";
  pixCode?: string;
  createdAt: string;
  note?: string;
};

type State = {
  slots: GuiaSlot[];
  categories: GuiaCategory[];
  requests: GuiaPromoRequest[];
  sectionOrder: GuiaSectionId[];
  sectionActive: Record<GuiaSectionId, boolean>;
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
  publish_cta: { title: "CTA publique seu cardápio", desc: "chamada para lojistas" },
};

const STORAGE_KEY = "menuzin.guia.mock.v1";

const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)) as string;

const SEED_CATEGORIES: GuiaCategory[] = [
  { id: uid(), slug: "quentinha", label: "Quentinhas", emoji: "🍱", active: true, sortOrder: 1 },
  { id: uid(), slug: "pizza", label: "Pizza", emoji: "🍕", active: true, sortOrder: 2 },
  { id: uid(), slug: "churrasco", label: "Churrasco", emoji: "🥩", active: true, sortOrder: 3 },
  { id: uid(), slug: "hamburguer", label: "Hambúrguer", emoji: "🍔", active: true, sortOrder: 4 },
  { id: uid(), slug: "lanches", label: "Lanches", emoji: "🥪", active: true, sortOrder: 5 },
  { id: uid(), slug: "marmitex", label: "Marmitex", emoji: "🍛", active: true, sortOrder: 6 },
  { id: uid(), slug: "acai", label: "Açaí", emoji: "🍨", active: true, sortOrder: 7 },
  { id: uid(), slug: "doces", label: "Doces", emoji: "🍰", active: true, sortOrder: 8 },
];

const now = () => new Date().toISOString();

const SEED_SLOTS: GuiaSlot[] = [
  // Hero carousel
  { id: uid(), kind: "hero", title: "Sextou com 40% OFF", subtitle: "as melhores pizzas do bairro", emoji: "🍕", gradient: "from-orange-500 via-red-500 to-rose-600", active: true, sortOrder: 1, createdAt: now() },
  { id: uid(), kind: "hero", title: "Açaí gelado chegou", subtitle: "combo família por R$29,90", emoji: "🍨", gradient: "from-purple-600 via-fuchsia-500 to-pink-500", active: true, sortOrder: 2, createdAt: now() },
  { id: uid(), kind: "hero", title: "Marmitex do almoço", subtitle: "peça direto pelo WhatsApp", emoji: "🍱", gradient: "from-emerald-600 via-lime-600 to-amber-500", active: true, sortOrder: 3, createdAt: now() },

  // Featured products
  { id: uid(), kind: "featured", title: "Esfiha aberta 8un", storeName: "Ponto da Esfiha", emoji: "🥙", gradient: "from-red-500 via-rose-500 to-orange-500", price: 39.9, promoPrice: 23.94, discountPct: 40, rating: 4.9, active: true, sortOrder: 1, createdAt: now() },
  { id: uid(), kind: "featured", title: "Pizza grande 8 fatias", storeName: "La Massa", emoji: "🍕", gradient: "from-yellow-600 via-amber-600 to-stone-700", price: 55.9, promoPrice: 39.13, discountPct: 30, rating: 4.9, active: true, sortOrder: 2, createdAt: now() },
  { id: uid(), kind: "featured", title: "Espeto misto 6un", storeName: "Maria Espetos", emoji: "🍢", gradient: "from-amber-600 via-orange-700 to-red-800", price: 32, promoPrice: 25.6, discountPct: 20, rating: 4.9, active: true, sortOrder: 3, createdAt: now() },
  { id: uid(), kind: "featured", title: "Combo hambúrguer duplo", storeName: "LAC Lanches", emoji: "🍔", gradient: "from-orange-500 via-red-500 to-rose-600", price: 34.9, promoPrice: 24.43, discountPct: 30, rating: 4.8, active: true, sortOrder: 4, createdAt: now() },
  { id: uid(), kind: "featured", title: "Açaí 700ml completo", storeName: "Ponto BB", emoji: "🍨", gradient: "from-purple-600 via-fuchsia-500 to-pink-500", price: 28, promoPrice: 19.6, discountPct: 30, rating: 4.9, active: true, sortOrder: 5, createdAt: now() },
  { id: uid(), kind: "featured", title: "Marmitex família", storeName: "Casa do Javali", emoji: "🍱", gradient: "from-emerald-600 via-lime-600 to-amber-500", price: 45, promoPrice: 31.5, discountPct: 30, rating: 4.9, active: true, sortOrder: 6, createdAt: now() },

  // Top stores
  { id: uid(), kind: "top_stores", title: "Ponto BB Açaiteria", emoji: "🍨", gradient: "from-purple-500 to-fuchsia-500", deliveryFee: 5.99, rating: 4.9, active: true, sortOrder: 1, createdAt: now() },
  { id: uid(), kind: "top_stores", title: "Pastelão Brothers", emoji: "🥟", gradient: "from-yellow-400 to-orange-500", deliveryFee: 6.5, rating: 4.8, active: true, sortOrder: 2, createdAt: now() },
  { id: uid(), kind: "top_stores", title: "Casa do Javali", emoji: "🍖", gradient: "from-amber-700 to-stone-600", deliveryFee: 7, rating: 4.9, active: true, sortOrder: 3, createdAt: now() },
  { id: uid(), kind: "top_stores", title: "LAC Lanches", emoji: "🍔", gradient: "from-orange-500 to-red-500", deliveryFee: 4.99, rating: 4.7, active: true, sortOrder: 4, createdAt: now() },
  { id: uid(), kind: "top_stores", title: "Ponto da Esfiha PHB", emoji: "🥙", gradient: "from-red-500 to-rose-600", deliveryFee: 4, rating: 4.9, active: true, sortOrder: 5, createdAt: now() },
  { id: uid(), kind: "top_stores", title: "La Massa", emoji: "🍕", gradient: "from-yellow-500 to-amber-700", deliveryFee: 8.99, rating: 4.9, active: true, sortOrder: 6, createdAt: now() },

  // Full banner
  { id: uid(), kind: "banner", title: "CERVEJAS ZERO ÁLCOOL", subtitle: "pra torcer de boa · lojas perto de você", emoji: "🍻", gradient: "from-indigo-700 via-purple-700 to-fuchsia-600", active: true, sortOrder: 1, createdAt: now() },

  // Collections
  { id: uid(), kind: "collection", title: "Torcida com fome", subtitle: "combos até 40% OFF pra ver o jogo", emoji: "⚽", gradient: "from-emerald-600 via-green-600 to-lime-500", active: true, sortOrder: 1, createdAt: now() },
  { id: uid(), kind: "collection", title: "Rangos leves e fresquinhos", subtitle: "com até 35% OFF", emoji: "🥗", gradient: "from-cyan-500 via-teal-500 to-emerald-500", active: true, sortOrder: 2, createdAt: now() },
  { id: uid(), kind: "collection", title: "Quem é Menuzin economiza", subtitle: "seu pedido de R$22 por R$12", emoji: "💸", gradient: "from-fuchsia-600 via-purple-600 to-indigo-600", active: true, sortOrder: 3, createdAt: now() },
  { id: uid(), kind: "collection", title: "Doce e cremoso", subtitle: "sobremesas em até 25% OFF", emoji: "🍰", gradient: "from-pink-500 via-rose-500 to-red-500", active: true, sortOrder: 4, createdAt: now() },

  // Flash offers
  { id: uid(), kind: "flash_offer", title: "Pizza broto grátis na compra da grande", storeName: "La Massa", emoji: "🍕", gradient: "from-red-600 via-orange-500 to-yellow-500", endsAt: new Date(Date.now() + 6 * 3600 * 1000).toISOString(), active: true, sortOrder: 1, createdAt: now() },
  { id: uid(), kind: "flash_offer", title: "Açaí 500ml por R$14,90", storeName: "Ponto BB", emoji: "🍨", gradient: "from-purple-600 to-fuchsia-500", endsAt: new Date(Date.now() + 3 * 3600 * 1000).toISOString(), active: true, sortOrder: 2, createdAt: now() },
  { id: uid(), kind: "flash_offer", title: "Hambúrguer duplo + fritas R$19,90", storeName: "LAC Lanches", emoji: "🍔", gradient: "from-orange-500 to-red-500", endsAt: new Date(Date.now() + 9 * 3600 * 1000).toISOString(), active: true, sortOrder: 3, createdAt: now() },
];

const SEED_REQUESTS: GuiaPromoRequest[] = [
  {
    id: uid(),
    tenantName: "Pastelão Brothers",
    slotKind: "featured",
    durationDays: 7,
    amount: 49.9,
    status: "pending_payment",
    pixCode: "00020126360014BR.GOV.BCB.PIX0114+5586999990000MENUZIN-DEMO-01",
    createdAt: now(),
    note: "Pastel de queijo e presunto em destaque",
  },
];

const DEFAULT_SECTION_ACTIVE: Record<GuiaSectionId, boolean> = DEFAULT_SECTION_ORDER.reduce(
  (acc, id) => ({ ...acc, [id]: true }),
  {} as Record<GuiaSectionId, boolean>,
);

const SEED: State = {
  slots: SEED_SLOTS,
  categories: SEED_CATEGORIES,
  requests: SEED_REQUESTS,
  sectionOrder: DEFAULT_SECTION_ORDER,
  sectionActive: DEFAULT_SECTION_ACTIVE,
};

let state: State = SEED;
let hydrated = false;
const listeners = new Set<() => void>();

function loadFromStorage(): State {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as Partial<State>;
    const storedOrder = parsed.sectionOrder;
    const validOrder = Array.isArray(storedOrder)
      ? [
          ...storedOrder.filter((id): id is GuiaSectionId => DEFAULT_SECTION_ORDER.includes(id as GuiaSectionId)),
          ...DEFAULT_SECTION_ORDER.filter((id) => !storedOrder.includes(id)),
        ]
      : DEFAULT_SECTION_ORDER;
    const storedActive = (parsed.sectionActive ?? {}) as Partial<Record<GuiaSectionId, boolean>>;
    const validActive = DEFAULT_SECTION_ORDER.reduce((acc, id) => {
      acc[id] = typeof storedActive[id] === "boolean" ? (storedActive[id] as boolean) : true;
      return acc;
    }, {} as Record<GuiaSectionId, boolean>);
    return {
      slots: parsed.slots ?? SEED.slots,
      categories: parsed.categories ?? SEED.categories,
      requests: parsed.requests ?? SEED.requests,
      sectionOrder: validOrder,
      sectionActive: validActive,
    };
  } catch {
    return SEED;
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

function hydrateOnce() {
  if (hydrated || typeof window === "undefined") return;
  state = loadFromStorage();
  hydrated = true;
}

function emit() {
  for (const l of listeners) l();
}

function setState(updater: (s: State) => State) {
  hydrateOnce();
  state = updater(state);
  persist();
  emit();
}

// -------- public API --------

function subscribe(listener: () => void) {
  hydrateOnce();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  hydrateOnce();
  return state;
}

function getServerSnapshot() {
  return SEED;
}

export function useGuiaState(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useGuiaSlots(kind?: GuiaSlotKind): GuiaSlot[] {
  const s = useGuiaState();
  const list = kind ? s.slots.filter((x) => x.kind === kind) : s.slots;
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function useGuiaCategories(activeOnly = false): GuiaCategory[] {
  const s = useGuiaState();
  const list = activeOnly ? s.categories.filter((c) => c.active) : s.categories;
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function useGuiaRequests(): GuiaPromoRequest[] {
  const s = useGuiaState();
  return [...s.requests].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function useGuiaSectionOrder(): GuiaSectionId[] {
  const s = useGuiaState();
  return s.sectionOrder;
}

export function useGuiaSectionActive(): Record<GuiaSectionId, boolean> {
  const s = useGuiaState();
  return s.sectionActive;
}

// -------- mutations --------

export const guiaActions = {
  resetSeed() {
    setState(() => ({ ...SEED }));
  },

  // Slots
  createSlot(input: Omit<GuiaSlot, "id" | "createdAt" | "sortOrder"> & { sortOrder?: number }) {
    setState((s) => {
      const kindSlots = s.slots.filter((x) => x.kind === input.kind);
      const nextOrder = input.sortOrder ?? kindSlots.length + 1;
      const slot: GuiaSlot = {
        ...input,
        id: uid(),
        sortOrder: nextOrder,
        createdAt: now(),
      };
      return { ...s, slots: [...s.slots, slot] };
    });
  },
  updateSlot(id: string, patch: Partial<GuiaSlot>) {
    setState((s) => ({
      ...s,
      slots: s.slots.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  },
  deleteSlot(id: string) {
    setState((s) => ({ ...s, slots: s.slots.filter((x) => x.id !== id) }));
  },
  moveSlot(id: string, dir: -1 | 1) {
    setState((s) => {
      const target = s.slots.find((x) => x.id === id);
      if (!target) return s;
      const siblings = s.slots
        .filter((x) => x.kind === target.kind)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = siblings.findIndex((x) => x.id === id);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= siblings.length) return s;
      const swap = siblings[swapIdx];
      const a = target.sortOrder;
      const b = swap.sortOrder;
      return {
        ...s,
        slots: s.slots.map((x) => {
          if (x.id === target.id) return { ...x, sortOrder: b };
          if (x.id === swap.id) return { ...x, sortOrder: a };
          return x;
        }),
      };
    });
  },
  duplicateSlot(id: string) {
    setState((s) => {
      const orig = s.slots.find((x) => x.id === id);
      if (!orig) return s;
      const kindSlots = s.slots.filter((x) => x.kind === orig.kind);
      const copy: GuiaSlot = {
        ...orig,
        id: uid(),
        title: `${orig.title} (cópia)`,
        sortOrder: kindSlots.length + 1,
        createdAt: now(),
      };
      return { ...s, slots: [...s.slots, copy] };
    });
  },

  // Categories
  createCategory(input: Omit<GuiaCategory, "id" | "sortOrder"> & { sortOrder?: number }) {
    setState((s) => {
      const cat: GuiaCategory = {
        ...input,
        id: uid(),
        sortOrder: input.sortOrder ?? s.categories.length + 1,
      };
      return { ...s, categories: [...s.categories, cat] };
    });
  },
  updateCategory(id: string, patch: Partial<GuiaCategory>) {
    setState((s) => ({
      ...s,
      categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  },
  deleteCategory(id: string) {
    setState((s) => ({ ...s, categories: s.categories.filter((c) => c.id !== id) }));
  },
  moveCategory(id: string, dir: -1 | 1) {
    setState((s) => {
      const sorted = [...s.categories].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = sorted.findIndex((x) => x.id === id);
      const swapIdx = idx + dir;
      if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return s;
      const a = sorted[idx];
      const b = sorted[swapIdx];
      return {
        ...s,
        categories: s.categories.map((c) => {
          if (c.id === a.id) return { ...c, sortOrder: b.sortOrder };
          if (c.id === b.id) return { ...c, sortOrder: a.sortOrder };
          return c;
        }),
      };
    });
  },

  // Requests
  createRequest(input: Omit<GuiaPromoRequest, "id" | "createdAt" | "status" | "pixCode"> & { status?: GuiaPromoRequest["status"]; pixCode?: string }) {
    const req: GuiaPromoRequest = {
      ...input,
      id: uid(),
      status: input.status ?? "pending_payment",
      pixCode: input.pixCode ?? `00020126360014BR.GOV.BCB.PIX-DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      createdAt: now(),
    };
    setState((s) => ({ ...s, requests: [...s.requests, req] }));
    return req;
  },
  markRequestPaid(id: string) {
    setState((s) => {
      const req = s.requests.find((r) => r.id === id);
      if (!req) return s;
      // auto-create a slot for the paid highlight
      const kindSlots = s.slots.filter((x) => x.kind === req.slotKind);
      const slot: GuiaSlot = {
        id: uid(),
        kind: req.slotKind,
        title: req.note ?? `Destaque · ${req.tenantName}`,
        subtitle: `Patrocinado · ${req.tenantName}`,
        emoji: "⭐",
        gradient: "from-yellow-400 via-orange-500 to-red-500",
        storeName: req.tenantName,
        active: true,
        sortOrder: kindSlots.length + 1,
        createdAt: now(),
        endsAt: new Date(Date.now() + req.durationDays * 24 * 3600 * 1000).toISOString(),
      };
      return {
        ...s,
        requests: s.requests.map((r) => (r.id === id ? { ...r, status: "paid" } : r)),
        slots: [...s.slots, slot],
      };
    });
  },
  rejectRequest(id: string) {
    setState((s) => ({
      ...s,
      requests: s.requests.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)),
    }));
  },
  deleteRequest(id: string) {
    setState((s) => ({ ...s, requests: s.requests.filter((r) => r.id !== id) }));
  },

  // Section ordering
  setSectionOrder(order: GuiaSectionId[]) {
    setState((s) => {
      const filtered = order.filter((id) => DEFAULT_SECTION_ORDER.includes(id));
      const merged = [...filtered, ...DEFAULT_SECTION_ORDER.filter((id) => !filtered.includes(id))];
      return { ...s, sectionOrder: merged };
    });
  },
  moveSection(id: GuiaSectionId, dir: -1 | 1) {
    setState((s) => {
      const order = [...s.sectionOrder];
      const idx = order.indexOf(id);
      const swap = idx + dir;
      if (idx < 0 || swap < 0 || swap >= order.length) return s;
      [order[idx], order[swap]] = [order[swap], order[idx]];
      return { ...s, sectionOrder: order };
    });
  },
  resetSectionOrder() {
    setState((s) => ({ ...s, sectionOrder: [...DEFAULT_SECTION_ORDER] }));
  },
  setSectionActive(id: GuiaSectionId, active: boolean) {
    setState((s) => ({ ...s, sectionActive: { ...s.sectionActive, [id]: active } }));
  },
  toggleSection(id: GuiaSectionId) {
    setState((s) => ({ ...s, sectionActive: { ...s.sectionActive, [id]: !s.sectionActive[id] } }));
  },
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
