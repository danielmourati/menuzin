import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Minus, Plus, ArrowLeft } from "lucide-react";
import { brl } from "@/lib/format";
import type { Product, ProductAddon } from "@/lib/domain-types";
import { useCart } from "@/lib/cart-context";
import { toast } from "sonner";


export function ProductModal({
  product, open, onOpenChange,
}: { product: Product | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<ProductAddon[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) { setQty(1); setSelected([]); setNote(""); }
  }, [open, product?.id]);

  if (!product) return null;
  const base = product.promoPrice ?? product.price;
  const addonSum = selected.reduce((s, a) => s + a.price, 0);
  const total = (base + addonSum) * qty;

  const toggle = (a: ProductAddon) =>
    setSelected((p) => (p.find((x) => x.id === a.id) ? p.filter((x) => x.id !== a.id) : [...p, a]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[100dvh] max-h-none w-full flex-col gap-0 overflow-hidden rounded-none border-0 bg-card p-0 sm:h-[90vh] sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl [&>button]:hidden"
      >
        <DialogTitle className="sr-only">{product.name}</DialogTitle>

        {/* Image area with floating back */}
        <div className="relative shrink-0 bg-card pt-4">
          <Button
            size="icon"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="absolute left-3 top-3 z-10 h-10 w-10 rounded-xl bg-card text-primary shadow-md hover:bg-card"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="mx-auto aspect-[4/3] w-full max-w-md overflow-hidden">
            <img src={product.image} alt={product.name} className="h-full w-full object-contain" />
          </div>
        </div>

        {/* Content scroll */}
        <div className="flex-1 overflow-y-auto bg-card px-5 pt-5">
          <h2 className="text-2xl font-bold leading-tight">{product.name}</h2>
          <p className="mt-1 text-base">
            <span className="font-bold">{brl(base)}</span>
            <span className="text-sm text-muted-foreground">/UN</span>
            {product.promoPrice && (
              <span className="ml-2 text-sm text-muted-foreground line-through">{brl(product.price)}</span>
            )}
          </p>
          {product.description && (
            <p className="mt-3 text-sm text-muted-foreground">{product.description}</p>
          )}

          {product.addons && product.addons.length > 0 && (
            <div className="mt-6">
              <h4 className="text-base font-bold">Adicionais</h4>
              <div className="mt-2 space-y-2">
                {product.addons.map((a) => (
                  <label key={a.id} className="flex cursor-pointer items-center justify-between rounded-xl border bg-card p-3 transition hover:border-primary/40">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={!!selected.find((x) => x.id === a.id)} onCheckedChange={() => toggle(a)} />
                      <span className="text-sm">{a.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-primary">+ {brl(a.price)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 pb-6">
            <h4 className="text-base font-bold">Observações</h4>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Digite alguma observação"
              className="mt-2 min-h-[110px] resize-none rounded-xl bg-card"
            />
          </div>
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
              <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-6 text-center font-semibold">{qty}</span>
              <Button size="icon" variant="ghost" className="h-9 w-9 text-primary" onClick={() => setQty((q) => q + 1)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-base font-bold">{brl(total)}</p>
            </div>
            <Button
              className="h-12 min-w-[140px] rounded-xl text-base font-semibold"
              onClick={() => {
                add({ product, qty, addons: selected, note: note || undefined });
                toast.success("Adicionado ao carrinho", { description: `${qty}x ${product.name}` });
                onOpenChange(false);
              }}
            >
              Adicionar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
