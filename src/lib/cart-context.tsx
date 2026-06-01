import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Product, ProductAddon } from "./domain-types";

export type CartItem = {
  uid: string;
  product: Product;
  qty: number;
  addons: ProductAddon[];
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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const value = useMemo<CartCtx>(() => {
    const subtotal = items.reduce((sum, i) => {
      const base = i.product.promoPrice ?? i.product.price;
      const ad = i.addons.reduce((s, a) => s + a.price, 0);
      return sum + (base + ad) * i.qty;
    }, 0);
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
