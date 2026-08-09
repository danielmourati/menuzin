import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlotCard } from "./SlotCard";
import { ImagePickerField } from "./ImagePickerField";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminCreateSlot,
  adminUpdateSlot,
  adminResolveProductRef,
  type ResolvedProductRef,
} from "@/lib/guia-admin.functions";
import { SLOT_KIND_LABELS, type GuiaSlot, type GuiaSlotKind } from "@/lib/guia-types";
import { toast } from "sonner";
import { Loader2, Link2 } from "lucide-react";


type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  slot?: GuiaSlot | null;
  defaultKind?: GuiaSlotKind;
};

type Form = {
  kind: GuiaSlotKind;
  title: string;
  subtitle: string;
  imageUrl: string | undefined;
  imageFit: "cover" | "contain";
  storeName: string;
  productRef: string;
  tenantId: string | null;
  productId: string | null;
  href: string | null;
  price: string;
  promoPrice: string;
  discountPct: string;
  rating: string;
  deliveryFee: string;
  endsAt: string;
  active: boolean;
};


const empty = (defaultKind: GuiaSlotKind = "featured"): Form => ({
  kind: defaultKind,
  title: "",
  subtitle: "",
  imageUrl: undefined,
  imageFit: "cover",
  storeName: "",
  productRef: "",
  tenantId: null,
  productId: null,
  href: null,
  price: "",
  promoPrice: "",
  discountPct: "",
  rating: "",
  deliveryFee: "",
  endsAt: "",
  active: true,
});


export function SlotFormDialog({ open, onOpenChange, slot, defaultKind }: Props) {
  const [f, setF] = useState<Form>(empty(defaultKind));
  const [resolved, setResolved] = useState<ResolvedProductRef | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    setResolved(null);
    if (slot) {
      setF({
        kind: slot.kind,
        title: slot.title,
        subtitle: slot.subtitle ?? "",
        imageUrl: slot.imageUrl,
        imageFit: slot.imageFit ?? "cover",

        storeName: slot.storeName ?? "",
        productRef: slot.href ?? (slot.productId ? `/guia/produto/${slot.productId}` : ""),
        tenantId: slot.tenantId ?? null,
        productId: slot.productId ?? null,
        href: slot.href ?? null,
        price: slot.price?.toString() ?? "",
        promoPrice: slot.promoPrice?.toString() ?? "",
        discountPct: slot.discountPct?.toString() ?? "",
        rating: slot.rating?.toString() ?? "",
        deliveryFee: slot.deliveryFee?.toString() ?? "",
        endsAt: slot.endsAt ? slot.endsAt.slice(0, 16) : "",
        active: slot.active,
      });
    } else {
      setF(empty(defaultKind));
    }
  }, [slot, defaultKind, open]);

  const num = (v: string) => (v.trim() ? Number(v.replace(",", ".")) : undefined);

  const previewSlot: GuiaSlot = {
    id: slot?.id ?? "preview",
    kind: f.kind,
    title: f.title || "Título do destaque",
    subtitle: f.subtitle || undefined,
    imageUrl: f.imageUrl,
    imageFit: f.imageFit,

    storeName: f.storeName || undefined,
    price: num(f.price),
    promoPrice: num(f.promoPrice),
    discountPct: num(f.discountPct),
    rating: num(f.rating),
    deliveryFee: num(f.deliveryFee),
    endsAt: f.endsAt ? new Date(f.endsAt).toISOString() : undefined,
    active: f.active,
    sortOrder: slot?.sortOrder ?? 999,
    createdAt: slot?.createdAt ?? new Date().toISOString(),
  };

  const resolve = useMutation({
    mutationFn: (ref: string) => adminResolveProductRef({ data: { ref } }),
    onSuccess: (r) => {
      setResolved(r);
      setF((prev) => ({
        ...prev,
        tenantId: r.tenantId,
        productId: r.productId,
        href: r.href,
        storeName: prev.storeName || r.tenantName,
      }));
      toast.success(r.productName ? `Produto: ${r.productName}` : `Loja: ${r.tenantName}`);
    },
    onError: (e: Error) => {
      setResolved(null);
      setF((prev) => ({ ...prev, tenantId: null, productId: null, href: null }));
      toast.error(e.message);
    },
  });

  const fillFromProduct = () => {
    if (!resolved) return;
    setF((prev) => ({
      ...prev,
      title: resolved.productName ?? prev.title,
      storeName: resolved.tenantName,
      imageUrl: resolved.imageUrl ?? prev.imageUrl,
      price: resolved.price != null ? String(resolved.price) : prev.price,
      promoPrice: resolved.promoPrice != null ? String(resolved.promoPrice) : prev.promoPrice,
    }));
  };

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (slot) {
        await adminUpdateSlot({ data: { id: slot.id, patch: payload as never } });
      } else {
        await adminCreateSlot({ data: payload as never });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guia-admin", "slots"] });
      toast.success(slot ? "Destaque atualizado." : "Destaque criado.");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    if (!f.title.trim()) {
      toast.error("Informe um t\u00edtulo.");
      return;
    }
    save.mutate({
      kind: f.kind,
      title: f.title.trim(),
      subtitle: f.subtitle.trim() || null,
      imageUrl: f.imageUrl ?? null,
      imageFit: f.imageFit,
      tenantId: f.tenantId,
      productId: f.productId,
      href: f.href,
      storeName: f.storeName.trim() || null,
      price: num(f.price) ?? null,
      promoPrice: num(f.promoPrice) ?? null,
      discountPct: num(f.discountPct) ?? null,
      rating: num(f.rating) ?? null,
      deliveryFee: num(f.deliveryFee) ?? null,
      endsAt: f.endsAt ? new Date(f.endsAt).toISOString() : null,
      active: f.active,
    });
  };

  const showPrice = f.kind === "featured";
  const showStore = f.kind === "featured" || f.kind === "top_stores" || f.kind === "flash_offer";
  const showDelivery = f.kind === "top_stores";
  const showRating = f.kind === "featured" || f.kind === "top_stores";
  const showEndsAt = f.kind === "flash_offer";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-6 pb-4 pt-6">
          <DialogTitle>{slot ? "Editar destaque" : "Novo destaque"}</DialogTitle>
          <DialogDescription>
            Configure o card exibido no Guia Menuzin. O preview atualiza em tempo real.
          </DialogDescription>
        </DialogHeader>

        <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <Label>Tipo</Label>
              <Select
                value={f.kind}
                onValueChange={(v) => setF({ ...f, kind: v as GuiaSlotKind })}
                disabled={!!slot}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(SLOT_KIND_LABELS) as GuiaSlotKind[]).map((k) => (
                    <SelectItem key={k} value={k}>{SLOT_KIND_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Título *</Label>
              <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            </div>

            <div>
              <Label>Subtítulo</Label>
              <Textarea rows={2} value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} />
            </div>

            <div className="rounded-lg border p-3">
              <Label>Link ou slug do produto</Label>
              <p className="mb-2 text-xs text-muted-foreground">
                Cole a URL do produto (ex.: /guia/produto/&lt;id&gt; ou loja?produto=&lt;id&gt;) ou o slug da loja.
              </p>
              <div className="flex gap-2">
                <Input
                  value={f.productRef}
                  placeholder="burguer-prime ou https://menuzin.app/guia/produto/…"
                  onChange={(e) => setF({ ...f, productRef: e.target.value })}
                  onBlur={() => {
                    const ref = f.productRef.trim();
                    if (ref) resolve.mutate(ref);
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!f.productRef.trim() || resolve.isPending}
                  onClick={() => resolve.mutate(f.productRef.trim())}
                >
                  {resolve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                </Button>
              </div>
              {resolved && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-emerald-600">
                    {resolved.productName
                      ? `${resolved.productName} — ${resolved.tenantName}`
                      : `Loja: ${resolved.tenantName}`}
                  </span>
                  {resolved.productId && (
                    <Button type="button" size="sm" variant="outline" onClick={fillFromProduct}>
                      Preencher do produto
                    </Button>
                  )}
                </div>
              )}
            </div>

            <ImagePickerField
              specKey={f.kind}
              value={f.imageUrl}
              fit={f.imageFit}
              onChange={(imageUrl, imageFit) => setF({ ...f, imageUrl, imageFit })}
            />


            {showStore && (
              <div>
                <Label>Nome da loja</Label>
                <Input value={f.storeName} onChange={(e) => setF({ ...f, storeName: e.target.value })} />
              </div>
            )}

            {showPrice && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>De</Label>
                  <Input value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="55.90" />
                </div>
                <div>
                  <Label>Por</Label>
                  <Input value={f.promoPrice} onChange={(e) => setF({ ...f, promoPrice: e.target.value })} placeholder="39.90" />
                </div>
                <div>
                  <Label>% OFF</Label>
                  <Input value={f.discountPct} onChange={(e) => setF({ ...f, discountPct: e.target.value })} placeholder="30" />
                </div>
              </div>
            )}

            {(showRating || showDelivery) && (
              <div className="grid grid-cols-2 gap-2">
                {showRating && (
                  <div>
                    <Label>Nota</Label>
                    <Input value={f.rating} onChange={(e) => setF({ ...f, rating: e.target.value })} placeholder="4.9" />
                  </div>
                )}
                {showDelivery && (
                  <div>
                    <Label>Taxa entrega</Label>
                    <Input value={f.deliveryFee} onChange={(e) => setF({ ...f, deliveryFee: e.target.value })} placeholder="4.99" />
                  </div>
                )}
              </div>
            )}

            {showEndsAt && (
              <div>
                <Label>Encerra em</Label>
                <Input type="datetime-local" value={f.endsAt} onChange={(e) => setF({ ...f, endsAt: e.target.value })} />
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm font-medium">Ativo no Guia</span>
              <Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} />
            </div>
          </div>

          <div className="rounded-2xl border bg-muted/40 p-4 md:sticky md:top-0 md:self-start">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
            <SlotCard slot={previewSlot} />
          </div>
        </div>

        <DialogFooter className="border-t px-6 pb-6 pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={save.isPending}>{slot ? "Salvar alterações" : "Criar destaque"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
