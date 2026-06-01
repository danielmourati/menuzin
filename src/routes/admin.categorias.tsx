import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, GripVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listMyCategories, saveCategory, deleteCategory,
} from "@/lib/catalog-admin.functions";
import type { DbCategory } from "@/lib/db-types";

export const Route = createFileRoute("/admin/categorias")({
  component: CategoriesPage,
});

type Editing = {
  id?: string;
  name: string;
  description: string;
  sort_order: number;
  active: boolean;
};

function CategoriesPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => (await listMyCategories()).categories,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);

  const saveMut = useMutation({
    mutationFn: (input: Editing) => saveCategory({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast.success("Categoria salva");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteCategory({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast.success("Categoria excluída");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: (c: DbCategory) =>
      saveCategory({
        data: {
          id: c.id, name: c.name, description: c.description ?? "",
          sort_order: c.sort_order, active: !c.active,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const list = data ?? [];
  const openNew = () => {
    setEditing({ name: "", description: "", sort_order: list.length + 1, active: true });
    setOpen(true);
  };

  const save = () => {
    if (!editing?.name) return toast.error("Nome obrigatório");
    saveMut.mutate(editing);
  };

  return (
    <AdminLayout title="Categorias" action={<Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Nova categoria</Button>}>
      <Card>
        <CardContent className="p-2">
          {isLoading && (
            <p className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </p>
          )}
          {error && <p className="p-8 text-center text-destructive">{(error as Error).message}</p>}
          {!isLoading && !error && list.length === 0 && (
            <p className="p-8 text-center text-muted-foreground">Nenhuma categoria.</p>
          )}
          <ul className="divide-y">
            {list.map((c) => (
              <li key={c.id} className="flex items-center gap-3 p-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{c.name}</p>
                  {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                </div>
                <Switch checked={c.active} onCheckedChange={() => toggleMut.mutate(c)} />
                <Button size="icon" variant="ghost" onClick={() => {
                  setEditing({
                    id: c.id, name: c.name, description: c.description ?? "",
                    sort_order: c.sort_order, active: c.active,
                  });
                  setOpen(true);
                }}><Edit2 className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive"
                  onClick={() => { if (confirm(`Excluir "${c.name}"?`)) delMut.mutate(c.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Nova"} categoria</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Descrição</Label><Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Ordem</Label><Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} className="mt-1.5" /></div>
              <div className="flex items-center justify-between rounded-xl border p-3"><Label>Ativa</Label><Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saveMut.isPending}>
              {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
