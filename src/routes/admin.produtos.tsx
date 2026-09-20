import { confirmDialog } from "@/hooks/useConfirm";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
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
import { Plus, Search, Edit2, Trash2, Star, Loader2, Pizza, Link2 as LinkIcon, Package, MessageSquare, Layers } from "lucide-react";
import { ReorderButtons } from "@/components/admin/ReorderButtons";
import { brl } from "@/lib/format";
import { ImageUploader } from "@/components/ui/image-uploader";
import { productImage, isDefaultProductImage } from "@/lib/product-image";
import { toast } from "sonner";
import {
  listMyCategories, listMyProducts, saveProduct, deleteProduct, toggleProductAvailable,
  saveProductSize, deleteProductSize, saveProductFlavor, deleteProductFlavor,
  listCategoryPizzaConfig, listAddonGroups, saveAddonGroup, saveAddonOption, setAddonGroupTargets,
} from "@/lib/catalog-admin.functions";
import { getMyTenant } from "@/lib/tenants.functions";


export const Route = createFileRoute("/admin/produtos")({
  validateSearch: (search: Record<string, unknown>): { tutorial?: boolean } => ({
    tutorial: search?.tutorial === "true" || search?.tutorial === true ? true : undefined,
  }),
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
  listed_as_flavor: boolean | null;
  free_gift_kind: "crust" | "product" | null;
  free_gift_ref_id: string | null;
  free_crust_mode: "none" | "fixed" | "customer_choice";
};

function ProductsPage() {
  const qc = useQueryClient();
  const tenantQ = useQuery({
    queryKey: ["tenant-probe"],
    queryFn: () => getMyTenant({ data: {} }),
  });
  const hasTenant = !!tenantQ.data?.tenant?.id;
  const isPizzaria = (tenantQ.data?.tenant?.business_types ?? []).includes("pizzaria");
  const productsQ = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => (await listMyProducts()).products,
    enabled: hasTenant,
    retry: false,
  });
  const categoriesQ = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => (await listMyCategories()).categories,
    enabled: hasTenant,
    retry: false,
  });
  const addonGroupsQ = useQuery({
    queryKey: ["admin", "addon-groups"],
    queryFn: async () => (await listAddonGroups()).groups,
    enabled: hasTenant,
    retry: false,
  });

  const search = Route.useSearch();
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (search.tutorial) {
      setShowTutorial(true);
    }
  }, [search.tutorial]);

  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  // States for inline creation of observation/addon groups
  const [inlineGroupOpen, setInlineGroupOpen] = useState(false);
  const [inlineGroupKind, setInlineGroupKind] = useState<"observacao" | "adicional">("observacao");
  const [inlineGroupName, setInlineGroupName] = useState("");
  const [inlineGroupRequired, setInlineGroupRequired] = useState(false);
  const [inlineGroupMin, setInlineGroupMin] = useState(0);
  const [inlineGroupMax, setInlineGroupMax] = useState(1);
  const [inlineOptions, setInlineOptions] = useState<{ name: string; price: number }[]>([]);
  const [newOptName, setNewOptName] = useState("");
  const [newOptPrice, setNewOptPrice] = useState(0);
  const [isSavingInline, setIsSavingInline] = useState(false);
  const inlineOptInputRef = useRef<HTMLInputElement>(null);

  const handleAddInlineOpt = () => {
    if (!newOptName.trim()) return;
    setInlineOptions((prev) => [...prev, { name: newOptName.trim(), price: newOptPrice }]);
    setNewOptName("");
    setNewOptPrice(0);
    setTimeout(() => inlineOptInputRef.current?.focus(), 50);
  };

  const products = productsQ.data ?? [];
  const categories = categoriesQ.data ?? [];
  const addonGroups = addonGroupsQ.data ?? [];

  const obsGroups = useMemo(() => addonGroups.filter((g) => g.kind === "observacao"), [addonGroups]);
  const addonSubcats = useMemo(() => addonGroups.filter((g) => g.kind === "adicional"), [addonGroups]);

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

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBatchToggleAvailable = async (available: boolean) => {
    if (selectedProductIds.length === 0) return;
    try {
      await Promise.all(
        selectedProductIds.map((id) => toggleProductAvailable({ data: { id, available } }))
      );
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success(
        `${selectedProductIds.length} produto(s) ${available ? "ativado(s)" : "pausado(s)"}.`
      );
      setSelectedProductIds([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar produtos.");
    }
  };

  const handleBatchDelete = async () => {
    if (selectedProductIds.length === 0) return;
    const ok = await confirmDialog({
      title: `Excluir ${selectedProductIds.length} produto(s)?`,
      description: "Esta ação é irreversível e excluirá os produtos selecionados.",
      confirmText: "Excluir todos",
      cancelText: "Cancelar",
      variant: "destructive",
    });
    if (!ok) return;

    try {
      await Promise.all(selectedProductIds.map((id) => deleteProduct({ data: { id } })));
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success(`${selectedProductIds.length} produto(s) excluído(s).`);
      setSelectedProductIds([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao excluir produtos.");
    }
  };

  const saveMut = useMutation({
    mutationFn: async (input: Editing) => {
      const payload: Editing = isPizzaCategory ? { ...input, type: "pizza" } : input;
      const res = await saveProduct({ data: payload });
      const pid = res.id;

      // Synchronize addon group targets for selected/unselected groups
      for (const g of addonGroups) {
        const isTargeted = selectedGroupIds.includes(g.id);
        const currentCategoryIds = g.targets.filter((t) => t.category_id).map((t) => t.category_id as string);
        const currentProductIds = g.targets.filter((t) => t.product_id).map((t) => t.product_id as string);
        const hasProduct = currentProductIds.includes(pid);

        if (isTargeted && !hasProduct) {
          const nextPids = [...currentProductIds, pid];
          await setAddonGroupTargets({
            data: { group_id: g.id, category_ids: currentCategoryIds, product_ids: nextPids },
          });
        } else if (!isTargeted && hasProduct) {
          const nextPids = currentProductIds.filter((id) => id !== pid);
          await setAddonGroupTargets({
            data: { group_id: g.id, category_ids: currentCategoryIds, product_ids: nextPids },
          });
        }
      }

      return res;
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["admin", "addon-groups"] });
      toast.success("Produto salvo com sucesso!");
      setOpen(false);
      setEditing(null);
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

  const navigate = useNavigate();
  const openNew = () => {
    if (categories.length === 0) {
      navigate({ to: "/admin/cardapio/novo" });
      return;
    }
    setEditing({
      name: "", description: "", category_id: categories[0]?.id ?? null,
      price: 0, promo_price: null, image_url: "", available: true,
      featured: false, bestseller: false, prep_time: null, sort_order: products.length + 1,
      type: categories[0]?.kind === "pizza" ? "pizza" : "standard", max_flavors: null, allow_observations: true,
      listed_as_flavor: categories[0]?.kind === "pizza" ? null : null,
      free_gift_kind: null, free_gift_ref_id: null, free_crust_mode: "none",
    });
    setSelectedGroupIds([]);
    setOpen(true);
  };

  const openEditProduct = (p: typeof products[number]) => {
    setEditing({
      id: p.id, name: p.name, description: p.description ?? "",
      category_id: p.category_id, price: Number(p.price),
      promo_price: p.promo_price != null ? Number(p.promo_price) : null,
      image_url: p.image_url ?? "", available: p.available, featured: p.featured, bestseller: (p as { bestseller?: boolean }).bestseller ?? false,
      prep_time: p.prep_time ?? null, sort_order: p.sort_order,
      type: (p.type ?? "standard") as "standard" | "pizza",
      max_flavors: p.max_flavors ?? null,
      allow_observations: p.allow_observations ?? true,
      listed_as_flavor: (p as { listed_as_flavor?: boolean | null }).listed_as_flavor ?? null,
      free_gift_kind: (p.free_gift_kind ?? null) as "crust" | "product" | null,
      free_gift_ref_id: p.free_gift_ref_id ?? null,
      free_crust_mode: ((p.free_crust_mode ?? "none") as "none" | "fixed" | "customer_choice"),
    });
    const initialGroupIds = addonGroups
      .filter((g) => g.targets.some((t) => t.product_id === p.id))
      .map((g) => g.id);
    setSelectedGroupIds(initialGroupIds);
    setOpen(true);
  };

  const openInlineGroupModal = (kind: "observacao" | "adicional") => {
    setInlineGroupKind(kind);
    setInlineGroupName("");
    setInlineGroupRequired(kind === "observacao");
    setInlineGroupMin(kind === "observacao" ? 1 : 0);
    setInlineGroupMax(kind === "observacao" ? 1 : 5);
    setInlineOptions([]);
    setNewOptName("");
    setNewOptPrice(0);
    setInlineGroupOpen(true);
  };

  const handleSaveInlineGroup = async () => {
    if (!inlineGroupName.trim()) {
      toast.error("Nome do grupo é obrigatório");
      return;
    }
    try {
      setIsSavingInline(true);
      const resGroup = await saveAddonGroup({
        data: {
          name: inlineGroupName.trim(),
          kind: inlineGroupKind,
          required: inlineGroupRequired,
          min_select: inlineGroupMin,
          max_select: inlineGroupMax,
          active: true,
          sort_order: 0,
        },
      });

      for (let i = 0; i < inlineOptions.length; i++) {
        const opt = inlineOptions[i];
        await saveAddonOption({
          data: {
            group_id: resGroup.id,
            name: opt.name,
            price: opt.price,
            active: true,
            sort_order: i,
          },
        });
      }

      await qc.invalidateQueries({ queryKey: ["admin", "addon-groups"] });
      setSelectedGroupIds((prev) => [...prev, resGroup.id]);
      toast.success(`${inlineGroupKind === "observacao" ? "Grupo de observação" : "Subcategoria de adicionais"} criado e vinculado!`);
      setInlineGroupOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar grupo.");
    } finally {
      setIsSavingInline(false);
    }
  };

  const save = () => {
    if (!editing) return;
    if (!editing.name) return toast.error("Nome é obrigatório");
    if (isPizzaCategory && editing.listed_as_flavor === null) {
      return toast.error("Defina se este sabor entra na montagem de pizzas.");
    }
    saveMut.mutate(editing);
  };

  const catNameById = new Map(categories.map((c) => [c.id, c.name]));

  if (hasTenant && !categoriesQ.isLoading && categories.length === 0) {
    return (
      <AdminLayout title="Produtos">
        <div className="mx-auto max-w-xl">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Plus className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">Vamos montar seu cardápio</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Todo produto precisa pertencer a uma categoria. Use o assistente guiado —
                ele cria a categoria e o primeiro produto em 2 minutos.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button asChild className="h-11">
                  <Link to="/admin/cardapio/novo">
                    <Plus className="mr-1.5 h-4 w-4" /> Usar assistente guiado
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11">
                  <Link to="/admin/categorias">Criar categoria avulsa</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  const handleOpenChange = async (nextOpen: boolean) => {
    if (!nextOpen && editing) {
      const original = editing.id ? products.find((p) => p.id === editing.id) : null;
      const isDirty = original
        ? editing.name !== original.name ||
          editing.description !== (original.description ?? "") ||
          Number(editing.price) !== Number(original.price) ||
          editing.category_id !== original.category_id
        : editing.name.trim().length > 0 || editing.description.trim().length > 0 || editing.price > 0;

      if (isDirty) {
        const ok = await confirmDialog({
          title: "Descartar alterações?",
          description: "Você possui alterações não salvas neste produto. Deseja sair sem salvar?",
          confirmText: "Descartar",
          cancelText: "Continuar editando",
          variant: "destructive",
        });
        if (!ok) return;
      }
    }
    setOpen(nextOpen);
    if (!nextOpen) setEditing(null);
  };

  return (
    <AdminLayout title="Produtos" action={<Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Novo produto</Button>}>
      <div className="space-y-4">
        <div className="relative">
          <Card className={showTutorial ? "ring-4 ring-blue-500/80 shadow-2xl relative z-20 border-blue-500" : ""}>
            <CardContent className="p-4 grid gap-3 md:grid-cols-[1fr_180px_180px]">
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
            </CardContent>
          </Card>

          {showTutorial && (
            <div className="mt-3 md:mt-0 md:absolute md:-right-80 md:top-0 z-30 w-full md:w-72 p-4 rounded-2xl bg-blue-600 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="hidden md:block absolute -left-2.5 top-6 w-0 h-0 border-y-[8px] border-y-transparent border-r-[10px] border-r-blue-600" />
              <div className="block md:hidden absolute -top-2.5 left-8 w-0 h-0 border-x-[8px] border-x-transparent border-b-[10px] border-b-blue-600" />

              <h4 className="font-extrabold text-sm leading-snug">
                Cadastre seus produtos e categorias facilmente!
              </h4>
              <p className="mt-1.5 text-xs leading-relaxed text-blue-50 font-normal">
                Organize seu cardápio em categorias (como Bebidas, Lanches e Almoço), busque por nome ou filtre seus produtos por status.
              </p>

              <div className="mt-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowTutorial(false)}
                  className="font-extrabold text-xs tracking-wider uppercase text-white hover:underline cursor-pointer bg-blue-700/80 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-all"
                >
                  OK, entendi
                </button>
              </div>
            </div>
          )}
        </div>

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
            <Card className="border-dashed">
              <CardContent className="p-10 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Package className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Nenhum produto cadastrado</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                  {q || catFilter !== "todas" || statusFilter !== "todos"
                    ? "Nenhum produto encontrado para os filtros selecionados."
                    : "Cadastre os pratos, bebidas ou sobremesas da sua loja para montar seu cardápio digital."}
                </p>
                <div className="mt-5 flex justify-center gap-2">
                  <Button onClick={openNew} className="h-11 px-6">
                    <Plus className="mr-1.5 h-4 w-4" /> Cadastrar primeiro produto
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {filtered.map((p, idx) => {
            const isSelected = selectedProductIds.includes(p.id);
            return (
              <Card key={p.id} className={`transition-colors ${isSelected ? "border-primary/60 bg-primary/5" : ""}`}>
                <CardContent className="flex items-center gap-3 p-4">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelectProduct(p.id)}
                    className="mr-1"
                  />
                  <ReorderButtons
                    entity="product"
                    id={p.id}
                    invalidateKeys={[["admin", "products"]]}
                    isFirst={idx === 0}
                    isLast={idx === filtered.length - 1}
                  />
                <img src={productImage(p.image_url)} alt="" className={`h-20 w-20 rounded-xl bg-muted ${isDefaultProductImage(p.image_url) ? "object-contain p-2" : "object-cover"}`} loading="lazy" decoding="async" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{p.name}</p>
                    {p.type === "pizza" && <Badge variant="secondary"><Pizza className="mr-1 h-3 w-3" /> Sabor</Badge>}
                    {p.type === "pizza" && (p as { listed_as_flavor?: boolean | null }).listed_as_flavor === false && (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">Não listado na montagem</Badge>
                    )}
                    {p.type === "pizza" && (p as { listed_as_flavor?: boolean | null }).listed_as_flavor == null && (
                      <Badge variant="outline" className="border-destructive/40 text-destructive">Sabor não definido</Badge>
                    )}
                    {p.featured && <Badge className="bg-primary/15 text-primary border-0"><Star className="mr-1 h-3 w-3" /> Destaque</Badge>}
                    {!p.available && <Badge variant="destructive">Indisponível</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{p.category_id ? catNameById.get(p.category_id) ?? "—" : "—"}</p>
                  <p className="mt-1 font-bold text-primary">{brl(Number(p.promo_price ?? p.price))}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Copiar link do produto"
                    onClick={() => {
                      const tSlug = tenantQ.data?.tenant?.slug;
                      const pSlug = (p as { slug?: string | null }).slug;
                      const path = tSlug && pSlug ? `/${tSlug}/${pSlug}` : `/guia/produto/${pSlug ?? p.id}`;
                      navigator.clipboard.writeText(`https://menuzin.app${path}`);
                      toast.success("Link do produto copiado.");
                    }}
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => openEditProduct(p)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Switch checked={p.available} onCheckedChange={(v) => toggleMut.mutate({ id: p.id, available: v })} />
                  <Button size="icon" variant="ghost" className="text-destructive"
                    onClick={async () => { if (await confirmDialog({ title: `Excluir "${p.name}"?`, variant: "destructive", confirmText: "Excluir" })) delMut.mutate(p.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
          })}
        </div>
      </div>

      {selectedProductIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl bg-foreground px-5 py-3 text-background shadow-2xl animate-in fade-in slide-in-from-bottom-5">
          <span className="text-sm font-semibold">
            {selectedProductIds.length} selecionado(s)
          </span>
          <div className="h-4 w-px bg-background/20" />
          <Button
            size="sm"
            variant="secondary"
            className="h-8 text-xs font-semibold"
            onClick={() => handleBatchToggleAvailable(true)}
          >
            Ativar todos
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs font-semibold bg-background/10 text-background border-background/20 hover:bg-background/20"
            onClick={() => handleBatchToggleAvailable(false)}
          >
            Pausar todos
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-8 text-xs font-semibold"
            onClick={handleBatchDelete}
          >
            Excluir
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-background hover:bg-background/10"
            onClick={() => setSelectedProductIds([])}
          >
            ✕
          </Button>
        </div>
      )}

      {/* Main Product Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-h-[92vh] max-w-5xl overflow-y-auto"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
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
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* LADO ESQUERDO: Dados do Produto */}
                <div className="space-y-3.5 rounded-xl border p-4 bg-muted/10">
                  <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5 border-b pb-2">
                    <Package className="h-4 w-4 text-primary" /> Dados Principais
                  </h4>

                  <div>
                    <Label className="text-xs font-semibold">Nome do Produto</Label>
                    <Input
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      className="mt-1"
                      placeholder="Ex: X-Salada Bacon"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Categoria</Label>
                    <Select
                      value={editing.category_id ?? ""}
                      onValueChange={(v) => {
                        const cat = categories.find((c) => c.id === v);
                        setEditing({ ...editing, category_id: v, type: cat?.kind === "pizza" ? "pizza" : "standard" });
                      }}
                    >
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
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

                  <div>
                    <Label className="text-xs font-semibold">Descrição</Label>
                    <Textarea
                      value={editing.description}
                      onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                      className="mt-1 text-xs"
                      rows={3}
                      placeholder="Ex: Pão brioche, hambúrguer 160g, queijo prato, alface, tomate..."
                    />
                  </div>

                  <ImageUploader
                    label="Foto do produto"
                    value={editing.image_url}
                    onChange={(url) => setEditing({ ...editing, image_url: url })}
                    folder="produtos"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold">Preço base</Label>
                      <CurrencyInput value={editing.price} onChange={(v) => setEditing({ ...editing, price: v })} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Preço promo (opcional)</Label>
                      <CurrencyInput value={editing.promo_price ?? 0} onChange={(v) => setEditing({ ...editing, promo_price: v > 0 ? v : null })} className="mt-1" />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Tempo de preparo</Label>
                    <Input
                      value={editing.prep_time ?? ""}
                      onChange={(e) => setEditing({ ...editing, prep_time: e.target.value })}
                      className="mt-1"
                      placeholder="Ex: 25 min"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="flex items-center justify-between rounded-lg border bg-background p-2.5">
                      <Label className="text-xs font-medium cursor-pointer">Disponível</Label>
                      <Switch checked={editing.available} onCheckedChange={(v) => setEditing({ ...editing, available: v })} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-background p-2.5">
                      <Label className="text-xs font-medium cursor-pointer">Em destaque</Label>
                      <Switch checked={editing.featured} onCheckedChange={(v) => setEditing({ ...editing, featured: v })} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-background p-2.5">
                      <Label className="text-xs font-medium cursor-pointer">🔥 Mais vendido</Label>
                      <Switch checked={editing.bestseller} onCheckedChange={(v) => setEditing({ ...editing, bestseller: v })} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-background p-2.5">
                      <Label className="text-xs font-medium cursor-pointer">Aceita observação</Label>
                      <Switch checked={editing.allow_observations} onCheckedChange={(v) => setEditing({ ...editing, allow_observations: v })} />
                    </div>
                  </div>

                  {isPizzaria && currentProduct && (
                    <div className="border-t pt-3 mt-2">
                      <h4 className="font-semibold text-xs text-muted-foreground mb-2">Tamanhos (Pizzaria)</h4>
                      <SizesEditor
                        productId={currentProduct.id}
                        sizes={currentProduct.sizes ?? []}
                        onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "products"] })}
                      />
                    </div>
                  )}
                </div>

                {/* LADO DIREITO: Observações e Complementos */}
                <div className="space-y-4">
                  {/* Grupos de Observação */}
                  <div className="rounded-xl border p-4 bg-card space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm flex items-center gap-1.5">
                          <MessageSquare className="h-4 w-4 text-primary" /> Grupos de Observação
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Perguntas/opções que o cliente escolhe (ex: Ponto da carne).
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1 shrink-0"
                        onClick={() => openInlineGroupModal("observacao")}
                      >
                        <Plus className="h-3.5 w-3.5" /> Criar novo grupo
                      </Button>
                    </div>

                    {obsGroups.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-4 text-center bg-muted/20">
                        <p className="text-xs text-muted-foreground font-medium">Nenhum grupo de observações cadastrado ainda.</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Ex: "Ponto da carne", "Remover ingredientes".</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="mt-2.5 h-7 text-xs gap-1"
                          onClick={() => openInlineGroupModal("observacao")}
                        >
                          <Plus className="h-3 w-3" /> + Cadastrar primeiro grupo
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-2 pt-1 max-h-56 overflow-y-auto pr-1">
                        {obsGroups.map((g) => {
                          const isCategoryTarget = !!editing.category_id && g.targets.some((t) => t.category_id === editing.category_id);
                          const isChecked = selectedGroupIds.includes(g.id) || isCategoryTarget;
                          const optionsText = g.options.map((o) => o.name).join(", ");
                          return (
                            <label
                              key={g.id}
                              className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all hover:border-primary/50 ${
                                isChecked ? "border-primary/60 bg-primary/5" : "bg-background"
                              }`}
                            >
                              <Checkbox
                                checked={isChecked}
                                disabled={isCategoryTarget}
                                onCheckedChange={(v) => {
                                  if (isCategoryTarget) return;
                                  setSelectedGroupIds((prev) =>
                                    v ? [...prev, g.id] : prev.filter((id) => id !== g.id)
                                  );
                                }}
                                className="mt-0.5"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">{g.name}</span>
                                  {g.required ? (
                                    <Badge variant="destructive" className="h-4 text-[10px] px-1">Obrigatório</Badge>
                                  ) : (
                                    <Badge variant="outline" className="h-4 text-[10px] px-1 text-muted-foreground">Opcional</Badge>
                                  )}
                                  {isCategoryTarget && (
                                    <Badge variant="secondary" className="h-4 text-[10px] px-1 text-primary">Toda a Categoria</Badge>
                                  )}
                                </div>
                                {optionsText && (
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                    Opções: {optionsText}
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Subcategorias de Adicionais */}
                  <div className="rounded-xl border p-4 bg-card space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm flex items-center gap-1.5">
                          <Layers className="h-4 w-4 text-primary" /> Subcategorias de Adicionais
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Itens complementares cobrados que o cliente pode adicionar.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1 shrink-0"
                        onClick={() => openInlineGroupModal("adicional")}
                      >
                        <Plus className="h-3.5 w-3.5" /> Criar nova subcategoria
                      </Button>
                    </div>

                    {addonSubcats.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-4 text-center bg-muted/20">
                        <p className="text-xs text-muted-foreground font-medium">Nenhuma subcategoria de adicionais cadastrada ainda.</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Ex: "Molhos Extras", "Bebidas 2L", "Acompanhamentos".</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="mt-2.5 h-7 text-xs gap-1"
                          onClick={() => openInlineGroupModal("adicional")}
                        >
                          <Plus className="h-3 w-3" /> + Cadastrar primeira subcategoria
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-2 pt-1 max-h-56 overflow-y-auto pr-1">
                        {addonSubcats.map((g) => {
                          const isCategoryTarget = !!editing.category_id && g.targets.some((t) => t.category_id === editing.category_id);
                          const isChecked = selectedGroupIds.includes(g.id) || isCategoryTarget;
                          const optionsSummary = g.options
                            .map((o) => `${o.name} (${o.price > 0 ? brl(o.price) : "Grátis"})`)
                            .join(", ");
                          return (
                            <label
                              key={g.id}
                              className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all hover:border-primary/50 ${
                                isChecked ? "border-primary/60 bg-primary/5" : "bg-background"
                              }`}
                            >
                              <Checkbox
                                checked={isChecked}
                                disabled={isCategoryTarget}
                                onCheckedChange={(v) => {
                                  if (isCategoryTarget) return;
                                  setSelectedGroupIds((prev) =>
                                    v ? [...prev, g.id] : prev.filter((id) => id !== g.id)
                                  );
                                }}
                                className="mt-0.5"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">{g.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({g.min_select} a {g.max_select} itens)
                                  </span>
                                  {isCategoryTarget && (
                                    <Badge variant="secondary" className="h-4 text-[10px] px-1 text-primary">Toda a Categoria</Badge>
                                  )}
                                </div>
                                {optionsSummary && (
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                    Itens: {optionsSummary}
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t mt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={save} disabled={saveMut.isPending} className="px-6">
                  {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Produto"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Inline Modal for quick creation of Observation Groups or Addon Subcategories */}
      <Dialog open={inlineGroupOpen} onOpenChange={setInlineGroupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {inlineGroupKind === "observacao" ? "Novo Grupo de Observação" : "Nova Subcategoria de Adicionais"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold">Nome do Grupo</Label>
              <Input
                value={inlineGroupName}
                onChange={(e) => setInlineGroupName(e.target.value)}
                placeholder={inlineGroupKind === "observacao" ? "Ex: Ponto da carne" : "Ex: Molhos Extras"}
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <Label className="text-xs font-semibold">Preenchimento Obrigatório</Label>
                <p className="text-[11px] text-muted-foreground">O cliente deve escolher ao menos 1 item.</p>
              </div>
              <Switch
                checked={inlineGroupRequired}
                onCheckedChange={(v) => {
                  setInlineGroupRequired(v);
                  if (v && inlineGroupMin === 0) setInlineGroupMin(1);
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Mínimo de escolhas</Label>
                <Input
                  type="number"
                  min={0}
                  value={inlineGroupMin}
                  onChange={(e) => setInlineGroupMin(Math.max(0, parseInt(e.target.value) || 0))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Máximo de escolhas</Label>
                <Input
                  type="number"
                  min={1}
                  value={inlineGroupMax}
                  onChange={(e) => setInlineGroupMax(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Options list inside inline modal */}
            <div className="space-y-2 border-t pt-3">
              <Label className="text-xs font-semibold">Opções do Grupo</Label>
              {inlineOptions.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Nenhuma opção adicionada ainda.</p>
              )}
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {inlineOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs bg-muted/30">
                    <span className="font-medium">{opt.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-semibold">{opt.price > 0 ? brl(opt.price) : "Grátis"}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive"
                        onClick={() => setInlineOptions((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-end gap-2 pt-1">
                <div className="flex-1">
                  <Input
                    ref={inlineOptInputRef}
                    value={newOptName}
                    onChange={(e) => setNewOptName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddInlineOpt();
                      }
                    }}
                    placeholder={inlineGroupKind === "observacao" ? "Ex: Ao ponto" : "Ex: Molho Especial"}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="w-24">
                  <CurrencyInput
                    value={newOptPrice}
                    onChange={(v) => setNewOptPrice(v)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddInlineOpt();
                      }
                    }}
                    className="h-8 text-xs"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs gap-1"
                  onClick={handleAddInlineOpt}
                  disabled={!newOptName.trim()}
                >
                  <Plus className="h-3 w-3" /> Adicionar
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setInlineGroupOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSaveInlineGroup} disabled={isSavingInline || !inlineGroupName.trim()}>
              {isSavingInline ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Criar e Vincular"}
            </Button>
          </DialogFooter>
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
  currentProductSizes: { id: string; name: string; price: number; sort_order: number; category_size_id: string | null; fraction_prices?: Record<string, number> | null }[];
  allProducts: { id: string; name: string }[];
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const [tab, setTab] = useState<string>("detalhes");
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
        <TabsTrigger value="preco" disabled={!editing.id}>Preço</TabsTrigger>
        <TabsTrigger value="classificacao" disabled={!editing.id}>Classificação</TabsTrigger>
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

        <div className={`rounded-xl border p-3 ${editing.listed_as_flavor === null ? "border-destructive/60 bg-destructive/5" : ""}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Label className="text-sm font-semibold">Listar como sabor na montagem da pizza</Label>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Quando ativado, este item aparece como opção de sabor para o cliente montar pizzas (inclusive fracionadas — 1/2, 1/3, 1/4). Quando desativado, fica apenas como produto vendido inteiro.
              </p>
            </div>
            <Switch
              checked={editing.listed_as_flavor === true}
              onCheckedChange={(v) => setEditing({ ...editing, listed_as_flavor: v })}
            />
          </div>
          {editing.listed_as_flavor === null && (
            <p className="mt-2 text-[11px] font-medium text-destructive">
              Obrigatório: defina Sim ou Não antes de salvar.
            </p>
          )}
        </div>

        <DialogFooter className="pt-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSave} disabled={isSaving || !editing.name || editing.listed_as_flavor === null}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editing.id ? "Salvar" : "Continuar")}
          </Button>
        </DialogFooter>
      </TabsContent>

      <TabsContent value="preco" className="mt-4 space-y-3">
        {editing.id && editing.category_id && (
          <PizzaPriceMatrix
            productId={editing.id}
            categoryId={editing.category_id}
            existingSizes={currentProductSizes}
          />
        )}
        <DialogFooter className="pt-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => setTab("classificacao")}>Avançar</Button>
        </DialogFooter>
      </TabsContent>

      <TabsContent value="classificacao" className="mt-4 space-y-3">
        <div><Label>Tempo de preparo</Label><Input value={editing.prep_time ?? ""} onChange={(e) => setEditing({ ...editing, prep_time: e.target.value })} className="mt-1.5" placeholder="Ex: 30 min" /></div>
        <div className="flex items-center justify-between rounded-xl border p-3"><Label>Disponível</Label><Switch checked={editing.available} onCheckedChange={(v) => setEditing({ ...editing, available: v })} /></div>
        <div className="flex items-center justify-between rounded-xl border p-3"><Label>Em destaque</Label><Switch checked={editing.featured} onCheckedChange={(v) => setEditing({ ...editing, featured: v })} /></div>
        <div className="flex items-center justify-between rounded-xl border p-3"><Label>🔥 Mais vendido</Label><Switch checked={editing.bestseller} onCheckedChange={(v) => setEditing({ ...editing, bestseller: v })} /></div>
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
          <Button onClick={onSave} disabled={isSaving || editing.listed_as_flavor === null}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </TabsContent>
    </Tabs>
  );
}

function PizzaPriceMatrix({ productId, categoryId, existingSizes }: { productId: string; categoryId: string; existingSizes: { id: string; name: string; price: number; sort_order: number; category_size_id: string | null; fraction_prices?: Record<string, number> | null }[] }) {
  const qc = useQueryClient();
  const cfgQ = useQuery({
    queryKey: ["admin", "pizza-config", categoryId],
    queryFn: () => listCategoryPizzaConfig({ data: { category_id: categoryId } }),
  });

  const sizes = cfgQ.data?.sizes ?? [];
  const sizeMap = useMemo(() => {
    const m = new Map<string, { id: string; price: number; fraction_prices: Record<string, number> | null }>();
    for (const s of existingSizes) if (s.category_size_id) m.set(s.category_size_id, { id: s.id, price: Number(s.price), fraction_prices: s.fraction_prices ?? null });
    return m;
  }, [existingSizes]);

  const saveMut = useMutation({
    mutationFn: (d: { id?: string; product_id: string; name: string; price: number; sort_order: number; category_size_id: string; fraction_prices?: Record<string, number> }) => saveProductSize({ data: d }),
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
      <p className="mb-4 text-xs text-muted-foreground">Marque os tamanhos em que este sabor é vendido. Para pizzas fracionadas o valor é dividido automaticamente — você pode ajustar cada fração.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {sizes.map((sz) => {
          const existing = sizeMap.get(sz.id);
          const enabled = !!existing;
          const maxFlavors = (sz as { max_flavors?: number }).max_flavors ?? 1;
          return (
            <PriceCell
              key={sz.id}
              sizeName={sz.name}
              maxFlavors={maxFlavors}
              enabled={enabled}
              price={existing?.price ?? 0}
              fractionPrices={existing?.fraction_prices ?? null}
              onToggle={(v) => {
                if (!v && existing) delMut.mutate(existing.id);
                if (v && !existing) saveMut.mutate({ product_id: productId, name: sz.name, price: 0, sort_order: sz.sort_order, category_size_id: sz.id, fraction_prices: { "1": 0 } });
              }}
              onCommit={(price, fracs) => {
                if (existing) saveMut.mutate({ id: existing.id, product_id: productId, name: sz.name, price, sort_order: sz.sort_order, category_size_id: sz.id, fraction_prices: fracs });
                else if (price > 0) saveMut.mutate({ product_id: productId, name: sz.name, price, sort_order: sz.sort_order, category_size_id: sz.id, fraction_prices: fracs });
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function PriceCell({ sizeName, maxFlavors, enabled, price, fractionPrices, onToggle, onCommit }: {
  sizeName: string;
  maxFlavors: number;
  enabled: boolean;
  price: number;
  fractionPrices: Record<string, number> | null;
  onToggle: (v: boolean) => void;
  onCommit: (price: number, fracs: Record<string, number>) => void;
}) {
  const [full, setFull] = useState(price);
  const [fracs, setFracs] = useState<Record<string, number>>(() => fractionPrices ?? { "1": price });
  const [edited, setEdited] = useState<Set<string>>(new Set());

  useEffect(() => {
    setFull(price);
    setFracs(fractionPrices ?? { "1": price });
    setEdited(new Set());
  }, [price, fractionPrices]);

  const recompute = (base: number, keepEdited: Set<string>) => {
    const next: Record<string, number> = { "1": base };
    for (let n = 2; n <= maxFlavors; n++) {
      const key = String(n);
      next[key] = keepEdited.has(key) ? (fracs[key] ?? base / n) : Number((base / n).toFixed(2));
    }
    return next;
  };

  const handleFullCommit = (v: number) => {
    setFull(v);
    const next = recompute(v, edited);
    setFracs(next);
    onCommit(v, next);
  };
  const handleFracCommit = (key: string, v: number) => {
    const next = { ...fracs, [key]: v };
    const e2 = new Set(edited); e2.add(key);
    setEdited(e2);
    setFracs(next);
    onCommit(full, next);
  };
  const resetAuto = () => {
    setEdited(new Set());
    const next = recompute(full, new Set());
    setFracs(next);
    onCommit(full, next);
  };

  return (
    <div className="rounded-xl border p-3">
      <label className="flex items-center justify-between gap-2 cursor-pointer">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Checkbox checked={enabled} onCheckedChange={(v) => onToggle(!!v)} />
          🍕 {sizeName}
          {maxFlavors > 1 && <span className="text-xs text-muted-foreground">(até {maxFlavors} sabores)</span>}
        </span>
        {maxFlavors > 1 && enabled && (
          <button type="button" onClick={resetAuto} className="text-[11px] text-primary hover:underline">Recalcular</button>
        )}
      </label>
      <div className="mt-3 space-y-2">
        <div>
          <p className="mb-1 text-[11px] text-muted-foreground">Valor cheio (1 sabor)</p>
          <CurrencyBlurInput initialValue={full} onCommit={handleFullCommit} className="text-center" />
        </div>
        {maxFlavors > 1 && enabled && Array.from({ length: maxFlavors - 1 }, (_, i) => i + 2).map((n) => (
          <div key={n}>
            <p className="mb-1 text-[11px] text-muted-foreground">Valor 1/{n} (quando dividido em {n} sabores)</p>
            <CurrencyBlurInput initialValue={fracs[String(n)] ?? Number((full / n).toFixed(2))} onCommit={(v) => handleFracCommit(String(n), v)} className="text-center" />
          </div>
        ))}
      </div>
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
              onClick={async () => { if (await confirmDialog({ title: `Remover "${s.name}"?`, variant: "destructive", confirmText: "Remover" })) delMut.mutate(s.id); }}>
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
