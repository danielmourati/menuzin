import { Skeleton } from "@/components/ui/skeleton";

export function StorefrontSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-32 select-none" aria-busy="true" aria-label="Carregando cardápio">
      {/* Imagem de Capa (Cover Photo) */}
      <div
        className="relative w-full h-36 sm:h-44 md:h-52 bg-muted/50 overflow-hidden"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="absolute inset-0 bg-muted/40 animate-shimmer" />

        {/* Botões redondos do cabeçalho (topo esquerdo e direito) */}
        <div className="container mx-auto max-w-3xl px-4 pt-3 flex items-center justify-between relative z-10">
          <Skeleton className="h-10 w-10 rounded-full bg-card/60 backdrop-blur-md shadow-xs border border-border/30" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-full bg-card/60 backdrop-blur-md shadow-xs border border-border/30" />
            <Skeleton className="h-10 w-10 rounded-full bg-card/60 backdrop-blur-md shadow-xs border border-border/30" />
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4">
        {/* Card de informações da loja (estilo aiqfome) */}
        <div className="relative z-10 -mt-8 mb-4">
          <div className="flex w-full flex-col rounded-3xl border border-border/60 bg-card p-4 shadow-sm md:p-5">
            <div className="flex items-center gap-3.5">
              {/* Logo circular */}
              <Skeleton className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-full border border-border/40" />

              {/* Nome + Status */}
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-40 sm:w-52 rounded-lg" />
                <Skeleton className="h-3.5 w-28 rounded-md" />
              </div>
            </div>

            {/* Linha divisória e descrição */}
            <div className="mt-3.5 space-y-2 border-t border-border/40 pt-3">
              <Skeleton className="h-3 w-4/5 rounded-md" />
              <Skeleton className="h-3 w-3/5 rounded-md" />
            </div>

            {/* Badges de Informações (Delivery, Retirada, Tempo) */}
            <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-border/40 pt-2.5">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>

        {/* Barra de busca */}
        <div className="relative mb-4">
          <Skeleton className="h-11 sm:h-12 w-full rounded-2xl border border-border/40 bg-card/80" />
        </div>

        {/* Barra de categorias em formato de pílulas */}
        <div className="mb-5 overflow-hidden">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <Skeleton className="h-9 w-20 shrink-0 rounded-full bg-primary/20" />
            <Skeleton className="h-9 w-28 shrink-0 rounded-full" />
            <Skeleton className="h-9 w-24 shrink-0 rounded-full" />
            <Skeleton className="h-9 w-28 shrink-0 rounded-full" />
            <Skeleton className="h-9 w-22 shrink-0 rounded-full" />
          </div>
        </div>

        {/* Grid de Produtos em 2 Colunas (fiel ao app aiqfome / iFood) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32 rounded-lg" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-2.5 shadow-xs space-y-2.5"
              >
                {/* Espaço da imagem com aspect ratio mantido */}
                <Skeleton className="aspect-[4/3] w-full rounded-xl" />

                {/* Título e descrição do item */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Skeleton className="h-4 w-4/5 rounded-md" />
                  <Skeleton className="h-3 w-full rounded-md" />
                </div>

                {/* Preço e botão de adicionar circular */}
                <div className="flex items-center justify-between pt-1">
                  <Skeleton className="h-4 w-16 rounded-md" />
                  <Skeleton className="h-7 w-7 rounded-full bg-primary/20 shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Barra de Navegação Inferior (Mobile Bottom Nav Skeleton) */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-card/95 backdrop-blur-md px-4 py-2.5 shadow-lg"
        style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto flex max-w-md items-center justify-around gap-3">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-18 rounded-full" />
        </div>
      </div>
    </div>
  );
}
