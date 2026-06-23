import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  imageUrl: string;
  ctaLabel: string;
  onCta: () => void;
  onClose: () => void;
};

export function PromoModal({ open, imageUrl, ctaLabel, onCta, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
        >
          <X className="h-5 w-5" />
        </button>
        <img
          src={imageUrl}
          alt="Promoção"
          className="block h-auto w-full object-cover"
          draggable={false}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <div className="bg-card p-4">
          <Button
            type="button"
            onClick={onCta}
            size="lg"
            className="h-14 w-full rounded-2xl text-base font-bold uppercase tracking-wide"
          >
            {ctaLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
