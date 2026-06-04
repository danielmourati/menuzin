import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { brl } from "@/lib/format";
import type { Product } from "@/lib/domain-types";

export function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const unavailable = !product.available;
  return (
    <button
      onClick={onClick}
      disabled={unavailable}
      className="group relative flex w-full flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-[var(--shadow-soft)] transition hover:border-primary/40 hover:shadow-md disabled:opacity-60"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {product.featured && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-foreground shadow-sm">
            Destaque
          </span>
        )}
        {unavailable && (
          <div className="absolute inset-0 grid place-items-center bg-background/60">
            <Badge variant="secondary">Indisponível</Badge>
          </div>
        )}
      </div>

      <div className="relative flex flex-1 flex-col gap-0.5 p-2.5 pr-10">
        <h3 className="line-clamp-1 text-sm font-semibold">{product.name}</h3>
        {product.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
        )}
        <div className="mt-1">
          {product.promoPrice ? (
            <div className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="text-sm font-bold text-primary">{brl(product.promoPrice)}</span>
              <span className="text-[10px] text-muted-foreground line-through">{brl(product.price)}</span>
            </div>
          ) : (
            <span className="text-sm font-bold">{brl(product.price)}</span>
          )}
        </div>

        {!unavailable && (
          <span className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition group-hover:scale-110">
            <Plus className="h-4 w-4" />
          </span>
        )}
      </div>
    </button>
  );
}
