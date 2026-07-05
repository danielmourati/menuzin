import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { brl } from "@/lib/format";
import type { Product } from "@/lib/domain-types";

export function ProductCard({
  product,
  onClick,
  view = "grid",
  tenantSlug,
}: {
  product: Product;
  onClick: () => void;
  view?: "grid" | "list";
  tenantSlug?: string;
}) {
  const unavailable = !product.available;
  const isPizza = product.categoryKind === "pizza";
  const isOferta = product.categoryKind === "oferta";
  const positiveSizePrices = (product.sizes ?? []).map((s) => s.price).filter((n) => n > 0);
  const minSizePrice = positiveSizePrices.length > 0 ? Math.min(...positiveSizePrices) : undefined;
  const displayPrice = isPizza && minSizePrice != null ? minSizePrice : (product.promoPrice ?? product.price);
  const showFromPrefix = isPizza;
  const externalBadges = tenantSlug === "vilaboemia";

  const badges = (
    <>
      {product.bestseller && (
        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white shadow-sm whitespace-nowrap">
          🔥 Mais vendido
        </span>
      )}
      {isOferta && externalBadges && (
        <span className="rounded-full bg-destructive px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-destructive-foreground shadow-sm whitespace-nowrap">
          Oferta
        </span>
      )}
      {product.featured && (
        <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-foreground shadow-sm whitespace-nowrap">
          Destaque
        </span>
      )}
    </>
  );

  const hasAnyBadge = product.bestseller || product.featured || (isOferta && externalBadges);

  if (view === "list") {
    return (
      <button
        onClick={onClick}
        disabled={unavailable}
        className="group relative flex w-full items-stretch gap-3 overflow-hidden rounded-2xl border bg-card p-2 text-left shadow-[var(--shadow-soft)] transition hover:border-primary/40 hover:shadow-md disabled:opacity-60"
      >
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-28 sm:w-28">
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
          {!externalBadges && hasAnyBadge && (
            <div className="absolute right-1 top-1 flex flex-wrap justify-end gap-1">{badges}</div>
          )}
          {unavailable && (
            <div className="absolute inset-0 grid place-items-center bg-background/60">
              <Badge variant="secondary" className="text-[10px]">Indisponível</Badge>
            </div>
          )}
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col justify-center gap-1 py-1 pr-12">
          {externalBadges && hasAnyBadge && (
            <div className="absolute right-12 top-1 flex flex-wrap justify-end gap-1">{badges}</div>
          )}
          <h3 className="line-clamp-2 text-sm font-semibold sm:text-base">{product.name}</h3>
          {product.description && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
          )}
          <div className="mt-0.5">
            {showFromPrefix ? (
              <div className="flex flex-wrap items-baseline gap-x-1">
                <span className="text-[10px] text-muted-foreground">A partir de</span>
                <span className="text-sm font-bold text-primary">{brl(displayPrice)}</span>
              </div>
            ) : product.promoPrice ? (
              <div className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="text-sm font-bold text-primary">{brl(product.promoPrice)}</span>
                <span className="text-[10px] text-muted-foreground line-through">{brl(product.price)}</span>
              </div>
            ) : (
              <span className="text-sm font-bold">{brl(product.price)}</span>
            )}
          </div>

          {!unavailable && (
            <span className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition group-hover:scale-110">
              <Plus className="h-4 w-4" />
            </span>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={unavailable}
      className="group relative flex w-full flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-[var(--shadow-soft)] transition hover:border-primary/40 hover:shadow-md disabled:opacity-60"
    >
      {externalBadges && hasAnyBadge && (
        <div className="pointer-events-none absolute right-1.5 top-1.5 z-10 flex flex-wrap justify-end gap-1">
          {badges}
        </div>
      )}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
        {!externalBadges && hasAnyBadge && (
          <div className="absolute right-1.5 top-1.5 flex flex-wrap justify-end gap-1">{badges}</div>
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
          {showFromPrefix ? (
            <div className="flex flex-wrap items-baseline gap-x-1">
              <span className="text-[10px] text-muted-foreground">A partir de</span>
              <span className="text-sm font-bold text-primary">{brl(displayPrice)}</span>
            </div>
          ) : product.promoPrice ? (
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
