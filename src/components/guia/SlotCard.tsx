import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Star, Timer } from "lucide-react";
import { brl } from "@/lib/format";
import type { GuiaSlot } from "@/lib/guia-types";

function formatCountdown(endsAt?: string): string {
  if (!endsAt) return "";
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "encerrada";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function SlotLink({ slot, children }: { slot: GuiaSlot; children: ReactNode }) {
  const cls = "block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl";
  if (slot.productId) {
    return (
      <Link to="/guia/produto/$id" params={{ id: slot.productId }} className={cls}>
        {children}
      </Link>
    );
  }
  if (slot.href) {
    return (
      <a href={slot.href} className={cls}>
        {children}
      </a>
    );
  }
  return <>{children}</>;
}

export function SlotCard({ slot, size = "md" }: { slot: GuiaSlot; size?: "sm" | "md" | "lg" }) {
  const img = slot.imageUrl;
  const fitCls = slot.imageFit === "contain" ? "object-contain" : "object-cover";
  const surface = "bg-muted";

  const content = (() => {
    if (slot.kind === "hero") {
      return (
        <div className={`relative w-full h-[194px] sm:h-[234px] overflow-hidden rounded-2xl ${surface} p-4 text-white shadow-md`}>
          {img && (
            <img src={img} alt="" className={`absolute inset-0 h-full w-full ${fitCls}`} draggable={false} />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
          <div className="relative z-10 max-w-[75%]">
            <p className="text-[13px] font-black uppercase tracking-widest opacity-90">destaque</p>
            <p className="mt-1 text-[21px] font-black leading-tight line-clamp-2 drop-shadow">{slot.title}</p>
            {slot.subtitle && (
              <p className="mt-0.5 text-[16px] font-medium opacity-90 line-clamp-1">{slot.subtitle}</p>
            )}
          </div>
          {slot.storeName && (
            <div className="absolute bottom-2.5 right-2.5 z-10 inline-flex max-w-[85%] items-center gap-1.5 rounded-full bg-black/50 py-0.5 pl-0.5 pr-2.5 backdrop-blur">
              <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-white/40 bg-white/15">
                {slot.storeLogo ? (
                  <img src={slot.storeLogo} alt="" className="h-full w-full object-cover" draggable={false} />
                ) : (
                  <span className="text-[13px] font-black">{slot.storeName.slice(0, 1)}</span>
                )}
              </span>
              <span className="min-w-0 truncate text-[14px] font-bold">{slot.storeName}</span>
              {typeof slot.storeRating === "number" && (
                <span className="inline-flex shrink-0 items-center gap-0.5 text-[13px] font-bold text-amber-400">
                  <Star className="h-3 w-3 fill-current" />
                  {slot.storeRating.toFixed(1).replace(".", ",")}
                </span>
              )}
            </div>
          )}
        </div>
      );
    }

    if (slot.kind === "banner") {
      return (
        <div className={`relative w-full h-[149px] sm:h-[180px] overflow-hidden rounded-2xl ${surface} p-4 text-white shadow-md`}>
          {img && (
            <img src={img} alt="" className={`absolute inset-0 h-full w-full ${fitCls}`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
          <div className="relative z-10">
            <p className="text-lg font-black leading-tight line-clamp-2 drop-shadow">{slot.title}</p>
            {slot.subtitle && (
              <p className="mt-1 text-xs font-medium opacity-95 line-clamp-2">{slot.subtitle}</p>
            )}
          </div>
        </div>
      );
    }

    if (slot.kind === "collection") {
      return (
        <div className={`relative aspect-[3/4] overflow-hidden rounded-xl ${surface} p-4 text-white shadow-md ${size === "sm" ? "w-40" : "w-44"}`}>
          {img && (
            <img src={img} alt="" className={`absolute inset-0 h-full w-full ${fitCls}`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-90">coleção</p>
            <p className="mt-1 text-lg font-black leading-tight drop-shadow">{slot.title}</p>
            {slot.subtitle && <p className="mt-1 text-xs font-medium opacity-95">{slot.subtitle}</p>}
          </div>
        </div>
      );
    }

    if (slot.kind === "featured") {
      return (
        <div className="w-40 shrink-0 text-left">
          <div className={`relative aspect-square overflow-hidden rounded-lg border ${surface} shadow-md`}>
            {img && <img src={img} alt="" className={`absolute inset-0 h-full w-full ${fitCls}`} />}

            {typeof slot.discountPct === "number" && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-center">
                <span className="rounded-md bg-white/95 px-2 py-0.5 text-xs font-black text-red-600">
                  {slot.discountPct}% OFF
                </span>
              </div>
            )}
          </div>
          <p className="mt-2 line-clamp-1 text-sm font-bold">{slot.title}</p>
          {slot.storeName && (
            <p className="line-clamp-1 text-[11px] text-muted-foreground">{slot.storeName}</p>
          )}
          {typeof slot.promoPrice === "number" && (
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-sm font-black text-emerald-600">{brl(slot.promoPrice)}</span>
              {typeof slot.price === "number" && (
                <span className="text-[11px] text-muted-foreground line-through">{brl(slot.price)}</span>
              )}
            </div>
          )}
        </div>
      );
    }

    if (slot.kind === "top_stores") {
      return (
        <div className="flex items-center gap-3 rounded-lg p-2">
          <div className={`grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border ${surface}`}>
            {img && <img src={img} alt="" className={`h-full w-full ${fitCls}`} />}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{slot.title}</p>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              {typeof slot.deliveryFee === "number" && (
                <span className="inline-flex items-center gap-1">
                  🛵 <span className="font-semibold text-foreground">{brl(slot.deliveryFee)}</span>
                </span>
              )}
              {typeof slot.rating === "number" && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    <span className="font-semibold text-foreground">{slot.rating.toFixed(1)}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    // flash_offer
    const countdown = formatCountdown(slot.endsAt);
    return (
      <div className="w-56 shrink-0">
        <div className={`relative overflow-hidden rounded-lg ${surface} p-4 text-white shadow-md`}>
          {img && (
            <img src={img} alt="" className={`absolute inset-0 h-full w-full ${fitCls}`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
          <div className="relative z-10">
            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest opacity-90">
              <Timer className="h-3 w-3" /> {countdown || "oferta relâmpago"}
            </div>
            <p className="mt-1 line-clamp-2 text-base font-black leading-tight">{slot.title}</p>
            {slot.storeName && (
              <p className="mt-1 text-xs font-medium opacity-95">{slot.storeName}</p>
            )}
          </div>
        </div>
      </div>
    );
  })();

  return <SlotLink slot={slot}>{content}</SlotLink>;
}
