import { useMemo } from "react";
import { useParams } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { brl } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import type { Product, Category } from "@/lib/domain-types";
import { dbProductToUi, dbCategoriesToUi } from "@/lib/db-adapters";
import { productImage, isDefaultProductImage } from "@/lib/product-image";

const DRINK_REGEX = /(bebida|refri|refrigerante|suco|cerveja|drink|água|agua)/i;

export function UpsellSuggestions() {
  const { slug } = useParams({ strict: false }) as { slug?: string };
  const qc = useQueryClient();
  const { items, add } = useCart();

  const data = qc.getQueryData<{
    products?: Product[];
    categories?: Category[];
    rawProducts?: unknown[];
    rawCategories?: unknown[];
  }>(["catalog", slug]);

  const suggestions = useMemo(() => {
    if (!data?.products || !data.categories) return [] as Product[];
    const drinkCatIds = new Set(
      data.categories.filter((c) => DRINK_REGEX.test(c.name)).map((c) => c.id),
    );
    if (drinkCatIds.size === 0) return [];
    const hasDrink = items.some((i) => i.product.categoryId && drinkCatIds.has(i.product.categoryId));
    if (hasDrink) return [];
    return data.products
      .filter((p) => p.available && p.categoryId && drinkCatIds.has(p.categoryId))
      .slice(0, 4);
  }, [data, items]);

  if (suggestions.length === 0) return null;

  return (
    <div className="border-b bg-accent/30 px-4 py-4">
      <p className="mb-2 text-sm font-bold">🥤 Que tal uma bebida?</p>
      <p className="mb-3 text-xs text-muted-foreground">Adicione algo para acompanhar seu pedido.</p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {suggestions.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              add({ product: p, qty: 1, addons: [], basePrice: p.promoPrice ?? p.price });
            }}
            className="group flex w-32 shrink-0 flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm transition hover:border-primary/40"
          >
            <div className="aspect-square w-full bg-muted">
              <img src={p.image} alt={p.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
            </div>
            <div className="flex flex-col gap-1 p-2">
              <p className="line-clamp-2 text-xs font-medium leading-tight">{p.name}</p>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-primary">{brl(p.promoPrice ?? p.price)}</span>
                <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Plus className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
