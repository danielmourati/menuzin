import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Minus, Plus } from "lucide-react";
import { brl } from "@/lib/format";
import type { Product, ProductAddon } from "@/lib/mock-data";
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
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-lg">
        <div className="relative h-56 w-full overflow-hidden bg-muted">
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        </div>
        <div className="p-5">
          <DialogHeader>
            <DialogTitle className="text-2xl">{product.name}</DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-sm text-muted-foreground">{product.description}</p>
          <div className="mt-3 flex items-baseline gap-2">
            {product.promoPrice ? (
              <>
                <span className="text-xl font-bold text-primary">{brl(product.promoPrice)}</span>
                <span className="text-sm text-muted-foreground line-through">{brl(product.price)}</span>
              </>
            ) : (
              <span className="text-xl font-bold">{brl(product.price)}</span>
            )}
          </div>

          {product.addons && product.addons.length > 0 && (
            <div className="mt-5">
              <h4 className="text-sm font-semibold">Adicionais</h4>
              <div className="mt-2 space-y-2">
                {product.addons.map((a) => (
                  <label key={a.id} className="flex cursor-pointer items-center justify-between rounded-xl border p-3 transition hover:border-primary/40">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={!!selected.find((x) => x.id === a.id)} onCheckedChange={() => toggle(a)} />
                      <span className="text-sm">{a.name}</span>
                    </div>
                    <span className="text-sm font-medium text-primary">+ {brl(a.price)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5">
            <h4 className="text-sm font-semibold">Observação</h4>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: sem cebola, ponto da carne, etc."
              className="mt-2"
            />
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 rounded-full border p-1">
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-6 text-center font-semibold">{qty}</span>
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" onClick={() => setQty((q) => q + 1)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button
              className="flex-1 h-12 text-base"
              onClick={() => {
                add({ product, qty, addons: selected, note: note || undefined });
                toast.success("Adicionado ao carrinho", { description: `${qty}x ${product.name}` });
                onOpenChange(false);
              }}
            >
              Adicionar · {brl(total)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
