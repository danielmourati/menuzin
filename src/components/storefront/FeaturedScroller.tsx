import { Badge } from "@/components/ui/badge";
import { Plus, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { brl } from "@/lib/format";
import type { Product } from "@/lib/domain-types";

export function FeaturedScroller({
  products,
  onSelect,
  title = "Destaques",
  badgeLabel = "Destaque",
  badgeClassName = "bg-primary text-primary-foreground",
  viewAllTo,
  viewAllParams,
}: {
  products: Product[];
  onSelect: (p: Product) => void;
  title?: string;
  badgeLabel?: string;
  badgeClassName?: string;
  viewAllTo?: string;
  viewAllParams?: Record<string, string>;
}) {
  if (products.length === 0) return null;

  return (
    <section className="mt-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        {viewAllTo && (
          <Link
            to={viewAllTo as never}
            params={viewAllParams as never}
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-muted-foreground hover:text-primary"
          >
            Ver todos <ChevronRight className="h-3.5 w-3.5" />
          </Link>

        )}
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
                className="group relative w-[180px] shrink-0 snap-start overflow-hidden rounded-2xl border bg-card text-left shadow-[var(--shadow-soft)] transition hover:border-primary/40 hover:shadow-md disabled:opacity-60"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                  <span className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide shadow-sm ${badgeClassName}`}>
                    {badgeLabel}
                  </span>
                  {unavailable && (
                    <div className="absolute inset-0 grid place-items-center bg-background/60">
                      <Badge variant="secondary">Indisponível</Badge>
                    </div>
                  )}
                </div>
                <div className="relative p-2.5 pr-10">
                  <h3 className="line-clamp-1 text-sm font-semibold">{p.name}</h3>
                  {p.description && (
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{p.description}</p>
                  )}
                  <div className="mt-1">
                    {p.promoPrice ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-bold text-primary">{brl(p.promoPrice)}</span>
                        <span className="text-[10px] text-muted-foreground line-through">{brl(p.price)}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold">{brl(p.price)}</span>
                    )}
                  </div>
                  {!unavailable && (
                    <span className="absolute bottom-2.5 right-2.5 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition group-hover:scale-110">
                      <Plus className="h-3.5 w-3.5" />
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
