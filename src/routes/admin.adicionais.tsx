import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput, CurrencyBlurInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Edit2, Trash2, Loader2, Layers, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import {
  listAddonGroups, saveAddonGroup, deleteAddonGroup,
  saveAddonOption, deleteAddonOption, setAddonGroupTargets,
  listMyCategories, listMyProducts,
} from "@/lib/catalog-admin.functions";

export const Route = createFileRoute("/admin/adicionais")({
  component: AdicionaisPage,
});

type AddonKind = "adicional" | "observacao";

type EditingGroup = {
  id?: string;
  name: string;
  kind: AddonKind;
  required: boolean;
  min_select: number;
  max_select: number;
  active: boolean;
  sort_order: number;
};

const labelFor = (k: AddonKind) => k === "observacao" ? "Observação" : "Adicional";
const labelForPlural = (k: AddonKind) => k === "observacao" ? "Observações" : "Adicionais";

function AdicionaisPage() {
  const qc = useQueryClient();
  const groupsQ = useQuery({
    queryKey: ["admin", "addon-groups"],
    queryFn: async () => (await listAddonGroups()).groups,
  });
  const catsQ = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => (await listMyCategories()).categories,
  });
  const prodsQ = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => (await listMyProducts()).products,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EditingGroup | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | AddonKind>("all");

  const groups = (groupsQ.data ?? []) as Array<{
    id: string; name: string; kind?: AddonKind; required: boolean;
    min_select: number; max_select: number; active: boolean; sort_order: number;
    options: { id: string; name: string; price: number; active: boolean; sort_order: number }[];
    targets: { id: string; group_id: string; category_id: string | null; product_id: string | null }[];
  }>;
  const categories = catsQ.data ?? [];
  const products = prodsQ.data ?? [];

  const filteredGroups = useMemo(() => {
    if (tab === "all") return groups;
    return groups.filter((g) => (g.kind ?? "adicional") === tab);
  }, [groups, tab]);

  const currentGroup = useMemo(() => groups.find((g) => g.id === editingId) ?? null, [groups, editingId]);

  const saveGroupMut = useMutation({
    mutationFn: (input: EditingGroup) => saveAddonGroup({ data: input }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin", "addon-groups"] });
      toast.success("Grupo salvo");
      if (!editingId) setEditingId(res.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteGroupMut = useMutation({
    mutationFn: (id: string) => deleteAddonGroup({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "addon-groups"] });
      toast.success("Grupo excluído");
      setOpen(false); setEditingId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = (kind: AddonKind = "adicional") => {
    setEditing({
      name: "", kind, required: false,
      min_select: 0, max_select: kind === "observacao" ? 10 : 1,
      active: true, sort_order: groups.length,
    });
    setEditingId(null);
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const g = groups.find((x) => x.id === id);
    if (!g) return;
    setEditing({
      id: g.id, name: g.name, kind: (g.kind ?? "adicional"),
      required: g.required, min_select: g.min_select, max_select: g.max_select,
      active: g.active, sort_order: g.sort_order,
    });
    setEditingId(g.id);
    setOpen(true);
  };

  return (
    <AdminLayout
      title="Adicionais"
      action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openNew("observacao")}>
            <MessageSquare className="mr-1 h-4 w-4" /> Nova observação
          </Button>
          <Button onClick={() => openNew("adicional")}>
            <Plus className="mr-1 h-4 w-4" /> Novo adicional
          </Button>
        </div>
      }
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="adicional">Adicionais</TabsTrigger>
          <TabsTrigger value="observacao">Observações</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {groupsQ.isLoading && (
          <Card><CardContent className="p-10 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </CardContent></Card>
        )}
        {!groupsQ.isLoading && filteredGroups.length === 0 && (
          <Card><CardContent className="p-10 text-center text-muted-foreground">
            <Layers className="mx-auto mb-2 h-8 w-8 opacity-50" />
            Nenhum grupo cadastrado ainda. Crie o primeiro!
          </CardContent></Card>
        )}
        {filteredGroups.map((g) => {
          const kind = (g.kind ?? "adicional") as AddonKind;
          return (
            <Card key={g.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{g.name}</p>
                    <Badge variant={kind === "observacao" ? "outline" : "secondary"}>{labelFor(kind)}</Badge>
                    {g.required && <Badge>Obrigatório</Badge>}
                    {!g.active && <Badge variant="destructive">Inativo</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {g.options.length} opç{g.options.length === 1 ? "ão" : "ões"} · min {g.min_select} / máx {g.max_select} · {g.targets.length} aplicaç{g.targets.length === 1 ? "ão" : "ões"}
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => openEdit(g.id)}><Edit2 className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive"
                  onClick={() => { if (confirm(`Excluir "${g.name}"?`)) deleteGroupMut.mutate(g.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? `Editar ${labelFor(editing.kind).toLowerCase()}` : `Novo grupo de ${labelForPlural(editing?.kind ?? "adicional").toLowerCase()}`}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <Tabs defaultValue="geral">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="geral">Geral</TabsTrigger>
                <TabsTrigger value="opcoes" disabled={!editing.id}>Opções</TabsTrigger>
                <TabsTrigger value="aplicar" disabled={!editing.id}>Categorias</TabsTrigger>
              </TabsList>

              <TabsContent value="geral" className="mt-4 space-y-3">
                <div>
                  <Label>Tipo</Label>
                  <RadioGroup
                    value={editing.kind}
                    onValueChange={(v) => setEditing({ ...editing, kind: v as AddonKind })}
                    className="mt-1.5 grid grid-cols-2 gap-2"
                  >
                    <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 ${editing.kind === "adicional" ? "border-primary bg-primary/5" : ""}`}>
                      <RadioGroupItem value="adicional" id="kind-add" />
                      <div>
                        <p className="text-sm font-medium">Adicional</p>
                        <p className="text-xs text-muted-foreground">Itens com preço (ex.: Bacon extra)</p>
                      </div>
                    </label>
                    <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 ${editing.kind === "observacao" ? "border-primary bg-primary/5" : ""}`}>
                      <RadioGroupItem value="observacao" id="kind-obs" />
                      <div>
                        <p className="text-sm font-medium">Observação</p>
                        <p className="text-xs text-muted-foreground">Marcações sem preço (ex.: Sem cebola)</p>
                      </div>
                    </label>
                  </RadioGroup>
                </div>
                <div>
                  <Label>Nome do grupo</Label>
                  <Input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="mt-1.5"
                    placeholder={editing.kind === "observacao" ? "Ex.: Observações do pedido" : "Ex.: Adicionais do lanche"}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Mín. seleção</Label><Input type="number" min={0} value={editing.min_select} onChange={(e) => setEditing({ ...editing, min_select: Number(e.target.value) })} className="mt-1.5" /></div>
                  <div><Label>Máx. seleção</Label><Input type="number" min={1} value={editing.max_select} onChange={(e) => setEditing({ ...editing, max_select: Number(e.target.value) })} className="mt-1.5" /></div>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3"><Label>Obrigatório</Label><Switch checked={editing.required} onCheckedChange={(v) => setEditing({ ...editing, required: v })} /></div>
                <div className="flex items-center justify-between rounded-xl border p-3"><Label>Ativo</Label><Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /></div>
                <DialogFooter className="pt-3">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={() => saveGroupMut.mutate(editing)} disabled={saveGroupMut.isPending || !editing.name}>
                    {saveGroupMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                  </Button>
                </DialogFooter>
              </TabsContent>

              <TabsContent value="opcoes" className="mt-4">
                {currentGroup && (
                  <OptionsEditor
                    groupId={currentGroup.id}
                    kind={(currentGroup.kind ?? "adicional") as AddonKind}
                    options={currentGroup.options}
                    onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "addon-groups"] })}
                  />
                )}
              </TabsContent>

              <TabsContent value="aplicar" className="mt-4">
                {currentGroup && (
                  <TargetsEditor
                    groupId={currentGroup.id}
                    categories={categories}
                    products={products}
                    initialCategoryIds={currentGroup.targets.filter((t) => t.category_id).map((t) => t.category_id as string)}
                    initialProductIds={currentGroup.targets.filter((t) => t.product_id).map((t) => t.product_id as string)}
                    onSaved={() => qc.invalidateQueries({ queryKey: ["admin", "addon-groups"] })}
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

function OptionsEditor({ groupId, kind, options, onChanged }: {
  groupId: string;
  kind: AddonKind;
  options: { id: string; name: string; price: number; active: boolean; sort_order: number }[];
  onChanged: () => void;
}) {
  const showPrice = kind === "adicional";
  const [draft, setDraft] = useState({ name: "", price: 0 });
  const saveMut = useMutation({
    mutationFn: (input: { id?: string; group_id: string; name: string; price: number; active: boolean; sort_order: number }) =>
      saveAddonOption({ data: input }),
    onSuccess: () => { onChanged(); setDraft({ name: "", price: 0 }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteAddonOption({ data: { id } }),
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {options.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma opção ainda.</p>}
        {options.map((o) => (
          <div key={o.id} className="flex items-center gap-2 rounded-xl border p-2">
            <Input className="flex-1" defaultValue={o.name}
              onBlur={(e) => e.target.value !== o.name && saveMut.mutate({ id: o.id, group_id: groupId, name: e.target.value, price: Number(o.price), active: o.active, sort_order: o.sort_order })} />
            {showPrice && (
              <CurrencyBlurInput className="w-28" initialValue={Number(o.price)}
                onCommit={(v) => saveMut.mutate({ id: o.id, group_id: groupId, name: o.name, price: v, active: o.active, sort_order: o.sort_order })} />
            )}
            <Switch checked={o.active}
              onCheckedChange={(v) => saveMut.mutate({ id: o.id, group_id: groupId, name: o.name, price: Number(o.price), active: v, sort_order: o.sort_order })} />
            <Button size="icon" variant="ghost" className="text-destructive"
              onClick={() => { if (confirm(`Remover "${o.name}"?`)) delMut.mutate(o.id); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-2 border-t pt-3">
        <div className="flex-1">
          <Label className="text-xs">Nova {kind === "observacao" ? "observação" : "opção"}</Label>
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={kind === "observacao" ? "Ex.: Sem cebola" : "Nome"} className="mt-1" />
        </div>
        {showPrice && (
          <div className="w-24"><Label className="text-xs">Preço</Label><Input type="number" step="0.10" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} className="mt-1" /></div>
        )}
        <Button onClick={() => {
          if (!draft.name) return;
          saveMut.mutate({ group_id: groupId, name: draft.name, price: showPrice ? draft.price : 0, active: true, sort_order: options.length });
        }} disabled={saveMut.isPending || !draft.name}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function TargetsEditor({ groupId, categories, products, initialCategoryIds, initialProductIds, onSaved }: {
  groupId: string;
  categories: { id: string; name: string }[];
  products: { id: string; name: string; category_id: string | null }[];
  initialCategoryIds: string[];
  initialProductIds: string[];
  onSaved: () => void;
}) {
  const [catIds, setCatIds] = useState<string[]>(initialCategoryIds);
  const [prodIds, setProdIds] = useState<string[]>(initialProductIds);

  const mut = useMutation({
    mutationFn: () => setAddonGroupTargets({ data: { group_id: groupId, category_ids: catIds, product_ids: prodIds } }),
    onSuccess: () => { onSaved(); toast.success("Aplicação salva"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (arr: string[], id: string) => arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-semibold">Aplicar a categorias</Label>
        <p className="text-xs text-muted-foreground">Vale para todos os produtos da categoria.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {categories.length === 0 && <p className="text-sm text-muted-foreground">Sem categorias.</p>}
          {categories.map((c) => (
            <label key={c.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${catIds.includes(c.id) ? "border-primary bg-primary/10 text-primary" : ""}`}>
              <Checkbox checked={catIds.includes(c.id)} onCheckedChange={() => setCatIds((p) => toggle(p, c.id))} />
              {c.name}
            </label>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-sm font-semibold">Aplicar a produtos específicos</Label>
        <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border p-2">
          {products.length === 0 && <p className="text-sm text-muted-foreground">Sem produtos.</p>}
          {products.map((p) => (
            <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted">
              <Checkbox checked={prodIds.includes(p.id)} onCheckedChange={() => setProdIds((prev) => toggle(prev, p.id))} />
              {p.name}
            </label>
          ))}
        </div>
      </div>
      <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="w-full">
        {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar aplicação"}
      </Button>
    </div>
  );
}
