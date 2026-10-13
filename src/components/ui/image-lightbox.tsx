import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export function ImageLightbox({
  open,
  onOpenChange,
  src,
  alt,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  src: string | null | undefined;
  alt: string;
}) {
  if (!src) return null;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* React bubbles portal events to the parent tree (e.g. a clickable product card).
            This wrapper stops them so closing the lightbox never opens the product. */}
        <div
          className="contents"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 z-50 w-[96vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          >
            <DialogPrimitive.Title className="sr-only">{alt}</DialogPrimitive.Title>
            <div className="relative">
              <DialogPrimitive.Close
                aria-label="Fechar imagem"
                className="absolute right-2 top-2 z-10 grid h-10 w-10 place-items-center rounded-full bg-background/90 text-foreground shadow-lg ring-1 ring-border"
              >
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
              <img
                src={src}
                alt={alt}
                className="max-h-[90dvh] w-full rounded-xl object-contain"
                decoding="async"
              />
            </div>
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
