import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getPromoModalAdmin,
  upsertPromoModal,
  deletePromoModal,
} from "@/lib/promo-modal.functions";
import { listMyProducts } from "@/lib/catalog-admin.functions";
import { uploadTenantImage } from "@/lib/storage";

export const Route = createFileRoute("/admin/configuracoes/promocao")({
  component: PromoModalSettingsPage,
});

type Mode = "window" | "recurring";

const WEEKDAYS: { v: number; label: string }[] = [
  { v: 0, label: "Dom" },
  { v: 1, label: "Seg" },
  { v: 2, label: "Ter" },
  { v: 3, label: "Qua" },
  { v: 4, label: "Qui" },
  { v: 5, label: "Sex" },
  { v: 6, label: "Sáb" },
];

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v: string): string | null {
  if (!v) return null;
  return new Date(v).toISOString();
}

function PromoModalSettingsPage() {
  const qc = useQueryClient();
  const promoQ = useQuery({
    queryKey: ["admin", "promo-modal"],
    queryFn: () => getPromoModalAdmin(),
    retry: false,
  });
  const productsQ = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => (await listMyProducts()).products,
    retry: false,
  });

  const [enabled, setEnabled] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("EU QUERO!");
  const [productId, setProductId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("window");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [timeStart, setTimeStart] = useState("18:00");
  const [timeEnd, setTimeEnd] = useState("23:00");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const r = promoQ.data?.row;
    if (!r) return;
    setEnabled(!!r.enabled);
    setImageUrl(r.image_url ?? "");
    setCtaLabel(r.cta_label ?? "EU QUERO!");
    setProductId(r.product_id ?? null);
    setMode((r.schedule_mode as Mode) ?? "window");
    setStartsAt(toLocalInput(r.starts_at));
    setEndsAt(toLocalInput(r.ends_at));
    setWeekdays((r.weekdays ?? []) as number[]);
    setTimeStart(r.time_start ? String(r.time_start).slice(0, 5) : "18:00");
    setTimeEnd(r.time_end ? String(r.time_end).slice(0, 5) : "23:00");
  }, [promoQ.data]);

  const saveMut = useMutation({
    mutationFn: () =>
      upsertPromoModal({
        data: {
          enabled,
          image_url: imageUrl,
          cta_label: ctaLabel,
          product_id: productId,
          schedule_mode: mode,
          starts_at: mode === "window" ? fromLocalInput(startsAt) : null,
          ends_at: mode === "window" ? fromLocalInput(endsAt) : null,
          weekdays: mode === "recurring" ? weekdays : null,
          time_start: mode === "recurring" ? timeStart : null,
          time_end: mode === "recurring" ? timeEnd : null,
        },
      }),
    onSuccess: () => {
      toast.success("Modal salvo");
      qc.invalidateQueries({ queryKey: ["admin", "promo-modal"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => deletePromoModal(),
    onSuccess: () => {
      toast.success("Modal removido");
      setEnabled(false);
      setImageUrl("");
      setProductId(null);
      qc.invalidateQueries({ queryKey: ["admin", "promo-modal"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onUpload(file: File) {
    setUploading(true);
    try {
      const url = await uploadTenantImage(file, "promo-modals");
      setImageUrl(url);
      toast.success("Imagem enviada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function toggleWeekday(v: number) {
    setWeekdays((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v].sort()));
  }

  if (promoQ.isLoading) {
    return (
      <AdminLayout title="Modal promocional">
        <div className="grid place-items-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Modal promocional">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="space-y-6 p-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Ativar modal</Label>
                <p className="text-sm text-muted-foreground">
                  Aparece uma vez por sessão na abertura da loja.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="space-y-2">
              <Label>Imagem (full)</Label>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" disabled={uploading} asChild>
                  <label className="cursor-pointer">
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Enviar imagem
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onUpload(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </Button>
                {imageUrl ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl("")}>
                    <Trash2 className="mr-1 h-4 w-4" /> Remover
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Recomendado: 800×1000px ou similar, com bordas internas para o CTA.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Produto vinculado ao CTA</Label>
              <Select
                value={productId ?? "__none__"}
                onValueChange={(v) => setProductId(v === "__none__" ? null : v)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhum —</SelectItem>
                  {(productsQ.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Texto do botão (CTA)</Label>
              <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} maxLength={40} />
            </div>

            <div className="space-y-3">
              <Label>Agendamento</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="window" /> Janela única
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="recurring" /> Recorrente
                </label>
              </RadioGroup>

              {mode === "window" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Início</Label>
                    <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fim</Label>
                    <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3">
                    {WEEKDAYS.map((w) => (
                      <label key={w.v} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={weekdays.includes(w.v)} onCheckedChange={() => toggleWeekday(w.v)} />
                        {w.label}
                      </label>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Hora início</Label>
                      <Input type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Hora fim</Label>
                      <Input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fuso: America/Sao_Paulo. Se a hora fim for menor que a início, vira para o dia seguinte.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                {saveMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar
              </Button>
              {promoQ.data?.row ? (
                <Button variant="destructive" onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending}>
                  Excluir
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <Label className="text-sm">Pré-visualização</Label>
            <div className="mt-3 overflow-hidden rounded-3xl border bg-card shadow-lg">
              {imageUrl ? (
                <img src={imageUrl} alt="Preview" className="block h-auto w-full object-cover" />
              ) : (
                <div className="grid aspect-[4/5] place-items-center bg-muted text-sm text-muted-foreground">
                  Envie uma imagem
                </div>
              )}
              <div className="p-4">
                <Button className="h-12 w-full rounded-2xl text-sm font-bold uppercase" disabled>
                  {ctaLabel || "EU QUERO!"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
