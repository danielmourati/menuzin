import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { brl } from "@/lib/format";
import type { Product } from "@/lib/mock-data";

export function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const unavailable = !product.available;
  return (
    <button
      onClick={onClick}
      disabled={unavailable}
      className="group flex w-full items-center gap-4 rounded-2xl border bg-card p-3 text-left shadow-[var(--shadow-soft)] transition hover:border-primary/40 hover:shadow-md disabled:opacity-60"
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
        <img src={product.image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
        {product.featured && (
          <span className="absolute left-1 top-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">Destaque</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold">{product.name}</h3>
          {unavailable && <Badge variant="secondary" className="shrink-0">Indisponível</Badge>}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        <div className="mt-2 flex items-center justify-between">
          <div>
            {product.promoPrice ? (
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-primary">{brl(product.promoPrice)}</span>
                <span className="text-xs text-muted-foreground line-through">{brl(product.price)}</span>
              </div>
            ) : (
              <span className="font-bold">{brl(product.price)}</span>
            )}
          </div>
          {!unavailable && (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground transition group-hover:scale-110">
              <Plus className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
