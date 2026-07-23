import { confirmDialog } from "@/hooks/useConfirm";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Loader2, Layers } from "lucide-react";
import { ReorderButtons } from "@/components/admin/ReorderButtons";
import { toast } from "sonner";
import {
  listAddonGroups, saveAddonGroup, deleteAddonGroup,
  saveAddonOption, deleteAddonOption, setAddonGroupTargets,
  listMyCategories, listMyProducts,
} from "@/lib/catalog-admin.functions";

import { PlanGate } from "@/components/subscription/PlanGate";

export const Route = createFileRoute("/admin/observacoes")({
  component: () => (
    <PlanGate min="pro" title="Grupos de observação" featureLabel="Grupos de observação">
      <ObservacoesPage />
    </PlanGate>
  ),
});


type GroupDraft = {
  id?: string;
  name: string;
  description: string;
  required: boolean;
  min_select: number;
  max_select: number;
  active: boolean;
  sort_order: number;
  category_ids: string[];
  product_ids: string[];
};

function emptyDraft(): GroupDraft {
  return {
    name: "", description: "", required: true,
    min_select: 1, max_select: 1, active: true, sort_order: 0,
    category_ids: [], product_ids: [],
  };
}

function ObservacoesPage() {
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

  const allGroups = groupsQ.data ?? [];
  const groups = useMemo(
    () => allGroups.filter((g) => g.kind === "observacao"),
    [allGroups],
  );
  const categories = catsQ.data ?? [];
  const products = prodsQ.data ?? [];
  const catName = useMemo(
    () => new Map(categories.map((c) => [c.id as string, c.name as string])),
    [categories],
  );
  const prodName = useMemo(
    () => new Map(products.map((p) => [p.id as string, p.name as string])),
    [products],
  );

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<GroupDraft | null>(null);
  const [newOption, setNewOption] = useState("");

  const saveMut = useMutation({
    mutationFn: async (d: GroupDraft) => {
      const res = await saveAddonGroup({
        data: {
          id: d.id, name: d.name, description: d.description,
          kind: "observacao", required: d.required,
          min_select: d.min_select, max_select: d.max_select,
          active: d.active, sort_order: d.sort_order,
        },
      });
      await setAddonGroupTargets({
        data: { group_id: res.id, category_ids: d.category_ids, product_ids: d.product_ids },
      });
      return res;
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin", "addon-groups"] });
      toast.success("Grupo salvo");
      // Mantém aberto se for novo (para adicionar opções)
      if (draft && !draft.id) setDraft({ ...draft, id: res.id });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delGroupMut = useMutation({
    mutationFn: (id: string) => deleteAddonGroup({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "addon-groups"] });
      toast.success("Grupo excluído");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addOptionMut = useMutation({
    mutationFn: (input: { group_id: string; name: string; sort_order: number }) =>
      saveAddonOption({
        data: {
          group_id: input.group_id, name: input.name, price: 0,
          active: true, sort_order: input.sort_order,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "addon-groups"] });
      setNewOption("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delOptionMut = useMutation({
    mutationFn: (id: string) => deleteAddonOption({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "addon-groups"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => {
    setDraft(emptyDraft());
    setOpen(true);
  };

  const openEdit = (g: typeof groups[number]) => {
    setDraft({
      id: g.id,
      name: g.name,
      description: (g as { description?: string }).description ?? "",
      required: g.required,
      min_select: g.min_select,
      max_select: g.max_select,
      active: g.active,
      sort_order: g.sort_order,
      category_ids: g.targets.filter((t) => t.category_id).map((t) => t.category_id as string),
      product_ids: g.targets.filter((t) => t.product_id).map((t) => t.product_id as string),
    });
    setOpen(true);
  };

  const currentGroup = useMemo(
    () => (draft?.id ? groups.find((g) => g.id === draft.id) ?? null : null),
    [groups, draft?.id],
  );

  return (
    <AdminLayout
      title="Grupos de observação"
      action={
        <Button onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" /> Novo grupo
        </Button>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Crie subcategorias de observação (ex.: "Escolha o arroz", "Ponto da carne") com
        opções, regras de obrigatoriedade e aplicação por categoria ou produto.
      </p>

      <div className="space-y-3">
        {groupsQ.isLoading && (
          <Card><CardContent className="p-10 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </CardContent></Card>
        )}
        {!groupsQ.isLoading && groups.length === 0 && (
          <Card><CardContent className="p-10 text-center text-muted-foreground">
            <Layers className="mx-auto mb-2 h-8 w-8 opacity-50" />
            Nenhum grupo cadastrado ainda.
          </CardContent></Card>
        )}
        {groups.map((g, idx) => {
          const cats = g.targets.filter((t) => t.category_id).map((t) => catName.get(t.category_id as string)).filter(Boolean) as string[];
          const prods = g.targets.filter((t) => t.product_id).map((t) => prodName.get(t.product_id as string)).filter(Boolean) as string[];
          return (
            <Card key={g.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <ReorderButtons entity="addonGroup" id={g.id} invalidateKeys={[["admin", "addon-groups"]]} isFirst={idx === 0} isLast={idx === groups.length - 1} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{g.name}</p>
                    {g.required && <Badge variant="destructive">Obrigatório</Badge>}
                    <Badge variant="secondary">
                      {g.max_select <= 1 ? "Escolha 1" : `Escolha ${g.min_select}–${g.max_select}`}
                    </Badge>
                    <Badge variant="outline">{g.options.length} opções</Badge>
                    {!g.active && <Badge variant="destructive">Inativo</Badge>}
                  </div>
                  {(g as { description?: string }).description && (
                    <p className="mt-1 text-xs text-muted-foreground">{(g as { description?: string }).description}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cats.length + prods.length === 0
                      ? "Sem alvos — não aparecerá no cardápio"
                      : [
                          cats.length ? `Categorias: ${cats.join(", ")}` : "",
                          prods.length ? `Produtos: ${prods.join(", ")}` : "",
                        ].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(g)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="text-destructive"
                    onClick={async () => { if (await confirmDialog({ title: `Excluir grupo "${g.name}"?`, variant: "destructive", confirmText: "Excluir" })) delGroupMut.mutate(g.id); }}
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
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Editar grupo" : "Novo grupo de observação"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div>
                <Label>Nome do grupo</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="mt-1.5"
                  placeholder="Ex.: Escolha o arroz, Ponto da carne"
                />
              </div>

              <div>
                <Label>Instruções para o cliente (opcional)</Label>
                <Textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  className="mt-1.5"
                  placeholder="Ex.: Escolha como prefere o ponto da carne"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 flex items-center justify-between rounded-xl border p-3">
                  <Label>Obrigatório</Label>
                  <Switch
                    checked={draft.required}
                    onCheckedChange={(v) => setDraft({ ...draft, required: v, min_select: v && draft.min_select < 1 ? 1 : draft.min_select })}
                  />
                </div>
                <div>
                  <Label>Mínimo</Label>
                  <Input
                    type="number" min={0} max={20}
                    value={draft.min_select}
                    onChange={(e) => setDraft({ ...draft, min_select: Math.max(0, Number(e.target.value) || 0) })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Máximo</Label>
                  <Input
                    type="number" min={1} max={20}
                    value={draft.max_select}
                    onChange={(e) => setDraft({ ...draft, max_select: Math.max(1, Number(e.target.value) || 1) })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Ordem</Label>
                  <Input
                    type="number" min={0}
                    value={draft.sort_order}
                    onChange={(e) => setDraft({ ...draft, sort_order: Math.max(0, Number(e.target.value) || 0) })}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label>Aplicar a categorias</Label>
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border p-2">
                  {categories.length === 0 && (
                    <p className="px-2 py-1 text-sm text-muted-foreground">Sem categorias cadastradas.</p>
                  )}
                  {categories.map((c) => {
                    const checked = draft.category_ids.includes(c.id as string);
                    return (
                      <label key={c.id as string} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() =>
                            setDraft({
                              ...draft,
                              category_ids: checked
                                ? draft.category_ids.filter((x) => x !== c.id)
                                : [...draft.category_ids, c.id as string],
                            })
                          }
                        />
                        {c.name}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>Aplicar a produtos específicos (opcional)</Label>
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border p-2">
                  {products.length === 0 && (
                    <p className="px-2 py-1 text-sm text-muted-foreground">Sem produtos cadastrados.</p>
                  )}
                  {products.map((p) => {
                    const checked = draft.product_ids.includes(p.id as string);
                    return (
                      <label key={p.id as string} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() =>
                            setDraft({
                              ...draft,
                              product_ids: checked
                                ? draft.product_ids.filter((x) => x !== p.id)
                                : [...draft.product_ids, p.id as string],
                            })
                          }
                        />
                        {p.name}
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

              {/* Opções — só após salvar o grupo */}
              {draft.id && currentGroup && (
                <div className="rounded-xl border p-3">
                  <p className="mb-2 font-semibold">Opções</p>
                  {currentGroup.options.length === 0 && (
                    <p className="text-sm text-muted-foreground">Adicione as opções abaixo.</p>
                  )}
                  <div className="space-y-2">
                    {currentGroup.options.map((o) => (
                      <div key={o.id} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                        <span className="text-sm">{o.name}</span>
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                          onClick={() => delOptionMut.mutate(o.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Input
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      placeholder="Ex.: Arroz branco"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newOption.trim() && draft.id) {
                          e.preventDefault();
                          addOptionMut.mutate({
                            group_id: draft.id, name: newOption.trim(),
                            sort_order: currentGroup.options.length,
                          });
                        }
                      }}
                    />
                    <Button
                      onClick={() => {
                        if (!draft.id || !newOption.trim()) return;
                        addOptionMut.mutate({
                          group_id: draft.id, name: newOption.trim(),
                          sort_order: currentGroup.options.length,
                        });
                      }}
                      disabled={addOptionMut.isPending || !newOption.trim()}
                    >
                      {addOptionMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
                <Button
                  onClick={() => draft && saveMut.mutate(draft)}
                  disabled={saveMut.isPending || !draft.name.trim()}
                >
                  {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (draft.id ? "Salvar" : "Continuar")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
