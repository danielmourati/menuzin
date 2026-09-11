import { Skeleton } from "@/components/ui/skeleton";

export function StorefrontSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Imagem de Capa (Cover Photo) */}
      <div className="relative w-full h-40 md:h-56 bg-muted/60 overflow-hidden">
        <Skeleton className="h-full w-full rounded-none" />

        {/* Botões do cabeçalho */}
        <div className="container mx-auto max-w-3xl px-4 pt-4 flex items-center justify-between relative z-10">
          <Skeleton className="h-9 w-9 rounded-full bg-white/30 backdrop-blur" />
          <Skeleton className="h-9 w-9 rounded-full bg-white/30 backdrop-blur" />
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4">
        {/* Card de informações da loja */}
        <div className="relative z-10 -mt-6 mb-4">
          <div className="flex w-full flex-col rounded-2xl border bg-card p-3 shadow-[var(--shadow-soft)] md:p-4">
            <div className="flex items-center gap-3">
              {/* Logo */}
              <Skeleton className="h-14 w-14 shrink-0 rounded-full md:h-16 md:w-16" />

              {/* Nome + Status + Rating */}
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-5 w-40 rounded-lg" />
                  <Skeleton className="h-4 w-10 rounded-md" />
                </div>
                <Skeleton className="h-3.5 w-24 rounded-md" />
              </div>
            </div>

            {/* Descrição */}
            <div className="mt-3 space-y-1.5 border-t pt-2.5">
              <Skeleton className="h-3 w-3/4 rounded-md" />
              <Skeleton className="h-3 w-1/2 rounded-md" />
            </div>

            {/* Badges de Informações */}
            <div className="mt-3 flex items-center gap-4 border-t pt-2">
              <Skeleton className="h-3.5 w-20 rounded-md" />
              <Skeleton className="h-3.5 w-16 rounded-md" />
              <Skeleton className="h-3.5 w-24 rounded-md" />
            </div>
          </div>
        </div>

        {/* Barra de busca */}
        <div className="relative mb-4">
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>

        {/* Carrossel de Mais Vendidos */}
        <div className="my-6 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32 rounded-lg" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="w-56 shrink-0 rounded-2xl border bg-card p-3 shadow-sm space-y-2.5">
                <Skeleton className="aspect-[16/10] w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-3 w-full rounded-md" />
                <div className="flex items-center justify-between pt-1">
                  <Skeleton className="h-4 w-16 rounded-md" />
                  <Skeleton className="h-7 w-7 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Barra sticky de categorias */}
        <div className="sticky top-0 z-30 -mx-4 mt-4 border-b bg-background/95 px-4 py-2 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-2 overflow-x-auto scrollbar-hide">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          </div>
        </div>

        {/* Lista de Produtos agrupados */}
        <div className="mt-6 space-y-8">
          {Array.from({ length: 2 }).map((_, sectionIdx) => (
            <div key={sectionIdx} className="space-y-4">
              <Skeleton className="h-6 w-36 rounded-lg" />
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, itemIdx) => (
                  <div key={itemIdx} className="flex items-center gap-3.5 rounded-2xl border bg-card p-3 shadow-sm">
                    <Skeleton className="h-20 w-20 shrink-0 rounded-xl md:h-24 md:w-24" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4.5 w-3/4 rounded-md" />
                      <Skeleton className="h-3 w-full rounded-md" />
                      <Skeleton className="h-3 w-2/3 rounded-md" />
                      <div className="flex items-center justify-between pt-1">
                        <Skeleton className="h-4 w-16 rounded-md" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
