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
import {
  guiaActions,
  DEFAULT_GRADIENTS,
  SLOT_KIND_LABELS,
  type GuiaSlot,
  type GuiaSlotKind,
} from "@/lib/guia-mock";
import { toast } from "sonner";

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
  emoji: string;
  gradient: string;
  storeName: string;
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
  emoji: "✨",
  gradient: DEFAULT_GRADIENTS[0],
  storeName: "",
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

  useEffect(() => {
    if (slot) {
      setF({
        kind: slot.kind,
        title: slot.title,
        subtitle: slot.subtitle ?? "",
        emoji: slot.emoji ?? "✨",
        gradient: slot.gradient ?? DEFAULT_GRADIENTS[0],
        storeName: slot.storeName ?? "",
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
    emoji: f.emoji || "✨",
    gradient: f.gradient,
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

  const submit = () => {
    if (!f.title.trim()) {
      toast.error("Informe um título.");
      return;
    }
    const payload = {
      kind: f.kind,
      title: f.title.trim(),
      subtitle: f.subtitle.trim() || undefined,
      emoji: f.emoji.trim() || "✨",
      gradient: f.gradient,
      storeName: f.storeName.trim() || undefined,
      price: num(f.price),
      promoPrice: num(f.promoPrice),
      discountPct: num(f.discountPct),
      rating: num(f.rating),
      deliveryFee: num(f.deliveryFee),
      endsAt: f.endsAt ? new Date(f.endsAt).toISOString() : undefined,
      active: f.active,
    };
    if (slot) {
      guiaActions.updateSlot(slot.id, payload);
      toast.success("Destaque atualizado.");
    } else {
      guiaActions.createSlot(payload);
      toast.success("Destaque criado.");
    }
    onOpenChange(false);
  };

  const showPrice = f.kind === "featured";
  const showStore = f.kind === "featured" || f.kind === "top_stores" || f.kind === "flash_offer";
  const showDelivery = f.kind === "top_stores";
  const showRating = f.kind === "featured" || f.kind === "top_stores";
  const showEndsAt = f.kind === "flash_offer";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{slot ? "Editar destaque" : "Novo destaque"}</DialogTitle>
          <DialogDescription>
            Configure o card exibido no Guia Menuzin. O preview atualiza em tempo real.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Emoji</Label>
                <Input value={f.emoji} onChange={(e) => setF({ ...f, emoji: e.target.value })} maxLength={4} />
              </div>
              <div>
                <Label>Gradiente</Label>
                <Select value={f.gradient} onValueChange={(v) => setF({ ...f, gradient: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEFAULT_GRADIENTS.map((g) => (
                      <SelectItem key={g} value={g}>
                        <span className={`inline-block h-3 w-8 rounded bg-gradient-to-r ${g} mr-2`} />
                        {g.split(" ")[0].replace("from-", "")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

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

          <div className="rounded-2xl border bg-muted/40 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
            <SlotCard slot={previewSlot} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>{slot ? "Salvar alterações" : "Criar destaque"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
