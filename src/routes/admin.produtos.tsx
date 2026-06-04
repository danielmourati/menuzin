import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Edit2, Trash2, Star, Loader2 } from "lucide-react";
import { brl } from "@/lib/format";
import { ImageUploader } from "@/components/ui/image-uploader";
import { toast } from "sonner";
import {
  listMyCategories, listMyProducts, saveProduct, deleteProduct, toggleProductAvailable,
  saveProductSize, deleteProductSize, saveProductFlavor, deleteProductFlavor,
} from "@/lib/catalog-admin.functions";

export const Route = createFileRoute("/admin/produtos")({
  component: ProductsPage,
});

type Editing = {
  id?: string;
  name: string;
  description: string;
  category_id: string | null;
  price: number;
  promo_price: number | null;
  image_url: string | null;
  available: boolean;
  featured: boolean;
  prep_time: string | null;
  sort_order: number;
  type: "standard" | "pizza";
  max_flavors: number | null;
  allow_observations: boolean;
};

function ProductsPage() {
  const qc = useQueryClient();
  const productsQ = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => (await listMyProducts()).products,
  });
  const categoriesQ = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => (await listMyCategories()).categories,
  });

  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [open, setOpen] = useState(false);

  const products = productsQ.data ?? [];
  const categories = categoriesQ.data ?? [];
  const currentProduct = useMemo(
    () => (editing?.id ? products.find((p) => p.id === editing.id) ?? null : null),
    [products, editing?.id],
  );

  const filtered = useMemo(() => products.filter((p) => {
    if (catFilter !== "todas" && p.category_id !== catFilter) return false;
    if (statusFilter === "disponivel" && !p.available) return false;
    if (statusFilter === "indisponivel" && p.available) return false;
    if (statusFilter === "destaque" && !p.featured) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [products, q, catFilter, statusFilter]);

  const saveMut = useMutation({
    mutationFn: (input: Editing) => saveProduct({ data: input }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("Produto salvo");
      // mantém modal aberto para editar tamanhos/sabores
      if (editing && !editing.id) setEditing({ ...editing, id: res.id });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteProduct({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("Produto excluído");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggleMut = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      toggleProductAvailable({ data: { id, available } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "products"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => {
    if (categories.length === 0) {
      toast.error("Cadastre uma categoria primeiro.");
      return;
    }
    setEditing({
      name: "", description: "", category_id: categories[0]?.id ?? null,
      price: 0, promo_price: null, image_url: "", available: true,
      featured: false, prep_time: null, sort_order: products.length + 1,
      type: "standard", max_flavors: null, allow_observations: true,
    });
    setOpen(true);
  };

  const save = () => {
    if (!editing) return;
    if (!editing.name) return toast.error("Nome é obrigatório");
    saveMut.mutate(editing);
  };

  const catNameById = new Map(categories.map((c) => [c.id, c.name]));

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
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
          {productsQ.isLoading && (
            <Card><CardContent className="p-10 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </CardContent></Card>
          )}
          {productsQ.error && (
            <Card><CardContent className="p-10 text-center text-destructive">{(productsQ.error as Error).message}</CardContent></Card>
          )}
          {!productsQ.isLoading && filtered.length === 0 && (
            <Card><CardContent className="p-10 text-center text-muted-foreground">Nenhum produto.</CardContent></Card>
          )}
          {filtered.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex gap-4 p-4">
                <img src={p.image_url || "https://placehold.co/120x120?text=Foto"} alt="" className="h-20 w-20 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{p.name}</p>
                    {p.type === "pizza" && <Badge variant="secondary">Pizza</Badge>}
                    {p.featured && <Badge className="bg-primary/15 text-primary border-0"><Star className="mr-1 h-3 w-3" /> Destaque</Badge>}
                    {!p.available && <Badge variant="destructive">Indisponível</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{p.category_id ? catNameById.get(p.category_id) ?? "—" : "—"}</p>
                  <p className="mt-1 font-bold text-primary">{brl(Number(p.promo_price ?? p.price))}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => {
                    setEditing({
                      id: p.id, name: p.name, description: p.description ?? "",
                      category_id: p.category_id, price: Number(p.price),
                      promo_price: p.promo_price != null ? Number(p.promo_price) : null,
                      image_url: p.image_url ?? "", available: p.available, featured: p.featured,
                      prep_time: p.prep_time ?? null, sort_order: p.sort_order,
                      type: (p.type ?? "standard") as "standard" | "pizza",
                      max_flavors: p.max_flavors ?? null,
                      allow_observations: p.allow_observations ?? true,
                    });
                    setOpen(true);
                  }}><Edit2 className="h-4 w-4" /></Button>
                  <Switch checked={p.available} onCheckedChange={(v) => toggleMut.mutate({ id: p.id, available: v })} />
                  <Button size="icon" variant="ghost" className="text-destructive"
                    onClick={() => { if (confirm(`Excluir "${p.name}"?`)) delMut.mutate(p.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
          {editing && (
            <Tabs defaultValue="geral">
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${editing.type === "pizza" ? 3 : 2}, minmax(0,1fr))` }}>
                <TabsTrigger value="geral">Geral</TabsTrigger>
                <TabsTrigger value="tamanhos" disabled={!editing.id}>Tamanhos</TabsTrigger>
                {editing.type === "pizza" && (
                  <TabsTrigger value="sabores" disabled={!editing.id}>Sabores</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="geral" className="mt-4 space-y-3">
                <div><Label>Nome</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1.5" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v as "standard" | "pizza", max_flavors: v === "pizza" ? (editing.max_flavors ?? 1) : null })}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Padrão</SelectItem>
                        <SelectItem value="pizza">Pizza (multi-sabor)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {editing.type === "pizza" && (
                    <div>
                      <Label>Máx. sabores</Label>
                      <Input type="number" min={1} max={6} value={editing.max_flavors ?? 1}
                        onChange={(e) => setEditing({ ...editing, max_flavors: Math.max(1, Number(e.target.value)) })} className="mt-1.5" />
                    </div>
                  )}
                </div>
                <div><Label>Categoria</Label>
                  <Select value={editing.category_id ?? ""} onValueChange={(v) => setEditing({ ...editing, category_id: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Descrição</Label><Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="mt-1.5" /></div>
                <ImageUploader
                  label="Foto do produto"
                  value={editing.image_url}
                  onChange={(url) => setEditing({ ...editing, image_url: url })}
                  folder="produtos"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Preço base</Label><CurrencyInput value={editing.price} onChange={(v) => setEditing({ ...editing, price: v })} className="mt-1.5" /></div>
                  <div><Label>Preço promo (opcional)</Label><CurrencyInput value={editing.promo_price ?? 0} onChange={(v) => setEditing({ ...editing, promo_price: v > 0 ? v : null })} className="mt-1.5" /></div>
                </div>
                <div><Label>Tempo de preparo</Label><Input value={editing.prep_time ?? ""} onChange={(e) => setEditing({ ...editing, prep_time: e.target.value })} className="mt-1.5" placeholder="Ex: 25 min" /></div>
                <div className="flex items-center justify-between rounded-xl border p-3"><Label>Disponível</Label><Switch checked={editing.available} onCheckedChange={(v) => setEditing({ ...editing, available: v })} /></div>
                <div className="flex items-center justify-between rounded-xl border p-3"><Label>Em destaque</Label><Switch checked={editing.featured} onCheckedChange={(v) => setEditing({ ...editing, featured: v })} /></div>
                <div className="flex items-center justify-between rounded-xl border p-3"><Label>Aceita observação</Label><Switch checked={editing.allow_observations} onCheckedChange={(v) => setEditing({ ...editing, allow_observations: v })} /></div>
                <DialogFooter className="pt-3">
                  <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
                  <Button onClick={save} disabled={saveMut.isPending}>
                    {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                  </Button>
                </DialogFooter>
              </TabsContent>

              <TabsContent value="tamanhos" className="mt-4">
                {currentProduct && (
                  <SizesEditor
                    productId={currentProduct.id}
                    sizes={currentProduct.sizes ?? []}
                    onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "products"] })}
                  />
                )}
              </TabsContent>

              {editing.type === "pizza" && (
                <TabsContent value="sabores" className="mt-4">
                  {currentProduct && (
                    <FlavorsEditor
                      productId={currentProduct.id}
                      flavors={currentProduct.flavors ?? []}
                      onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "products"] })}
                    />
                  )}
                </TabsContent>
              )}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function SizesEditor({ productId, sizes, onChanged }: {
  productId: string;
  sizes: { id: string; name: string; price: number; sort_order: number }[];
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState({ name: "", price: 0 });
  const saveMut = useMutation({
    mutationFn: (input: { id?: string; product_id: string; name: string; price: number; sort_order: number }) =>
      saveProductSize({ data: input }),
    onSuccess: () => { onChanged(); setDraft({ name: "", price: 0 }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteProductSize({ data: { id } }),
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Quando há tamanhos, o preço do produto é definido pelo tamanho escolhido.</p>
      <div className="space-y-2">
        {sizes.length === 0 && <p className="text-sm text-muted-foreground">Sem tamanhos cadastrados.</p>}
        {sizes.map((s) => (
          <div key={s.id} className="flex items-center gap-2 rounded-xl border p-2">
            <Input className="flex-1" defaultValue={s.name}
              onBlur={(e) => e.target.value !== s.name && saveMut.mutate({ id: s.id, product_id: productId, name: e.target.value, price: Number(s.price), sort_order: s.sort_order })} />
            <Input className="w-28" type="number" step="0.10" defaultValue={Number(s.price)}
              onBlur={(e) => Number(e.target.value) !== Number(s.price) && saveMut.mutate({ id: s.id, product_id: productId, name: s.name, price: Number(e.target.value), sort_order: s.sort_order })} />
            <Button size="icon" variant="ghost" className="text-destructive"
              onClick={() => { if (confirm(`Remover "${s.name}"?`)) delMut.mutate(s.id); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-2 border-t pt-3">
        <div className="flex-1"><Label className="text-xs">Novo tamanho</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex: Grande" className="mt-1" /></div>
        <div className="w-28"><Label className="text-xs">Preço</Label><Input type="number" step="0.10" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} className="mt-1" /></div>
        <Button onClick={() => {
          if (!draft.name) return;
          saveMut.mutate({ product_id: productId, name: draft.name, price: draft.price, sort_order: sizes.length });
        }} disabled={saveMut.isPending || !draft.name}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function FlavorsEditor({ productId, flavors, onChanged }: {
  productId: string;
  flavors: { id: string; name: string; description: string; price_delta: number; available: boolean; sort_order: number }[];
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState({ name: "", description: "", price_delta: 0 });
  const saveMut = useMutation({
    mutationFn: (input: { id?: string; product_id: string; name: string; description: string; price_delta: number; available: boolean; sort_order: number }) =>
      saveProductFlavor({ data: input }),
    onSuccess: () => { onChanged(); setDraft({ name: "", description: "", price_delta: 0 }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteProductFlavor({ data: { id } }),
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Quando o cliente escolhe vários sabores, o preço é a média entre eles (padrão pizzaria).</p>
      <div className="space-y-2">
        {flavors.length === 0 && <p className="text-sm text-muted-foreground">Sem sabores cadastrados.</p>}
        {flavors.map((f) => (
          <div key={f.id} className="space-y-2 rounded-xl border p-3">
            <div className="flex items-center gap-2">
              <Input className="flex-1" defaultValue={f.name}
                onBlur={(e) => e.target.value !== f.name && saveMut.mutate({ id: f.id, product_id: productId, name: e.target.value, description: f.description, price_delta: Number(f.price_delta), available: f.available, sort_order: f.sort_order })} />
              <Input className="w-28" type="number" step="0.10" defaultValue={Number(f.price_delta)}
                onBlur={(e) => Number(e.target.value) !== Number(f.price_delta) && saveMut.mutate({ id: f.id, product_id: productId, name: f.name, description: f.description, price_delta: Number(e.target.value), available: f.available, sort_order: f.sort_order })} />
              <Switch checked={f.available}
                onCheckedChange={(v) => saveMut.mutate({ id: f.id, product_id: productId, name: f.name, description: f.description, price_delta: Number(f.price_delta), available: v, sort_order: f.sort_order })} />
              <Button size="icon" variant="ghost" className="text-destructive"
                onClick={() => { if (confirm(`Remover "${f.name}"?`)) delMut.mutate(f.id); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Input defaultValue={f.description} placeholder="Descrição"
              onBlur={(e) => e.target.value !== f.description && saveMut.mutate({ id: f.id, product_id: productId, name: f.name, description: e.target.value, price_delta: Number(f.price_delta), available: f.available, sort_order: f.sort_order })} />
          </div>
        ))}
      </div>
      <div className="grid gap-2 border-t pt-3">
        <Label className="text-xs">Novo sabor</Label>
        <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nome do sabor" />
        <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Descrição (opcional)" />
        <div className="flex items-end gap-2">
          <div className="flex-1"><Label className="text-xs">Acréscimo (R$)</Label><Input type="number" step="0.10" value={draft.price_delta} onChange={(e) => setDraft({ ...draft, price_delta: Number(e.target.value) })} className="mt-1" /></div>
          <Button onClick={() => {
            if (!draft.name) return;
            saveMut.mutate({ product_id: productId, name: draft.name, description: draft.description, price_delta: draft.price_delta, available: true, sort_order: flavors.length });
          }} disabled={saveMut.isPending || !draft.name}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
