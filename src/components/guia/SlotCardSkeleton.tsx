import { Skeleton } from "@/components/ui/skeleton";

export function SlotCardSkeleton({ kind = "hero" }: { kind?: "hero" | "banner" | "collection" | "featured" | "top_stores" | "flash_offer" }) {
  if (kind === "hero") {
    return (
      <div className="relative w-full h-[194px] sm:h-[234px] overflow-hidden rounded-2xl bg-muted/60 p-4 shadow-md flex flex-col justify-between">
        <div className="max-w-[75%] space-y-2">
          <Skeleton className="h-3 w-20 rounded-md bg-white/20" />
          <Skeleton className="h-7 w-56 rounded-xl bg-white/20" />
          <Skeleton className="h-4 w-40 rounded-lg bg-white/20" />
        </div>
        <div className="self-end flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 backdrop-blur">
          <Skeleton className="h-7 w-7 rounded-full bg-white/30" />
          <Skeleton className="h-4 w-28 rounded-md bg-white/30" />
        </div>
      </div>
    );
  }

  if (kind === "banner") {
    return (
      <div className="relative w-full h-[149px] sm:h-[180px] overflow-hidden rounded-2xl bg-muted/60 p-4 shadow-md space-y-2">
        <Skeleton className="h-6 w-3/4 rounded-xl bg-white/20" />
        <Skeleton className="h-4 w-1/2 rounded-lg bg-white/20" />
      </div>
    );
  }

  if (kind === "featured") {
    return (
      <div className="w-40 shrink-0 text-left space-y-2">
        <Skeleton className="aspect-square w-full rounded-lg" />
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-3 w-1/2 rounded-md" />
        <Skeleton className="h-4 w-16 rounded-md" />
      </div>
    );
  }

  if (kind === "top_stores") {
    return (
      <div className="flex items-center gap-3 rounded-lg p-2">
        <Skeleton className="h-14 w-14 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4 rounded-md" />
          <Skeleton className="h-3 w-1/2 rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-56 shrink-0 space-y-2">
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
}
