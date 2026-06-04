import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, Loader2, Layers, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import {
  listAddonItems, saveAddonItem, deleteAddonItem,
  listMyCategories,
  type AddonItem,
} from "@/lib/catalog-admin.functions";

export const Route = createFileRoute("/admin/adicionais")({
  component: AdicionaisPage,
});

type Kind = "adicional" | "observacao";

type Draft = {
  id?: string;
  name: string;
  kind: Kind;
  price: number;
  active: boolean;
  categoryIds: string[];
};

const moneyBR = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function AdicionaisPage() {
  const qc = useQueryClient();
  const itemsQ = useQuery({
    queryKey: ["admin", "addon-items"],
    queryFn: async () => (await listAddonItems()).items as AddonItem[],
  });
  const catsQ = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => (await listMyCategories()).categories,
  });

  const items = itemsQ.data ?? [];
  const categories = catsQ.data ?? [];
  const catName = useMemo(
    () => new Map(categories.map((c) => [c.id as string, c.name as string])),
    [categories],
  );

  const [tab, setTab] = useState<"all" | Kind>("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const filtered = useMemo(() => {
    if (tab === "all") return items;
    return items.filter((i) => i.kind === tab);
  }, [items, tab]);

  const saveMut = useMutation({
    mutationFn: (d: Draft) => saveAddonItem({ data: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "addon-items"] });
      toast.success("Salvo");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteAddonItem({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "addon-items"] });
      toast.success("Excluído");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggleMut = useMutation({
    mutationFn: (it: AddonItem) =>
      saveAddonItem({
        data: {
          id: it.id, name: it.name, kind: it.kind, price: it.price,
          active: !it.active, categoryIds: it.categoryIds,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "addon-items"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = (kind: Kind) => {
    setDraft({ name: "", kind, price: 0, active: true, categoryIds: [] });
    setOpen(true);
  };

  const openEdit = (it: AddonItem) => {
    setDraft({
      id: it.id, name: it.name, kind: it.kind, price: it.price,
      active: it.active, categoryIds: it.categoryIds,
    });
    setOpen(true);
  };

  return (
    <AdminLayout
      title="Adicionais e observações"
      action={
        <div className="flex flex-wrap gap-2">
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
        {itemsQ.isLoading && (
          <Card><CardContent className="p-10 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </CardContent></Card>
        )}
        {!itemsQ.isLoading && filtered.length === 0 && (
          <Card><CardContent className="p-10 text-center text-muted-foreground">
            <Layers className="mx-auto mb-2 h-8 w-8 opacity-50" />
            Nenhum item cadastrado ainda.
          </CardContent></Card>
        )}
        {filtered.map((it) => {
          const cats = it.categoryIds.map((id) => catName.get(id)).filter(Boolean) as string[];
          return (
            <Card key={it.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{it.name}</p>
                    <Badge variant={it.kind === "observacao" ? "outline" : "secondary"}>
                      {it.kind === "observacao" ? "Observação" : "Adicional"}
                    </Badge>
                    {it.kind === "adicional" && (
                      <Badge variant="default">{moneyBR(it.price)}</Badge>
                    )}
                    {!it.active && <Badge variant="destructive">Inativo</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cats.length === 0
                      ? "Sem categorias aplicadas — não aparecerá no cardápio"
                      : `Categorias: ${cats.join(", ")}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={it.active}
                    onCheckedChange={() => toggleMut.mutate(it)}
                    aria-label="Ativo"
                  />
                  <Button size="icon" variant="ghost" onClick={() => openEdit(it)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="text-destructive"
                    onClick={() => { if (confirm(`Excluir "${it.name}"?`)) delMut.mutate(it.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {draft?.id
                ? `Editar ${draft.kind === "observacao" ? "observação" : "adicional"}`
                : `Novo ${draft?.kind === "observacao" ? "observação" : "adicional"}`}
            </DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="mt-1.5"
                  placeholder={draft.kind === "observacao" ? "Ex.: Sem cebola" : "Ex.: Bacon extra"}
                />
              </div>

              {draft.kind === "adicional" && (
                <div>
                  <Label>Preço</Label>
                  <CurrencyInput
                    value={draft.price}
                    onChange={(v) => setDraft({ ...draft, price: v })}
                    className="mt-1.5"
                  />
                </div>
              )}

              <div>
                <Label>Aplicar a categorias</Label>
                <p className="text-xs text-muted-foreground">
                  O item aparecerá para todos os produtos das categorias selecionadas.
                </p>
                <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border p-2">
                  {categories.length === 0 && (
                    <p className="px-2 py-1 text-sm text-muted-foreground">Sem categorias cadastradas.</p>
                  )}
                  {categories.map((c) => {
                    const checked = draft.categoryIds.includes(c.id as string);
                    return (
                      <label key={c.id as string} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() =>
                            setDraft({
                              ...draft,
                              categoryIds: checked
                                ? draft.categoryIds.filter((x) => x !== c.id)
                                : [...draft.categoryIds, c.id as string],
                            })
                          }
                        />
                        {c.name}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border p-3">
                <Label>Ativo</Label>
                <Switch
                  checked={draft.active}
                  onCheckedChange={(v) => setDraft({ ...draft, active: v })}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => saveMut.mutate(draft)}
                  disabled={saveMut.isPending || !draft.name.trim()}
                >
                  {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
