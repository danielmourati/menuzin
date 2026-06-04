import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { brl } from "@/lib/format";
import type { Product } from "@/lib/domain-types";

export function FeaturedScroller({
  products,
  onSelect,
}: {
  products: Product[];
  onSelect: (p: Product) => void;
}) {
  if (products.length === 0) return null;

  return (
    <section className="mt-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Destaques</h2>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 scrollbar-hide">
        <div className="flex snap-x snap-mandatory gap-3 pb-2">
          {products.map((p) => {
            const unavailable = !p.available;
            return (
              <button
                key={p.id}
                onClick={() => !unavailable && onSelect(p)}
                disabled={unavailable}
                className="group relative w-[260px] shrink-0 snap-start overflow-hidden rounded-2xl border bg-card text-left shadow-[var(--shadow-soft)] transition hover:border-primary/40 hover:shadow-md disabled:opacity-60"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground shadow-sm">
                    Destaque
                  </span>
                  {unavailable && (
                    <div className="absolute inset-0 grid place-items-center bg-background/60">
                      <Badge variant="secondary">Indisponível</Badge>
                    </div>
                  )}
                </div>
                <div className="relative p-3 pr-12">
                  <h3 className="line-clamp-1 font-semibold">{p.name}</h3>
                  {p.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                  )}
                  <div className="mt-1.5">
                    {p.promoPrice ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-bold text-primary">{brl(p.promoPrice)}</span>
                        <span className="text-[11px] text-muted-foreground line-through">{brl(p.price)}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold">{brl(p.price)}</span>
                    )}
                  </div>
                  {!unavailable && (
                    <span className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition group-hover:scale-110">
                      <Plus className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
