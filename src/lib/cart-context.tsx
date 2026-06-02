import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

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
    };
  }, [items]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart fora de CartProvider");
  return c;
};
