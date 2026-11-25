import { useState, useRef, useEffect, useLayoutEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Cache em memória das URLs já carregadas nesta sessão para evitar flash/shimmer ao retornar à tela
const MAX_CACHED_IMAGE_URLS = 500;
const loadedImageUrls = new Set<string>();

function rememberLoadedImage(src?: string) {
  if (!src || typeof window === "undefined") return;
  if (loadedImageUrls.size >= MAX_CACHED_IMAGE_URLS) {
    const first = loadedImageUrls.values().next().value;
    if (first !== undefined) loadedImageUrls.delete(first);
  }
  loadedImageUrls.add(src);
}

interface ImageWithSkeletonProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
  fallback?: ReactNode;
  showShimmer?: boolean;
}

export function ImageWithSkeleton({
  src,
  alt = "",
  className,
  containerClassName,
  fallback,
  showShimmer = true,
  loading = "lazy",
  decoding = "async",
  onLoad,
  onError,
  ...props
}: ImageWithSkeletonProps) {
  const alreadyLoaded = Boolean(src && loadedImageUrls.has(src));
  const [isLoaded, setIsLoaded] = useState(alreadyLoaded);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Verifica sincronamente antes da pintura se a imagem já está pronta no cache/SSR
  useIsomorphicLayoutEffect(() => {
    setHasError(false);
    if (src && loadedImageUrls.has(src)) {
      setIsLoaded(true);
      return;
    }
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      rememberLoadedImage(src);
      setIsLoaded(true);
      return;
    }
    setIsLoaded(false);
  }, [src]);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted/60",
        containerClassName
      )}
    >
      {/* Skeleton Shimmer de carregamento (somente enquanto a imagem ainda não terminou de baixar) */}
      {!isLoaded && !hasError && (
        <div
          className={cn(
            "absolute inset-0 z-0 bg-muted/80",
            showShimmer && "animate-shimmer"
          )}
          aria-hidden="true"
        />
      )}

      {/* Fallback caso a imagem dê erro */}
      {hasError ? (
        fallback ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            {fallback}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30 text-muted-foreground/50 text-xs">
            Imagem indisponível
          </div>
        )
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={loading}
          decoding={decoding}
          onLoad={(e) => {
            rememberLoadedImage(src);
            setIsLoaded(true);
            onLoad?.(e);
          }}
          onError={(e) => {
            setHasError(true);
            onError?.(e);
          }}
          className={cn(
            "h-full w-full",
            !alreadyLoaded && "transition-opacity duration-200 ease-out",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          {...props}
        />
      )}
    </div>
  );
}
