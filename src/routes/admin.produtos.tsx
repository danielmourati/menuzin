import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CurrencyInput, CurrencyBlurInput } from "@/components/ui/currency-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Edit2, Trash2, Star, Loader2, Pizza } from "lucide-react";
import { brl } from "@/lib/format";
import { ImageUploader } from "@/components/ui/image-uploader";
import { toast } from "sonner";
import {
  listMyCategories, listMyProducts, saveProduct, deleteProduct, toggleProductAvailable,
  saveProductSize, deleteProductSize, saveProductFlavor, deleteProductFlavor,
  listCategoryPizzaConfig,
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
  bestseller: boolean;
  prep_time: string | null;
  sort_order: number;
  type: "standard" | "pizza";
  max_flavors: number | null;
  allow_observations: boolean;
  free_gift_kind: "crust" | "product" | null;
  free_gift_ref_id: string | null;
  free_crust_mode: "none" | "fixed" | "customer_choice";
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
  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === editing?.category_id) ?? null,
    [categories, editing?.category_id],
  );
  const isPizzaCategory = selectedCategory?.kind === "pizza";

  const pizzaCatIds = useMemo(() => new Set(categories.filter((c) => c.kind === "pizza").map((c) => c.id)), [categories]);
  const filtered = useMemo(() => products.filter((p) => {
    if (catFilter === "todas") {
      // pass
    } else if (catFilter === "__pizza__") {
      if (!p.category_id || !pizzaCatIds.has(p.category_id)) return false;
    } else if (p.category_id !== catFilter) return false;
    if (statusFilter === "disponivel" && !p.available) return false;
    if (statusFilter === "indisponivel" && p.available) return false;
    if (statusFilter === "destaque" && !p.featured) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [products, q, catFilter, statusFilter, pizzaCatIds]);

  const saveMut = useMutation({
    mutationFn: (input: Editing) => {
      // Força type='pizza' se a categoria for de pizza
      const payload: Editing = isPizzaCategory ? { ...input, type: "pizza" } : input;
      return saveProduct({ data: payload });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("Produto salvo");
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
      type: categories[0]?.kind === "pizza" ? "pizza" : "standard", max_flavors: null, allow_observations: true,
      free_gift_kind: null, free_gift_ref_id: null, free_crust_mode: "none",
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
              {pizzaCatIds.size > 0 && <SelectItem value="__pizza__">🍕 Pizza (todas)</SelectItem>}
              {categories.filter((c) => c.kind === "pizza").map((c) => (
                <SelectItem key={c.id} value={c.id}>&nbsp;&nbsp;↳ {c.name}</SelectItem>
              ))}
              {categories.filter((c) => c.kind !== "pizza").map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
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
                    {p.type === "pizza" && <Badge variant="secondary"><Pizza className="mr-1 h-3 w-3" /> Sabor</Badge>}
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
                      free_gift_kind: (p.free_gift_kind ?? null) as "crust" | "product" | null,
                      free_gift_ref_id: p.free_gift_ref_id ?? null,
                      free_crust_mode: ((p.free_crust_mode ?? "none") as "none" | "fixed" | "customer_choice"),
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
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Editar" : "Novo"} {isPizzaCategory ? "sabor de pizza" : "produto"}
            </DialogTitle>
          </DialogHeader>
          {editing && isPizzaCategory && (
            <PizzaProductForm
              editing={editing}
              setEditing={setEditing}
              categories={categories}
              allProducts={products.map((p) => ({ id: p.id, name: p.name }))}
              currentProductSizes={currentProduct?.sizes ?? []}
              onClose={() => setOpen(false)}
              onSave={save}
              isSaving={saveMut.isPending}
            />
          )}
          {editing && !isPizzaCategory && (
            <Tabs defaultValue="geral">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="geral">Geral</TabsTrigger>
                <TabsTrigger value="tamanhos" disabled={!editing.id}>Tamanhos</TabsTrigger>
              </TabsList>

              <TabsContent value="geral" className="mt-4 space-y-3">
                <div><Label>Nome</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1.5" /></div>
                <div><Label>Categoria</Label>
                  <Select value={editing.category_id ?? ""} onValueChange={(v) => {
                    const cat = categories.find((c) => c.id === v);
                    setEditing({ ...editing, category_id: v, type: cat?.kind === "pizza" ? "pizza" : "standard" });
                  }}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {categories.filter((c) => c.kind !== "pizza").map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                      {pizzaCatIds.size > 0 && (
                        <>
                          <div className="px-2 pt-2 pb-1 text-xs font-semibold text-muted-foreground">🍕 Pizza</div>
                          {categories.filter((c) => c.kind === "pizza").map((c) => (
                            <SelectItem key={c.id} value={c.id}>&nbsp;&nbsp;↳ {c.name}</SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
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
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

// ===== Pizza product form (Detalhes / Preço / Classificação) =====

function PizzaProductForm({
  editing, setEditing, categories, currentProductSizes, allProducts, onClose, onSave, isSaving,
}: {
  editing: Editing;
  setEditing: (e: Editing) => void;
  categories: { id: string; name: string; kind: "standard" | "pizza" | "oferta" }[];
  currentProductSizes: { id: string; name: string; price: number; sort_order: number; category_size_id: string | null }[];
  allProducts: { id: string; name: string }[];
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <Tabs defaultValue="detalhes">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
        <TabsTrigger value="preco" disabled={!editing.id}>Preço</TabsTrigger>
        <TabsTrigger value="classificacao">Classificação</TabsTrigger>
      </TabsList>

      <TabsContent value="detalhes" className="mt-4 space-y-3">
        <div><Label>Categoria</Label>
          <Select value={editing.category_id ?? ""} onValueChange={(v) => {
            const cat = categories.find((c) => c.id === v);
            setEditing({ ...editing, category_id: v, type: cat?.kind === "pizza" ? "pizza" : "standard" });
          }}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.filter((c) => c.kind === "pizza").map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} 🍕</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-[11px] text-muted-foreground">Apenas categorias do tipo pizza são listadas.</p>
        </div>
        <div><Label>Sabor</Label><Input maxLength={80} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1.5" placeholder="Ex: Pizza de Mussarela" /><p className="text-right text-[10px] text-muted-foreground">{editing.name.length}/80 caracteres</p></div>
        <div><Label>Descrição</Label><Textarea maxLength={1000} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="mt-1.5" /></div>
        <ImageUploader
          label="Foto da pizza"
          value={editing.image_url}
          onChange={(url) => setEditing({ ...editing, image_url: url })}
          folder="produtos"
        />
        <p className="text-[10px] text-muted-foreground">Formatos: JPEG, JPG, PNG. Resolução mínima: 300×275.</p>
        <DialogFooter className="pt-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSave} disabled={isSaving || !editing.name}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editing.id ? "Salvar" : "Continuar")}
          </Button>
        </DialogFooter>
      </TabsContent>

      <TabsContent value="preco" className="mt-4">
        {editing.id && editing.category_id && (
          <PizzaPriceMatrix
            productId={editing.id}
            categoryId={editing.category_id}
            existingSizes={currentProductSizes}
          />
        )}
      </TabsContent>

      <TabsContent value="classificacao" className="mt-4 space-y-3">
        <div><Label>Tempo de preparo</Label><Input value={editing.prep_time ?? ""} onChange={(e) => setEditing({ ...editing, prep_time: e.target.value })} className="mt-1.5" placeholder="Ex: 30 min" /></div>
        <div className="flex items-center justify-between rounded-xl border p-3"><Label>Disponível</Label><Switch checked={editing.available} onCheckedChange={(v) => setEditing({ ...editing, available: v })} /></div>
        <div className="flex items-center justify-between rounded-xl border p-3"><Label>Em destaque</Label><Switch checked={editing.featured} onCheckedChange={(v) => setEditing({ ...editing, featured: v })} /></div>
        <div className="flex items-center justify-between rounded-xl border p-3"><Label>Aceita observação</Label><Switch checked={editing.allow_observations} onCheckedChange={(v) => setEditing({ ...editing, allow_observations: v })} /></div>

        <BordaGratisPicker
          categoryId={editing.category_id}
          mode={editing.free_crust_mode}
          fixedCrustId={editing.free_crust_mode === "fixed" ? (editing.free_gift_kind === "crust" ? editing.free_gift_ref_id : null) : null}
          onChange={(mode, fixedId) => {
            if (mode === "fixed") {
              setEditing({ ...editing, free_crust_mode: "fixed", free_gift_kind: "crust", free_gift_ref_id: fixedId });
            } else if (mode === "customer_choice") {
              setEditing({ ...editing, free_crust_mode: "customer_choice", free_gift_kind: null, free_gift_ref_id: null });
            } else {
              // none: limpa apenas se o brinde anterior era de borda
              const wasProduct = editing.free_gift_kind === "product";
              setEditing({
                ...editing,
                free_crust_mode: "none",
                free_gift_kind: wasProduct ? "product" : null,
                free_gift_ref_id: wasProduct ? editing.free_gift_ref_id : null,
              });
            }
          }}
        />
        <ProductGiftPicker
          allProducts={allProducts.filter((p) => p.id !== editing.id)}
          enabled={editing.free_gift_kind === "product"}
          giftRefId={editing.free_gift_kind === "product" ? editing.free_gift_ref_id : null}
          onChange={(enabled, id) => {
            if (enabled) {
              setEditing({ ...editing, free_gift_kind: "product", free_gift_ref_id: id });
            } else if (editing.free_gift_kind === "product") {
              setEditing({ ...editing, free_gift_kind: null, free_gift_ref_id: null });
            }
          }}
        />
        <DialogFooter className="pt-3">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </TabsContent>
    </Tabs>
  );
}

function PizzaPriceMatrix({ productId, categoryId, existingSizes }: { productId: string; categoryId: string; existingSizes: { id: string; name: string; price: number; sort_order: number; category_size_id: string | null }[] }) {
  const qc = useQueryClient();
  const cfgQ = useQuery({
    queryKey: ["admin", "pizza-config", categoryId],
    queryFn: () => listCategoryPizzaConfig({ data: { category_id: categoryId } }),
  });

  const sizes = cfgQ.data?.sizes ?? [];
  const sizeMap = useMemo(() => {
    const m = new Map<string, { id: string; price: number }>();
    for (const s of existingSizes) if (s.category_size_id) m.set(s.category_size_id, { id: s.id, price: Number(s.price) });
    return m;
  }, [existingSizes]);

  const saveMut = useMutation({
    mutationFn: (d: { id?: string; product_id: string; name: string; price: number; sort_order: number; category_size_id: string }) => saveProductSize({ data: d }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "products"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteProductSize({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "products"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (cfgQ.isLoading) return <div className="flex justify-center p-6"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  if (sizes.length === 0) {
    return <p className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">Cadastre os tamanhos na categoria pizza primeiro (Categorias → Configurar).</p>;
  }

  return (
    <div>
      <h4 className="mb-3 font-bold">Preços</h4>
      <p className="mb-4 text-xs text-muted-foreground">Marque os tamanhos em que este sabor é vendido e defina o preço de cada um.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {sizes.map((sz) => {
          const existing = sizeMap.get(sz.id);
          const enabled = !!existing;
          return (
            <PriceCell
              key={sz.id}
              sizeName={sz.name}
              enabled={enabled}
              price={existing?.price ?? 0}
              onToggle={(v) => {
                if (!v && existing) delMut.mutate(existing.id);
                if (v && !existing) saveMut.mutate({ product_id: productId, name: sz.name, price: 0, sort_order: sz.sort_order, category_size_id: sz.id });
              }}
              onPriceChange={(v) => {
                if (existing) saveMut.mutate({ id: existing.id, product_id: productId, name: sz.name, price: v, sort_order: sz.sort_order, category_size_id: sz.id });
                else if (v > 0) saveMut.mutate({ product_id: productId, name: sz.name, price: v, sort_order: sz.sort_order, category_size_id: sz.id });
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function PriceCell({ sizeName, enabled, price, onToggle, onPriceChange }: { sizeName: string; enabled: boolean; price: number; onToggle: (v: boolean) => void; onPriceChange: (v: number) => void }) {
  const [local, setLocal] = useState(price);
  useEffect(() => setLocal(price), [price]);
  return (
    <div className="rounded-xl border p-3 text-center">
      <div className="text-3xl">🍕</div>
      <label className="mt-2 flex items-center justify-center gap-2 cursor-pointer">
        <Checkbox checked={enabled} onCheckedChange={(v) => onToggle(!!v)} />
        <span className="text-sm font-medium">{sizeName}</span>
      </label>
      <CurrencyBlurInput
        initialValue={local}
        onCommit={(v) => { setLocal(v); onPriceChange(v); }}
        className="mt-2 text-center"
      />
    </div>
  );
}

// ===== Standard product sizes (kept) =====

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
            <CurrencyBlurInput className="w-32" initialValue={Number(s.price)}
              onCommit={(v) => saveMut.mutate({ id: s.id, product_id: productId, name: s.name, price: v, sort_order: s.sort_order })} />
            <Button size="icon" variant="ghost" className="text-destructive"
              onClick={() => { if (confirm(`Remover "${s.name}"?`)) delMut.mutate(s.id); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-2 border-t pt-3">
        <div className="flex-1"><Label className="text-xs">Novo tamanho</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex: Grande" className="mt-1" /></div>
        <div className="w-32"><Label className="text-xs">Preço</Label><CurrencyInput value={draft.price} onChange={(v) => setDraft({ ...draft, price: v })} className="mt-1" /></div>
        <Button onClick={() => {
          if (!draft.name) return;
          saveMut.mutate({ product_id: productId, name: draft.name, price: draft.price, sort_order: sizes.length });
        }} disabled={saveMut.isPending || !draft.name}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

// Keep flavor editor available but unused for pizza-category (each product is now a flavor)
export function _FlavorsEditor({ productId, flavors, onChanged }: {
  productId: string;
  flavors: { id: string; name: string; description: string; price_delta: number; available: boolean; sort_order: number }[];
  onChanged: () => void;
}) {
  const saveMut = useMutation({
    mutationFn: (input: { id?: string; product_id: string; name: string; description: string; price_delta: number; available: boolean; sort_order: number }) =>
      saveProductFlavor({ data: input }),
    onSuccess: () => onChanged(),
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteProductFlavor({ data: { id } }),
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-2">
      {flavors.map((f) => (
        <div key={f.id} className="flex items-center gap-2 rounded border p-2">
          <span>{f.name}</span>
          <Button size="icon" variant="ghost" onClick={() => delMut.mutate(f.id)}><Trash2 className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => saveMut.mutate({ id: f.id, product_id: productId, name: f.name, description: f.description, price_delta: f.price_delta, available: !f.available, sort_order: f.sort_order })}><Edit2 className="h-4 w-4" /></Button>
        </div>
      ))}
    </div>
  );
}

// ===== Borda grátis (crust gift) =====

type CrustMode = "none" | "fixed" | "customer_choice";

function BordaGratisPicker({
  categoryId, mode, fixedCrustId, onChange,
}: {
  categoryId: string | null;
  mode: CrustMode;
  fixedCrustId: string | null;
  onChange: (mode: CrustMode, fixedCrustId: string | null) => void;
}) {
  const cfgQ = useQuery({
    queryKey: ["admin", "pizza-config", categoryId],
    queryFn: () => listCategoryPizzaConfig({ data: { category_id: categoryId! } }),
    enabled: !!categoryId,
  });
  const crusts = cfgQ.data?.crusts ?? [];
  const enabled = mode !== "none";

  return (
    <div className="rounded-xl border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="font-semibold">🍕 Borda grátis</Label>
          <p className="text-[11px] text-muted-foreground">Inclua a borda como cortesia nesta pizza.</p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => onChange(v ? "fixed" : "none", null)}
        />
      </div>

      {enabled && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button type="button"
              onClick={() => onChange("fixed", fixedCrustId)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${mode === "fixed" ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/40"}`}>
              Definir borda fixa
            </button>
            <button type="button"
              onClick={() => onChange("customer_choice", null)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${mode === "customer_choice" ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/40"}`}>
              Cliente escolhe a borda
            </button>
          </div>

          {mode === "fixed" && (
            <div>
              <Label className="text-xs">Qual borda será inclusa?</Label>
              <Select value={fixedCrustId ?? ""} onValueChange={(v) => onChange("fixed", v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione a borda" /></SelectTrigger>
                <SelectContent>
                  {crusts.length === 0 && <div className="px-2 py-1 text-xs text-muted-foreground">Cadastre bordas na categoria pizza primeiro.</div>}
                  {crusts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-[11px] text-muted-foreground">As outras bordas ficarão indisponíveis para esta pizza.</p>
            </div>
          )}

          {mode === "customer_choice" && (
            <p className="rounded-lg bg-success/10 px-3 py-2 text-[11px] text-success">
              ✓ O cliente verá todas as bordas com preço R$ 0,00 e deverá escolher uma para finalizar.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ===== Brinde de produto (refri/sobremesa etc) =====

function ProductGiftPicker({
  allProducts, enabled, giftRefId, onChange,
}: {
  allProducts: { id: string; name: string }[];
  enabled: boolean;
  giftRefId: string | null;
  onChange: (enabled: boolean, giftRefId: string | null) => void;
}) {
  return (
    <div className="rounded-xl border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="font-semibold">🎁 Brinde de produto</Label>
          <p className="text-[11px] text-muted-foreground">Acompanhe um produto cortesia (refri, sobremesa…).</p>
        </div>
        <Switch checked={enabled} onCheckedChange={(v) => onChange(v, null)} />
      </div>
      {enabled && (
        <div>
          <Label className="text-xs">Qual produto?</Label>
          <Select value={giftRefId ?? ""} onValueChange={(v) => onChange(true, v)}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {allProducts.length === 0 && <div className="px-2 py-1 text-xs text-muted-foreground">Sem outros produtos.</div>}
              {allProducts.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
