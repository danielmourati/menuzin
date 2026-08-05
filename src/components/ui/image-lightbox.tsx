import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-3xl border-0 bg-transparent p-0 shadow-none [&>button]:hidden">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <div className="relative">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar imagem"
            className="absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-background/90 text-foreground shadow-lg ring-1 ring-border"
          >
            <X className="h-4 w-4" />
          </button>
          <img
            src={src}
            alt={alt}
            className="max-h-[90dvh] w-full rounded-xl object-contain"
            decoding="async"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
