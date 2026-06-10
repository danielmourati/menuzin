import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Minus, Plus, ArrowLeft } from "lucide-react";
import { brl } from "@/lib/format";
import type { Product, ProductAddon, ProductSize, ProductFlavor, AddonGroup, AddonOption } from "@/lib/domain-types";
import { useCart, type CartSelectedGroupOption } from "@/lib/cart-context";
import { toast } from "sonner";
import {
  validateSelection,
  computeBasePrice,
  toggleFlavorId,
  toggleGroupOptionId,
} from "@/lib/product-selection";

type PizzaExtra = { id: string; name: string; extraPrice: number };

export function ProductModal({
  product, open, onOpenChange, pizzaDoughs = [], pizzaCrusts = [],
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pizzaDoughs?: PizzaExtra[];
  pizzaCrusts?: PizzaExtra[];
}) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [legacyAddons, setLegacyAddons] = useState<ProductAddon[]>([]);
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [flavorIds, setFlavorIds] = useState<string[]>([]);
  const [groupSelections, setGroupSelections] = useState<Record<string, string[]>>({});
  const [doughId, setDoughId] = useState<string | null>(null);
  const [crustId, setCrustId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open && product) {
      setQty(1);
      setLegacyAddons([]);
      setSizeId(product.sizes && product.sizes.length > 0 ? product.sizes[0].id : null);
      setFlavorIds([]);
      setGroupSelections({});
      setDoughId(pizzaDoughs[0]?.id ?? null);
      setCrustId(null);
      setNote("");
    }
  }, [open, product?.id]);

  const groupOptionsSelected: CartSelectedGroupOption[] = useMemo(() => {
    const out: CartSelectedGroupOption[] = [];
    if (!product) return out;
    for (const g of product.addonGroups ?? []) {
      const ids = groupSelections[g.id] ?? [];
      for (const o of g.options) {
        if (ids.includes(o.id)) out.push({ ...o, groupName: g.name });
      }
    }
    return out;
  }, [product, groupSelections]);

  if (!product) return null;

  const isPizza = product.type === "pizza";
  const maxFlavors = product.maxFlavors ?? 1;
  const selectedSize: ProductSize | undefined = product.sizes?.find((s) => s.id === sizeId);
  const selectedFlavors: ProductFlavor[] = (product.flavors ?? []).filter((f) => flavorIds.includes(f.id));

  const basePrice = computeBasePrice(product, selectedSize, selectedFlavors);

  const showPizzaExtras = product.categoryKind === "pizza";
  const selectedDough = showPizzaExtras ? pizzaDoughs.find((d) => d.id === doughId) : undefined;
  const selectedCrust = showPizzaExtras ? pizzaCrusts.find((c) => c.id === crustId) : undefined;
  const doughSum = selectedDough?.extraPrice ?? 0;
  const crustSum = selectedCrust?.extraPrice ?? 0;

  const addonsSum = legacyAddons.reduce((s, a) => s + a.price, 0);
  const groupSum = groupOptionsSelected.reduce((s, o) => s + o.price, 0);
  const total = (basePrice + addonsSum + groupSum + doughSum + crustSum) * qty;

  const allGroups = product.addonGroups ?? [];
  const adicionalGroups = allGroups.filter((g) => g.kind !== "observacao");
  const observacaoGroups = allGroups.filter((g) => g.kind === "observacao");
  // Legacy fallback: only show product.addons if no addonGroups defined
  const showLegacyAddons = adicionalGroups.length === 0 && (product.addons?.length ?? 0) > 0;

  // Validação (multi-option groups com required/min/max ainda são validados)
  const validations = validateSelection({ product, sizeId, flavorIds, groupSelections });
  const canAdd = validations.length === 0 && product.available;

  const toggleFlavor = (f: ProductFlavor) => {
    setFlavorIds((prev) => toggleFlavorId(prev, f.id, maxFlavors));
  };

  const toggleGroupOption = (groupId: string, optId: string, maxSelect: number) => {
    setGroupSelections((prev) => ({ ...prev, [groupId]: toggleGroupOptionId(prev[groupId], optId, maxSelect) }));
  };

  const isOptionSelected = (g: AddonGroup, o: AddonOption) =>
    (groupSelections[g.id] ?? []).includes(o.id);

  const onAdd = () => {
    if (!canAdd) {
      toast.error(validations[0] ?? "Selecione as opções obrigatórias");
      return;
    }
    if (showPizzaExtras && pizzaDoughs.length > 0 && !selectedDough) {
      toast.error("Escolha a massa da pizza");
      return;
    }
    const extras: ProductAddon[] = [];
    if (selectedDough && selectedDough.extraPrice >= 0) extras.push({ id: `dough-${selectedDough.id}`, name: `Massa: ${selectedDough.name}`, price: selectedDough.extraPrice });
    if (selectedCrust) extras.push({ id: `crust-${selectedCrust.id}`, name: `Borda: ${selectedCrust.name}`, price: selectedCrust.extraPrice });
    add({
      product,
      qty,
      addons: [...legacyAddons, ...extras],
      size: selectedSize,
      flavors: selectedFlavors.length ? selectedFlavors : undefined,
      groupOptions: groupOptionsSelected.length ? groupOptionsSelected : undefined,
      basePrice,
      note: note || undefined,
    });
    toast.success("Adicionado ao carrinho", { description: `${qty}x ${product.name}` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[100dvh] max-h-none w-full flex-col gap-0 overflow-hidden rounded-none border-0 bg-card p-0 sm:h-[90vh] sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl [&>button]:hidden"
      >
        <DialogTitle className="sr-only">{product.name}</DialogTitle>

        <div className="relative shrink-0">
          <div className="relative h-48 w-full overflow-hidden bg-muted sm:h-56">
            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
          </div>
          <Button
            size="icon" variant="secondary"
            onClick={() => onOpenChange(false)}
            className="absolute left-3 top-3 z-10 h-10 w-10 rounded-full bg-card/95 text-foreground shadow-md backdrop-blur hover:bg-card"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {product.featured && (
            <span className="absolute right-3 top-3 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground shadow-md">
              Destaque
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-card px-5 pt-5">
          <h2 className="text-2xl font-bold leading-tight">{product.name}</h2>
          <p className="mt-1 text-base">
            <span className="font-bold">{brl(basePrice)}</span>
            <span className="text-sm text-muted-foreground">/UN</span>
            {product.promoPrice && !selectedSize && (
              <span className="ml-2 text-sm text-muted-foreground line-through">{brl(product.price)}</span>
            )}
          </p>
          {product.description && (
            <p className="mt-3 text-sm text-muted-foreground">{product.description}</p>
          )}

          {/* Tamanhos */}
          {product.sizes && product.sizes.length > 0 && (
            <Section title="Tamanho" required>
              <RadioGroup value={sizeId ?? ""} onValueChange={setSizeId} className="mt-2 space-y-2">
                {product.sizes.map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-center justify-between rounded-xl border bg-card p-3 transition hover:border-primary/40">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value={s.id} id={`size-${s.id}`} />
                      <Label htmlFor={`size-${s.id}`} className="cursor-pointer text-sm">{s.name}</Label>
                    </div>
                    <span className="text-sm font-semibold text-primary">{brl(s.price)}</span>
                  </label>
                ))}
              </RadioGroup>
            </Section>
          )}

          {/* Sabores (pizza) */}
          {isPizza && product.flavors && product.flavors.length > 0 && (
            <Section
              title={`Sabores`}
              required
              hint={`Escolha até ${maxFlavors} (${selectedFlavors.length}/${maxFlavors})`}
            >
              <div className="mt-2 space-y-2">
                {product.flavors.map((f) => {
                  const checked = flavorIds.includes(f.id);
                  return (
                    <label key={f.id} className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border bg-card p-3 transition hover:border-primary/40">
                      <div className="flex items-start gap-3">
                        <Checkbox checked={checked} onCheckedChange={() => toggleFlavor(f)} className="mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{f.name}</p>
                          {f.description && <p className="mt-0.5 text-xs text-muted-foreground">{f.description}</p>}
                        </div>
                      </div>
                      {f.priceDelta > 0 && (
                        <span className="text-xs font-semibold text-primary">+ {brl(f.priceDelta)}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Massa da pizza (categoria pizza) */}
          {showPizzaExtras && pizzaDoughs.length > 0 && (
            <Section title="Massa" required>
              <RadioGroup value={doughId ?? ""} onValueChange={setDoughId} className="mt-2 space-y-2">
                {pizzaDoughs.map((d) => (
                  <label key={d.id} className="flex cursor-pointer items-center justify-between rounded-xl border bg-card p-3 transition hover:border-primary/40">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value={d.id} id={`dough-${d.id}`} />
                      <Label htmlFor={`dough-${d.id}`} className="cursor-pointer text-sm">{d.name}</Label>
                    </div>
                    {d.extraPrice > 0 && <span className="text-xs font-semibold text-primary">+ {brl(d.extraPrice)}</span>}
                  </label>
                ))}
              </RadioGroup>
            </Section>
          )}

          {/* Borda (categoria pizza) — opcional */}
          {showPizzaExtras && pizzaCrusts.length > 0 && (
            <Section title="Borda">
              <div className="mt-2 space-y-2">
                <label className="flex cursor-pointer items-center justify-between rounded-xl border bg-card p-3 transition hover:border-primary/40">
                  <div className="flex items-center gap-3">
                    <input type="radio" name="crust" checked={!crustId} onChange={() => setCrustId(null)} />
                    <span className="text-sm">Sem borda</span>
                  </div>
                </label>
                {pizzaCrusts.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center justify-between rounded-xl border bg-card p-3 transition hover:border-primary/40">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="crust" checked={crustId === c.id} onChange={() => setCrustId(c.id)} />
                      <span className="text-sm">{c.name}</span>
                    </div>
                    {c.extraPrice > 0 && <span className="text-xs font-semibold text-primary">+ {brl(c.extraPrice)}</span>}
                  </label>
                ))}
              </div>
            </Section>
          )}

          {/* Adicionais (centralizado, sem duplicação) */}
          {adicionalGroups.length > 0 && (
            <Section title="Adicionais">
              <div className="mt-2 space-y-2">
                {adicionalGroups.flatMap((g) =>
                  g.options.map((o) => {
                    const checked = isOptionSelected(g, o);
                    return (
                      <label
                        key={`${g.id}-${o.id}`}
                        className="flex cursor-pointer items-center justify-between rounded-xl border bg-card p-3 transition hover:border-primary/40"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleGroupOption(g.id, o.id, g.maxSelect)}
                          />
                          <span className="text-sm">{o.name}</span>
                        </div>
                        {o.price > 0 && (
                          <span className="text-sm font-semibold text-primary">+ {brl(o.price)}</span>
                        )}
                      </label>
                    );
                  }),
                )}
              </div>
            </Section>
          )}

          {/* Observações (centralizado, sem preço, opcional) */}
          {observacaoGroups.length > 0 && (
            <Section title="Observações">
              <div className="mt-2 space-y-2">
                {observacaoGroups.flatMap((g) =>
                  g.options.map((o) => {
                    const checked = isOptionSelected(g, o);
                    return (
                      <label
                        key={`${g.id}-${o.id}`}
                        className="flex cursor-pointer items-center justify-between rounded-xl border bg-card p-3 transition hover:border-primary/40"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleGroupOption(g.id, o.id, g.maxSelect)}
                          />
                          <span className="text-sm">{o.name}</span>
                        </div>
                      </label>
                    );
                  }),
                )}
              </div>
            </Section>
          )}

          {/* Fallback: adicionais legados quando não há addonGroups */}
          {showLegacyAddons && (
            <Section title="Adicionais">
              <div className="mt-2 space-y-2">
                {product.addons!.map((a) => (
                  <label key={a.id} className="flex cursor-pointer items-center justify-between rounded-xl border bg-card p-3 transition hover:border-primary/40">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={!!legacyAddons.find((x) => x.id === a.id)}
                        onCheckedChange={() =>
                          setLegacyAddons((p) => (p.find((x) => x.id === a.id) ? p.filter((x) => x.id !== a.id) : [...p, a]))
                        }
                      />
                      <span className="text-sm">{a.name}</span>
                    </div>
                    {a.price > 0 && <span className="text-sm font-semibold text-primary">+ {brl(a.price)}</span>}
                  </label>
                ))}
              </div>
            </Section>
          )}

          {product.allowObservations && (
            <Section title="Alguma observação?">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Digite alguma observação"
                className="mt-2 min-h-[110px] resize-none rounded-xl bg-card"
              />
            </Section>
          )}

          <div className="pb-6" />
        </div>

        <div className="shrink-0 border-t bg-card px-4 py-3">
          {validations.length > 0 && (
            <p className="mb-2 text-center text-xs font-medium text-destructive">{validations[0]}</p>
          )}
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
              onClick={onAdd}
              disabled={!canAdd}
            >
              Adicionar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, hint, required, children }: { title: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-base font-bold">
          {title}
          {required && <Badge variant="secondary" className="ml-2 text-[10px] uppercase">Obrigatório</Badge>}
        </h4>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
