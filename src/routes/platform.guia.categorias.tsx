import { createFileRoute } from "@tanstack/react-router";
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
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useGuiaCategories, guiaActions, type GuiaCategory } from "@/lib/guia-mock";
import { ImagePickerField } from "@/components/guia/ImagePickerField";
import { toast } from "sonner";


export const Route = createFileRoute("/platform/guia/categorias")({
  component: PlatformGuiaCategorias,
});

function PlatformGuiaCategorias() {
  const cats = useGuiaCategories();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GuiaCategory | null>(null);

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
                  onCheckedChange={(v) => guiaActions.updateCategory(c.id, { active: v })}
                />
                <span className="text-xs">{c.active ? "Ativa" : "Oculta"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => guiaActions.moveCategory(c.id, -1)} disabled={i === 0}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => guiaActions.moveCategory(c.id, 1)} disabled={i === cats.length - 1}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => {
                  if (confirm(`Remover categoria "${c.label}"?`)) {
                    guiaActions.deleteCategory(c.id);
                    toast.success("Categoria removida.");
                  }
                }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {cats.length === 0 && (
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
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: GuiaCategory | null;
  existingSlugs: string[];
}) {
  const [label, setLabel] = useState(editing?.label ?? "");
  const [slug, setSlug] = useState(editing?.slug ?? "");
  const [emoji, setEmoji] = useState(editing?.emoji ?? "");
  const [imageUrl, setImageUrl] = useState<string | undefined>(editing?.imageUrl);
  const [imageFit, setImageFit] = useState<"cover" | "contain">(editing?.imageFit ?? "cover");
  const [active, setActive] = useState(editing?.active ?? true);

  // reset when opening for a different item
  useEffect(() => {
    setLabel(editing?.label ?? "");
    setSlug(editing?.slug ?? "");
    setEmoji(editing?.emoji ?? "");
    setImageUrl(editing?.imageUrl);
    setImageFit(editing?.imageFit ?? "cover");
    setActive(editing?.active ?? true);
  }, [editing, open]);

  const submit = () => {
    const finalSlug = (slug.trim() || slugify(label));
    if (!label.trim() || !finalSlug) {
      toast.error("Nome e slug obrigatórios.");
      return;
    }
    const clash = existingSlugs.some((s) => s === finalSlug && s !== editing?.slug);
    if (clash) {
      toast.error("Já existe uma categoria com esse slug.");
      return;
    }
    const base = { label: label.trim(), slug: finalSlug, emoji: emoji.trim(), imageUrl, imageFit, active };
    if (editing) {
      guiaActions.updateCategory(editing.id, base);
      toast.success("Categoria atualizada.");
    } else {
      guiaActions.createCategory(base);
      toast.success("Categoria criada.");
    }
    onOpenChange(false);
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
          <Button onClick={submit}>{editing ? "Salvar" : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
