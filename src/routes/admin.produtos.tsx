import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Edit2, Copy, Trash2, Star } from "lucide-react";
import { brl } from "@/lib/format";
import { products as initialProducts, categories, type Product } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/produtos")({
  component: ProductsPage,
});

function ProductsPage() {
  const [list, setList] = useState<Product[]>(initialProducts);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => list.filter((p) => {
    if (catFilter !== "todas" && p.category !== catFilter) return false;
    if (statusFilter === "disponivel" && !p.available) return false;
    if (statusFilter === "indisponivel" && p.available) return false;
    if (statusFilter === "destaque" && !p.featured) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [list, q, catFilter, statusFilter]);

  const openNew = () => {
    setEditing({ id: "", name: "", category: categories[0].name, description: "", price: 0, image: "", available: true, featured: false });
    setOpen(true);
  };

  const save = () => {
    if (!editing) return;
    if (!editing.name) return toast.error("Nome é obrigatório");
    setList((prev) => {
      if (editing.id) return prev.map((p) => p.id === editing.id ? editing : p);
      return [...prev, { ...editing, id: `p${Date.now()}` }];
    });
    toast.success(editing.id ? "Produto atualizado" : "Produto criado");
    setOpen(false);
  };

  return (
    <AdminLayout title="Produtos" action={<Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Novo produto</Button>}>
      <div className="space-y-4">
        <Card><CardContent className="p-4 grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto" className="pl-9" />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas categorias</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="disponivel">Disponíveis</SelectItem>
              <SelectItem value="indisponivel">Indisponíveis</SelectItem>
              <SelectItem value="destaque">Em destaque</SelectItem>
            </SelectContent>
          </Select>
        </CardContent></Card>

        <div className="grid gap-3">
          {filtered.length === 0 && <Card><CardContent className="p-10 text-center text-muted-foreground">Nenhum produto.</CardContent></Card>}
          {filtered.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex gap-4 p-4">
                <img src={p.image || "https://placehold.co/120x120?text=Foto"} alt="" className="h-20 w-20 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{p.name}</p>
                    {p.featured && <Badge className="bg-primary/15 text-primary border-0"><Star className="mr-1 h-3 w-3" /> Destaque</Badge>}
                    {!p.available && <Badge variant="destructive">Indisponível</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                  <p className="mt-1 font-bold text-primary">{brl(p.promoPrice ?? p.price)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Edit2 className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { setList((l) => [...l, { ...p, id: `p${Date.now()}`, name: p.name + " (cópia)" }]); toast.success("Produto duplicado"); }}><Copy className="h-4 w-4" /></Button>
                  <Switch checked={p.available} onCheckedChange={(v) => setList((l) => l.map((x) => x.id === p.id ? { ...x, available: v } : x))} />
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { setList((l) => l.filter((x) => x.id !== p.id)); toast.success("Produto excluído"); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Categoria</Label>
                <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Descrição</Label><Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="mt-1.5" /></div>
              <div><Label>URL da foto</Label><Input value={editing.image} onChange={(e) => setEditing({ ...editing, image: e.target.value })} className="mt-1.5" placeholder="https://..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Preço</Label><Input type="number" step="0.10" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} className="mt-1.5" /></div>
                <div><Label>Preço promo (opcional)</Label><Input type="number" step="0.10" value={editing.promoPrice ?? ""} onChange={(e) => setEditing({ ...editing, promoPrice: e.target.value ? Number(e.target.value) : undefined })} className="mt-1.5" /></div>
              </div>
              <div><Label>Tempo de preparo</Label><Input value={editing.prepTime ?? ""} onChange={(e) => setEditing({ ...editing, prepTime: e.target.value })} className="mt-1.5" placeholder="Ex: 25 min" /></div>
              <div className="flex items-center justify-between rounded-xl border p-3"><Label>Disponível</Label><Switch checked={editing.available} onCheckedChange={(v) => setEditing({ ...editing, available: v })} /></div>
              <div className="flex items-center justify-between rounded-xl border p-3"><Label>Em destaque</Label><Switch checked={editing.featured} onCheckedChange={(v) => setEditing({ ...editing, featured: v })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
