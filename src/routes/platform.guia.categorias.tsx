import { confirmDialog } from "@/hooks/useConfirm";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import {
  adminListCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminMoveCategory,
} from "@/lib/guia-admin.functions";
import type { GuiaCategory } from "@/lib/guia-types";
import { ImagePickerField } from "@/components/guia/ImagePickerField";
import { toast } from "sonner";

export const Route = createFileRoute("/platform/guia/categorias")({
  component: PlatformGuiaCategorias,
});

const KEY = ["guia-admin", "categories"];

function PlatformGuiaCategorias() {
  const qc = useQueryClient();
  const { data: cats = [], isLoading } = useQuery({
    queryKey: KEY,
    queryFn: () => adminListCategories(),
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GuiaCategory | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const update = useMutation({
    mutationFn: (v: { id: string; patch: Partial<GuiaCategory> }) =>
      adminUpdateCategory({ data: { id: v.id, patch: v.patch as never } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const move = useMutation({
    mutationFn: (v: { id: string; dir: number }) => adminMoveCategory({ data: v }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteCategory({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Categoria removida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Categorias do Guia</h2>
            <p className="text-sm text-muted-foreground">
              O grid de categorias exibido na home do Guia. Ordem, emoji e visibilidade são gerenciados aqui.
            </p>
          </div>
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Nova categoria
          </Button>
        </div>

        <div className="divide-y rounded-xl border">
          {cats.map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 p-3">
              <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-muted text-xl text-muted-foreground">
                {c.imageUrl ? (
                  <img src={c.imageUrl} alt="" className={`h-full w-full ${c.imageFit === "contain" ? "object-contain" : "object-cover"}`} />
                ) : c.emoji?.trim() ? (
                  c.emoji
                ) : (
                  <span className="text-xs">—</span>
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-semibold">{c.label}</p>
                <p className="text-xs text-muted-foreground">/{c.slug}</p>
              </div>
              <div className="flex items-center gap-1">
                <Switch
                  checked={c.active}
                  onCheckedChange={(v) => update.mutate({ id: c.id, patch: { active: v } })}
                />
                <span className="text-xs">{c.active ? "Ativa" : "Oculta"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => move.mutate({ id: c.id, dir: -1 })} disabled={i === 0}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => move.mutate({ id: c.id, dir: 1 })} disabled={i === cats.length - 1}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={async () => {
                  if (await confirmDialog({ title: `Remover categoria "${c.label}"?`, variant: "destructive", confirmText: "Remover" })) {
                    remove.mutate(c.id);
                  }
                }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {isLoading && (
            <p className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </p>
          )}
          {!isLoading && cats.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma categoria cadastrada.
            </p>
          )}
        </div>

        <CategoryDialog
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          existingSlugs={cats.map((c) => c.slug)}
          onSaved={invalidate}
        />
      </CardContent>
    </Card>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function CategoryDialog({
  open,
  onOpenChange,
  editing,
  existingSlugs,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: GuiaCategory | null;
  existingSlugs: string[];
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(editing?.label ?? "");
  const [slug, setSlug] = useState(editing?.slug ?? "");
  const [emoji, setEmoji] = useState(editing?.emoji ?? "");
  const [imageUrl, setImageUrl] = useState<string | undefined>(editing?.imageUrl);
  const [imageFit, setImageFit] = useState<"cover" | "contain">(editing?.imageFit ?? "cover");
  const [active, setActive] = useState(editing?.active ?? true);

  useEffect(() => {
    setLabel(editing?.label ?? "");
    setSlug(editing?.slug ?? "");
    setEmoji(editing?.emoji ?? "");
    setImageUrl(editing?.imageUrl);
    setImageFit(editing?.imageFit ?? "cover");
    setActive(editing?.active ?? true);
  }, [editing, open]);

  const save = useMutation({
    mutationFn: async (payload: {
      label: string; slug: string; emoji: string; imageUrl?: string; imageFit: "cover" | "contain"; active: boolean;
    }) => {
      if (editing) {
        await adminUpdateCategory({ data: { id: editing.id, patch: payload } });
      } else {
        await adminCreateCategory({ data: payload });
      }
    },
    onSuccess: () => {
      onSaved();
      toast.success(editing ? "Categoria atualizada." : "Categoria criada.");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    const finalSlug = slug.trim() || slugify(label);
    if (!label.trim() || !finalSlug) {
      toast.error("Nome e slug obrigatórios.");
      return;
    }
    const clash = existingSlugs.some((s) => s === finalSlug && s !== editing?.slug);
    if (clash) {
      toast.error("Já existe uma categoria com esse slug.");
      return;
    }
    save.mutate({ label: label.trim(), slug: finalSlug, emoji: emoji.trim(), imageUrl, imageFit, active });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome *</Label>
            <Input value={label} onChange={(e) => { setLabel(e.target.value); if (!editing) setSlug(slugify(e.target.value)); }} />
          </div>
          <div>
            <Label>Slug *</Label>
            <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="pizza" />
          </div>
          <div>
            <Label>Emoji <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} placeholder="deixe em branco pra ocultar" />
            <p className="mt-1 text-[11px] text-muted-foreground">Fallback quando não há imagem. Deixe em branco pra mostrar apenas o texto.</p>
          </div>
          <ImagePickerField
            specKey="category"
            value={imageUrl}
            fit={imageFit}
            onChange={(u, fit) => { setImageUrl(u); setImageFit(fit); }}
          />

          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm font-medium">Ativa no Guia</span>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
