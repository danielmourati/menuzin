import { Star, Timer } from "lucide-react";
import { brl } from "@/lib/format";
import type { GuiaSlot } from "@/lib/guia-mock";

function formatCountdown(endsAt?: string): string {
  if (!endsAt) return "";
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "encerrada";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export function SlotCard({ slot, size = "md" }: { slot: GuiaSlot; size?: "sm" | "md" | "lg" }) {
  const grad = slot.gradient ?? "from-primary via-primary to-primary/70";
  const emoji = slot.emoji?.trim() || "";
  const img = slot.imageUrl;
  const fitCls = slot.imageFit === "contain" ? "object-contain" : "object-cover";


  if (slot.kind === "hero") {
    return (
      <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${grad} p-5 text-white shadow-md ${size === "sm" ? "h-32" : "h-40"}`}>
        {img && (
          <img src={img} alt="" className={`absolute inset-0 h-full w-full ${fitCls} opacity-90`} />
        )}
        {img && <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />}
        <div className="relative z-10 max-w-[70%]">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-90">destaque</p>
          <p className="mt-1 text-2xl font-black leading-tight">{slot.title}</p>
          {slot.subtitle && (
            <p className="mt-1 text-sm font-medium opacity-95">{slot.subtitle}</p>
          )}
        </div>
        {!img && emoji && (
          <div className="pointer-events-none absolute -right-4 -top-4 select-none text-[9rem] leading-none opacity-30">
            {emoji}
          </div>
        )}

      </div>
    );
  }


  if (slot.kind === "banner") {
    return (
      <div className={`relative overflow-hidden rounded-xl bg-gradient-to-r ${grad} p-6 text-white shadow-md`}>
        {img && (
          <img src={img} alt="" className={`absolute inset-0 h-full w-full ${fitCls} opacity-90`} />
        )}
        {img && <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />}
        <div className="relative z-10">
          <p className="text-2xl font-black leading-tight">{slot.title}</p>
          {slot.subtitle && (
            <p className="mt-1 text-sm font-medium opacity-95">{slot.subtitle}</p>
          )}
        </div>
        {!img && emoji && (
          <div className="pointer-events-none absolute -right-2 top-2 select-none text-[7rem] leading-none opacity-30">
            {emoji}
          </div>
        )}

      </div>
    );
  }

  if (slot.kind === "collection") {
    return (
      <div className={`relative aspect-[3/4] overflow-hidden rounded-xl bg-gradient-to-br ${grad} p-4 text-white shadow-md ${size === "sm" ? "w-40" : "w-44"}`}>
        {img && (
          <img src={img} alt="" className={`absolute inset-0 h-full w-full ${fitCls}`} />
        )}
        {img && <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />}
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-90">coleção</p>
          <p className="mt-1 text-lg font-black leading-tight drop-shadow">{slot.title}</p>
          {slot.subtitle && <p className="mt-1 text-xs font-medium opacity-95">{slot.subtitle}</p>}
        </div>
        {!img && emoji && (
          <div className="pointer-events-none absolute -bottom-4 -right-2 select-none text-[7rem] leading-none opacity-40">
            {emoji}
          </div>
        )}

      </div>
    );
  }


  if (slot.kind === "featured") {
    return (
      <div className="w-40 shrink-0 text-left">
        <div className={`relative aspect-square overflow-hidden rounded-lg bg-gradient-to-br ${grad} shadow-md`}>
          {typeof slot.rating === "number" && (
            <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-lg bg-yellow-400 px-1.5 py-0.5 text-[10px] font-black text-stone-900 shadow">
              <Star className="h-3 w-3 fill-current" /> {slot.rating.toFixed(1)}
            </div>
          )}
          {img ? (
            <img src={img} alt="" className={`absolute inset-0 h-full w-full ${fitCls}`} />
          ) : emoji ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-6xl opacity-90 drop-shadow-lg">
              {emoji}
            </div>
          ) : null}


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
        <div className={`grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br ${grad} text-2xl shadow-inner`}>
          {img ? (
            <img src={img} alt="" className={`h-full w-full ${fitCls}`} />
          ) : emoji ? (
            <span aria-hidden>{emoji}</span>
          ) : null}

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
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${grad} p-4 text-white shadow-md`}>
        {img && (
          <img src={img} alt="" className={`absolute inset-0 h-full w-full ${fitCls} opacity-80`} />
        )}
        {img && <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />}
        <div className="relative z-10">
          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest opacity-90">
            <Timer className="h-3 w-3" /> {countdown || "oferta relâmpago"}
          </div>
          <p className="mt-1 line-clamp-2 text-base font-black leading-tight">{slot.title}</p>
          {slot.storeName && (
            <p className="mt-1 text-xs font-medium opacity-95">{slot.storeName}</p>
          )}
        </div>
        {!img && emoji && (
          <div className="pointer-events-none absolute -right-3 -bottom-3 select-none text-6xl leading-none opacity-30">
            {emoji}
          </div>
        )}

      </div>
    </div>
  );
}

