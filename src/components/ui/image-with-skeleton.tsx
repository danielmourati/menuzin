import { useState, useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

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
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Verifica se a imagem já foi baixada/está em cache na montagem
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [src]);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted/60",
        containerClassName
      )}
    >
      {/* Skeleton Shimmer de carregamento (estilo aiqfome) */}
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
            setIsLoaded(true);
            onLoad?.(e);
          }}
          onError={(e) => {
            setHasError(true);
            onError?.(e);
          }}
          className={cn(
            "h-full w-full transition-opacity duration-300 ease-out",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          {...props}
        />
      )}
    </div>
  );
}
