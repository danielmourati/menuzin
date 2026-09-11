import { Skeleton } from "@/components/ui/skeleton";
import { SlotCardSkeleton } from "@/components/guia/SlotCardSkeleton";

export function GuiaHomeSkeleton() {
  return (
    <div className="flex h-dvh flex-col bg-muted/30">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 pb-2 pt-3">
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
              <div className="min-w-0 space-y-1">
                <Skeleton className="h-4 w-36 rounded-md" />
                <Skeleton className="h-3 w-48 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          </div>

          {/* Search bar */}
          <Skeleton className="mt-3 h-10 w-full rounded-2xl" />

          {/* Verticals */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-32 shrink-0 rounded-2xl" />
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-8 px-4 py-5">
          {/* Hero Carousel */}
          <SlotCardSkeleton kind="hero" />

          {/* Categories Horizontal Scroller */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Skeleton className="h-5 w-28 rounded-md" />
              <Skeleton className="h-3 w-44 rounded-md" />
            </div>
            <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex w-20 shrink-0 flex-col items-center gap-2 text-center">
                  <Skeleton className="h-14 w-14 rounded-2xl" />
                  <Skeleton className="h-3 w-16 rounded-md" />
                </div>
              ))}
            </div>
          </div>

          {/* Featured Slots Row */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-40 rounded-md" />
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
              {Array.from({ length: 4 }).map((_, i) => (
                <SlotCardSkeleton key={i} kind="featured" />
              ))}
            </div>
          </div>

          {/* Top Stores Section */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-48 rounded-md" />
            <div className="grid grid-cols-1 gap-3 rounded-xl bg-card p-3 shadow-sm sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SlotCardSkeleton key={i} kind="top_stores" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function GuiaCitySkeleton() {
  return <GuiaHomeSkeleton />;
}
