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
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Loader2, Pizza, UtensilsCrossed, Settings2, Tag } from "lucide-react";
import { ReorderButtons } from "@/components/admin/ReorderButtons";
import { toast } from "sonner";
import {
  listMyCategories, saveCategory, deleteCategory,
} from "@/lib/catalog-admin.functions";
import { getMyTenant } from "@/lib/tenants.functions";
import type { DbCategory } from "@/lib/db-types";
import { PizzaCategoryConfigDialog } from "@/components/admin/PizzaCategoryConfigDialog";
import { useConfirm } from "@/hooks/useConfirm";


export const Route = createFileRoute("/admin/categorias")({
  component: CategoriesPage,
});

type Editing = {
  id?: string;
  name: string;
  description: string;
  sort_order: number;
  active: boolean;
  kind: "standard" | "pizza" | "oferta";
};

function CategoriesPage() {
  const qc = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();
  const tenantQ = useQuery({
    queryKey: ["tenant-probe"],
    queryFn: () => getMyTenant({ data: {} }),
  });
  const hasTenant = !!tenantQ.data?.tenant?.id;
  const isPizzaria = (tenantQ.data?.tenant?.business_types ?? []).includes("pizzaria");
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => (await listMyCategories()).categories,
    enabled: hasTenant,
    retry: false,
  });



  const [pickerOpen, setPickerOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [pizzaCfg, setPizzaCfg] = useState<{ id: string; name: string } | null>(null);

  const saveMut = useMutation({
    mutationFn: (input: Editing) => saveCategory({ data: input }),
    onSuccess: (res, input) => {
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast.success("Categoria salva");
      setOpen(false);
      // Se for pizza recém-criada, abrir wizard de configuração
      if (input.kind === "pizza" && !input.id && res.id) {
        setPizzaCfg({ id: res.id, name: input.name });
      }
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
          sort_order: c.sort_order, active: !c.active, kind: c.kind ?? "standard",
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const list = data ?? [];

  const openNew = (kind: "standard" | "pizza" | "oferta") => {
    setPickerOpen(false);
    setEditing({ name: "", description: "", sort_order: list.length + 1, active: true, kind });
    setOpen(true);
  };

  const save = () => {
    if (!editing?.name) return toast.error("Nome obrigatório");
    saveMut.mutate(editing);
  };

  return (
    <AdminLayout title="Categorias" action={<Button onClick={() => setPickerOpen(true)}><Plus className="mr-1 h-4 w-4" /> Nova categoria</Button>}>
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
            {list.map((c, idx) => (
              <li key={c.id} className="flex items-center gap-3 p-3">
                <ReorderButtons
                  entity="category"
                  id={c.id}
                  invalidateKeys={[["admin", "categories"]]}
                  isFirst={idx === 0}
                  isLast={idx === list.length - 1}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{c.name}</p>
                    {c.kind === "pizza" && <Badge className="bg-primary/15 text-primary border-0"><Pizza className="mr-1 h-3 w-3" /> Pizza</Badge>}
                    {c.kind === "oferta" && <Badge className="bg-success/15 text-success border-0"><Tag className="mr-1 h-3 w-3" /> Oferta do Dia</Badge>}
                  </div>
                  {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                </div>
                {c.kind === "pizza" && (
                  <Button size="sm" variant="outline" onClick={() => setPizzaCfg({ id: c.id, name: c.name })}>
                    <Settings2 className="mr-1 h-4 w-4" /> Configurar
                  </Button>
                )}
                <Switch checked={c.active} onCheckedChange={() => toggleMut.mutate(c)} />
                <Button size="icon" variant="ghost" onClick={() => {
                  setEditing({
                    id: c.id, name: c.name, description: c.description ?? "",
                    sort_order: c.sort_order, active: c.active, kind: c.kind ?? "standard",
                  });
                  setOpen(true);
                }}><Edit2 className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive"
                  onClick={async () => { if (await confirm({ title: `Excluir "${c.name}"?`, variant: "destructive", confirmText: "Excluir" })) delMut.mutate(c.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Picker: Nova categoria → escolher modelo */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Nova categoria</DialogTitle>
            <p className="text-sm text-muted-foreground">Selecione o modelo de categoria para dividir o seu cardápio</p>
          </DialogHeader>
          <div className="space-y-3">
            <button onClick={() => openNew("standard")}
              className="w-full rounded-xl border-2 p-4 text-left transition hover:border-primary hover:bg-primary/5">
              <div className="flex items-start gap-3">
                <UtensilsCrossed className="mt-1 h-6 w-6 text-primary" />
                <div>
                  <p className="font-bold">Itens principais</p>
                  <p className="text-sm text-muted-foreground">Comidas, lanches, sobremesas, etc.</p>
                </div>
              </div>
            </button>
            {isPizzaria && (
              <>
                <button onClick={() => openNew("pizza")}
                  className="w-full rounded-xl border-2 p-4 text-left transition hover:border-primary hover:bg-primary/5">
                  <div className="flex items-start gap-3">
                    <Pizza className="mt-1 h-6 w-6 text-primary" />
                    <div>
                      <p className="font-bold">Pizza</p>
                      <p className="text-sm text-muted-foreground">Defina o tamanho, tipos de massa, bordas e sabores</p>
                    </div>
                  </div>
                </button>
                <button onClick={() => openNew("oferta")}
                  className="w-full rounded-xl border-2 p-4 text-left transition hover:border-primary hover:bg-primary/5">
                  <div className="flex items-start gap-3">
                    <Tag className="mt-1 h-6 w-6 text-success" />
                    <div>
                      <p className="font-bold">Oferta do Dia</p>
                      <p className="text-sm text-muted-foreground">Pizzas promocionais fechadas com sabores e brindes já definidos</p>
                    </div>
                  </div>
                </button>
              </>
            )}

          </div>
        </DialogContent>
      </Dialog>

      {/* Edit / Create form */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar" : "Nova"} categoria {editing?.kind === "pizza" && <Badge className="ml-2 bg-primary/15 text-primary border-0">Pizza</Badge>}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Nome da categoria</Label><Input value={editing.name} maxLength={40} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1.5" placeholder="Exemplo: Carros chefe ou promoção" /><p className="text-right text-[10px] text-muted-foreground">{editing.name.length}/40 caracteres</p></div>
              <div><Label>Descrição</Label><Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Ordem</Label><Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} className="mt-1.5" /></div>
              <div className="flex items-center justify-between rounded-xl border p-3"><Label>Ativa</Label><Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saveMut.isPending || !editing?.name}>
              {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (editing?.kind === "pizza" ? "Próximo" : "Salvar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pizzaCfg && (
        <PizzaCategoryConfigDialog
          open={!!pizzaCfg}
          onOpenChange={(v) => !v && setPizzaCfg(null)}
          categoryId={pizzaCfg.id}
          categoryName={pizzaCfg.name}
        />
      )}
    </AdminLayout>
  );
}
