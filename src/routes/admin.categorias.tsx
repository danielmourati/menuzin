import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, GripVertical } from "lucide-react";
import { categories as initial, type Category } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/categorias")({
  component: CategoriesPage,
});

function CategoriesPage() {
  const [list, setList] = useState<Category[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const openNew = () => { setEditing({ id: "", name: "", description: "", order: list.length + 1, active: true }); setOpen(true); };

  const save = () => {
    if (!editing?.name) return toast.error("Nome obrigatório");
    setList((prev) => editing.id ? prev.map((c) => c.id === editing.id ? editing : c) : [...prev, { ...editing, id: `c${Date.now()}` }]);
    toast.success("Salvo");
    setOpen(false);
  };

  return (
    <AdminLayout title="Categorias" action={<Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Nova categoria</Button>}>
      <Card>
        <CardContent className="p-2">
          {list.length === 0 && <p className="p-8 text-center text-muted-foreground">Nenhuma categoria.</p>}
          <ul className="divide-y">
            {list.sort((a, b) => a.order - b.order).map((c) => (
              <li key={c.id} className="flex items-center gap-3 p-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{c.name}</p>
                  {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                </div>
                <Switch checked={c.active} onCheckedChange={(v) => setList((l) => l.map((x) => x.id === c.id ? { ...x, active: v } : x))} />
                <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Edit2 className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { setList((l) => l.filter((x) => x.id !== c.id)); toast.success("Excluído"); }}><Trash2 className="h-4 w-4" /></Button>
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
              <div><Label>Descrição</Label><Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Ordem</Label><Input type="number" value={editing.order} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} className="mt-1.5" /></div>
              <div className="flex items-center justify-between rounded-xl border p-3"><Label>Ativa</Label><Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
