import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import type { Product, ProductAddon, ProductSize, ProductFlavor, AddonOption } from "./domain-types";

export type CartSelectedGroupOption = AddonOption & { groupName: string };

export type CartItem = {
  uid: string;
  product: Product;
  qty: number;
  /** Adicionais legados (compat). */
  addons: ProductAddon[];
  /** Tamanho selecionado (pizza/produtos com tamanhos). */
  size?: ProductSize;
  /** Sabores selecionados (pizzas). */
  flavors?: ProductFlavor[];
  /** Opções escolhidas em grupos de complementos. */
  groupOptions?: CartSelectedGroupOption[];
  /** Preço base unitário pré-calculado (size + média dos sabores). */
  basePrice?: number;
  note?: string;
};

type CartCtx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "uid">) => void;
  update: (uid: string, qty: number) => void;
  remove: (uid: string) => void;
  clear: () => void;
  subtotal: number;
  count: number;
  activeCouponCode: string | null;
  setActiveCouponCode: (code: string | null) => void;
  clearActiveCoupon: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

/** Calcula o unitário (sem qty) de um item, considerando tamanho, sabores e grupos. */
export function computeUnitPrice(i: Pick<CartItem, "product" | "addons" | "size" | "flavors" | "groupOptions" | "basePrice">): number {
  if (typeof i.basePrice === "number") {
    const addonsSum = (i.addons ?? []).reduce((s, a) => s + a.price, 0);
    const groupSum = (i.groupOptions ?? []).reduce((s, o) => s + o.price, 0);
    return i.basePrice + addonsSum + groupSum;
  }
  const base = i.product.promoPrice ?? i.product.price;
  const addonsSum = (i.addons ?? []).reduce((s, a) => s + a.price, 0);
  const groupSum = (i.groupOptions ?? []).reduce((s, o) => s + o.price, 0);
  return base + addonsSum + groupSum;
}

const RESERVED_FIRST_SEGMENTS = new Set([
  "admin", "platform", "auth", "api", "_serverFn", "loja",
  "pedido-confirmado", "acompanhar", "",
]);

/** Deriva o slug da loja a partir do pathname para escopar o carrinho por tenant. */
function deriveSlugFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  // /loja/<slug>/...
  if (parts[0] === "loja" && parts[1]) return parts[1];
  // /<slug>/...
  if (!RESERVED_FIRST_SEGMENTS.has(parts[0])) return parts[0];
  return null;
}

const TTL_MS = 24 * 60 * 60 * 1000; // 24h
const STORAGE_PREFIX = "menuzin:cart:";
const COUPON_STORAGE_PREFIX = "menuzin:coupon:";

type StoredCart = { items: CartItem[]; ts: number };

function storageKey(slug: string) {
  return `${STORAGE_PREFIX}${slug}`;
}

function couponStorageKey(slug: string) {
  return `${COUPON_STORAGE_PREFIX}${slug}`;
}

function loadCoupon(slug: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(couponStorageKey(slug));
    return raw ? raw.trim().toUpperCase() : null;
  } catch {
    return null;
  }
}

function saveCoupon(slug: string, code: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (!code) {
      window.localStorage.removeItem(couponStorageKey(slug));
    } else {
      window.localStorage.setItem(couponStorageKey(slug), code.trim().toUpperCase());
    }
  } catch {
    /* ignore */
  }
}

function loadCart(slug: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredCart;
    if (!parsed?.items || !Array.isArray(parsed.items)) return [];
    if (Date.now() - (parsed.ts ?? 0) > TTL_MS) {
      window.localStorage.removeItem(storageKey(slug));
      return [];
    }
    return parsed.items;
  } catch {
    return [];
  }
}

function saveCart(slug: string, items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(storageKey(slug));
      return;
    }
    const payload: StoredCart = { items, ts: Date.now() };
    window.localStorage.setItem(storageKey(slug), JSON.stringify(payload));
  } catch {
    /* quota cheio / privado — ignora silenciosamente */
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const slug = deriveSlugFromPath(pathname);
  const [items, setItems] = useState<CartItem[]>([]);
  const [activeCouponCode, setActiveCouponCodeState] = useState<string | null>(null);
  const currentSlugRef = useRef<string | null>(null);

  // Carrega o carrinho e o cupom do slug atual e troca em memória ao mudar de loja.
  useEffect(() => {
    if (!slug) {
      currentSlugRef.current = null;
      setActiveCouponCodeState(null);
      return;
    }
    if (currentSlugRef.current === slug) return;
    currentSlugRef.current = slug;
    setItems(loadCart(slug));
    setActiveCouponCodeState(loadCoupon(slug));
  }, [slug]);

  // Persiste a cada mudança, escopado ao slug atual.
  useEffect(() => {
    if (!slug) return;
    saveCart(slug, items);
  }, [slug, items]);

  const setActiveCouponCode = (code: string | null) => {
    const normalized = code ? code.trim().toUpperCase() : null;
    setActiveCouponCodeState(normalized);
    if (slug) {
      saveCoupon(slug, normalized);
    }
  };

  const clearActiveCoupon = () => {
    setActiveCouponCode(null);
  };

  const value = useMemo<CartCtx>(() => {
    const subtotal = items.reduce((sum, i) => sum + computeUnitPrice(i) * i.qty, 0);
    return {
      items,
      subtotal,
      count: items.reduce((s, i) => s + i.qty, 0),
      add: (item) =>
        setItems((prev) => [
          ...prev,
          { ...item, uid: Math.random().toString(36).slice(2, 9) },
        ]),
      update: (uid, qty) =>
        setItems((prev) =>
          qty <= 0
            ? prev.filter((i) => i.uid !== uid)
            : prev.map((i) => (i.uid === uid ? { ...i, qty } : i)),
        ),
      remove: (uid) => setItems((prev) => prev.filter((i) => i.uid !== uid)),
      clear: () => setItems([]),
      activeCouponCode,
      setActiveCouponCode,
      clearActiveCoupon,
    };
  }, [items, activeCouponCode, slug]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart fora de CartProvider");
  return c;
};
