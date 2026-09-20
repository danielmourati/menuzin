import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Loader2, Layers, Lock, CheckCircle2, Sparkles } from "lucide-react";
import { ReorderButtons } from "@/components/admin/ReorderButtons";
import { toast } from "sonner";
import {
  listAddonGroups, saveAddonGroup, deleteAddonGroup,
  saveAddonOption, deleteAddonOption, setAddonGroupTargets,
  listMyCategories, listMyProducts,
} from "@/lib/catalog-admin.functions";

import { PlanGate } from "@/components/subscription/PlanGate";
import { confirmDialog } from "@/hooks/useConfirm";

export const Route = createFileRoute("/admin/adicionais")({
  component: () => (
    <PlanGate min="pro" title="Adicionais" featureLabel="Grupos de adicionais">
      <AdicionaisPage />
    </PlanGate>
  ),
});


type DraftOption = { id?: string; name: string; price: number };

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
  options: DraftOption[];
};

const moneyBR = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function emptyDraft(): GroupDraft {
  return {
    name: "", description: "", required: false,
    min_select: 0, max_select: 10, active: true, sort_order: 0,
    category_ids: [], product_ids: [], options: [],
  };
}

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

  const allGroups = groupsQ.data ?? [];
  const groups = useMemo(
    () => allGroups.filter((g) => g.kind === "adicional"),
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
  const [newOption, setNewOption] = useState<DraftOption>({ name: "", price: 0 });
  const [catSearch, setCatSearch] = useState("");
  const [prodSearch, setProdSearch] = useState("");
  const optInputRef = useRef<HTMLInputElement>(null);

  const saveCategoryOnlyMut = useMutation({
    mutationFn: async (d: GroupDraft) => {
      const res = await saveAddonGroup({
        data: {
          id: d.id, name: d.name, description: d.description,
          kind: "adicional", required: d.required,
          min_select: d.min_select, max_select: d.max_select,
          active: d.active, sort_order: d.sort_order,
        },
      });
      return res;
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin", "addon-groups"] });
      toast.success(draft?.id ? "Dados da categoria atualizados!" : "Categoria salva com sucesso! Agora cadastre os itens e vínculos abaixo.");
      setDraft((prev) => (prev ? { ...prev, id: res.id } : prev));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMut = useMutation({
    mutationFn: async (d: GroupDraft) => {
      // 1. Save group
      const res = await saveAddonGroup({
        data: {
          id: d.id, name: d.name, description: d.description,
          kind: "adicional", required: d.required,
          min_select: d.min_select, max_select: d.max_select,
          active: d.active, sort_order: d.sort_order,
        },
      });

      // 2. Save targets
      await setAddonGroupTargets({
        data: { group_id: res.id, category_ids: d.category_ids, product_ids: d.product_ids },
      });

      // 3. Save all options ensuring exact sort_order (0, 1, 2...)
      for (let i = 0; i < d.options.length; i++) {
        const opt = d.options[i];
        await saveAddonOption({
          data: {
            id: opt.id,
            group_id: res.id,
            name: opt.name,
            price: opt.price,
            active: true,
            sort_order: i,
          },
        });
      }

      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "addon-groups"] });
      toast.success("Categoria de adicionais concluída e salva com sucesso!");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delGroupMut = useMutation({
    mutationFn: (id: string) => deleteAddonGroup({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "addon-groups"] });
      toast.success("Categoria de adicionais excluída");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => {
    setDraft(emptyDraft());
    setNewOption({ name: "", price: 0 });
    setCatSearch("");
    setProdSearch("");
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
      options: g.options.map((o) => ({ id: o.id, name: o.name, price: o.price, sort_order: o.sort_order })),
    });
    setNewOption({ name: "", price: 0 });
    setCatSearch("");
    setProdSearch("");
    setOpen(true);
  };

  const handleAddOption = async () => {
    if (!newOption.name.trim() || !draft) return;
    const optName = newOption.name.trim();
    const optPrice = newOption.price;

    if (draft.id) {
      try {
        const res = await saveAddonOption({
          data: {
            group_id: draft.id,
            name: optName,
            price: optPrice,
            active: true,
            sort_order: draft.options.length,
          },
        });
        setDraft((prev) =>
          prev ? { ...prev, options: [...prev.options, { id: res.id, name: optName, price: optPrice }] } : prev
        );
        qc.invalidateQueries({ queryKey: ["admin", "addon-groups"] });
      } catch (e: any) {
        toast.error(e?.message || "Erro ao adicionar opção");
        return;
      }
    } else {
      setDraft((prev) =>
        prev ? { ...prev, options: [...prev.options, { name: optName, price: optPrice }] } : prev
      );
    }

    setNewOption({ name: "", price: 0 });
    setTimeout(() => optInputRef.current?.focus(), 50);
  };

  const handleRemoveOption = async (index: number, optId?: string) => {
    if (optId) {
      try {
        await deleteAddonOption({ data: { id: optId } });
        qc.invalidateQueries({ queryKey: ["admin", "addon-groups"] });
      } catch (e: any) {
        toast.error(e?.message || "Erro ao remover opção");
        return;
      }
    }
    setDraft((prev) =>
      prev ? { ...prev, options: prev.options.filter((_, i) => i !== index) } : prev
    );
  };

  // Coleta opções já salvas em todos os grupos da loja para reaproveitamento inteligente
  const savedOptionsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of allGroups) {
      for (const o of g.options) {
        if (o.name && !map.has(o.name.trim())) {
          map.set(o.name.trim(), o.price);
        }
      }
    }
    return map;
  }, [allGroups]);

  const savedOptionsList = useMemo(
    () => Array.from(savedOptionsMap.entries()).map(([name, price]) => ({ name, price })),
    [savedOptionsMap]
  );

  const handleOptionNameChange = (val: string) => {
    const trimmed = val.trim();
    const existingPrice = savedOptionsMap.get(trimmed);
    if (existingPrice !== undefined && newOption.price === 0) {
      setNewOption({ name: val, price: existingPrice });
    } else {
      setNewOption({ ...newOption, name: val });
    }
  };

  const handleImportFromGroup = (sourceGroupId: string) => {
    const sourceGroup = allGroups.find((g) => g.id === sourceGroupId);
    if (!sourceGroup || !draft) return;
    const existingNames = new Set(draft.options.map((o) => o.name.toLowerCase().trim()));
    const toAdd = sourceGroup.options
      .filter((o) => !existingNames.has(o.name.toLowerCase().trim()))
      .map((o) => ({ name: o.name, price: o.price }));

    if (toAdd.length === 0) {
      toast.info("Todas as opções dessa categoria já foram adicionadas.");
      return;
    }

    setDraft({
      ...draft,
      options: [...draft.options, ...toAdd],
    });
    toast.success(`${toAdd.length} adicional(ais) importado(s) de "${sourceGroup.name}"!`);
  };

  const handleQuickAddOption = async (optName: string, optPrice: number) => {
    if (!draft) return;
    if (draft.options.some((o) => o.name.toLowerCase().trim() === optName.toLowerCase().trim())) {
      toast.info("Este adicional já está na lista.");
      return;
    }

    if (draft.id) {
      try {
        const res = await saveAddonOption({
          data: {
            group_id: draft.id,
            name: optName,
            price: optPrice,
            active: true,
            sort_order: draft.options.length,
          },
        });
        setDraft((prev) =>
          prev ? { ...prev, options: [...prev.options, { id: res.id, name: optName, price: optPrice }] } : prev
        );
        qc.invalidateQueries({ queryKey: ["admin", "addon-groups"] });
        toast.success(`"${optName}" adicionado!`);
      } catch (e: any) {
        toast.error(e?.message || "Erro ao adicionar opção");
      }
    } else {
      setDraft((prev) =>
        prev ? { ...prev, options: [...prev.options, { name: optName, price: optPrice }] } : prev
      );
    }
  };

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.name.toLowerCase().includes(catSearch.toLowerCase())),
    [categories, catSearch]
  );

  const filteredProducts = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(prodSearch.toLowerCase())),
    [products, prodSearch]
  );

  return (
    <AdminLayout
      title="Adicionais"
      action={
        <Button onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" /> Nova categoria de adicionais
        </Button>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Cadastre e organize os adicionais em categorias de adicionais (ex.: "Adicionais de Arroz", "Saladas",
        "Bebidas extras") para facilitar a seleção do cliente no cardápio digital.
      </p>

      <div className="space-y-3">
        {groupsQ.isLoading && (
          <Card><CardContent className="p-10 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </CardContent></Card>
        )}
        {!groupsQ.isLoading && groups.length === 0 && (
          <Card className="border-dashed border-2">
            <CardContent className="p-10 text-center flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-foreground mb-1">Nenhuma categoria de adicionais criada ainda</h3>
              <p className="text-xs text-muted-foreground max-w-sm mb-4">
                Crie categorias para oferecer ingredientes extras, molhos, bebidas ou adicionais cobrados à parte no seu cardápio.
              </p>
              <Button onClick={() => openNew()} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm">
                <Plus className="h-4 w-4" /> Cadastrar primeira categoria de adicionais
              </Button>
            </CardContent>
          </Card>
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
                      {g.max_select <= 1 ? "Escolha 1" : `Até ${g.max_select}`}
                    </Badge>
                    <Badge variant="outline">{g.options.length} opções</Badge>
                    {!g.active && <Badge variant="destructive">Inativa</Badge>}
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
                    onClick={async () => { if (await confirmDialog({ title: `Excluir categoria "${g.name}"?`, variant: "destructive", confirmText: "Excluir" })) delGroupMut.mutate(g.id); }}
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
        <DialogContent className="max-h-[90vh] max-w-4xl sm:max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Editar categoria de adicionais" : "Nova categoria de adicionais"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* COLUNA ESQUERDA: Dados Gerais e Cadastro de Adicionais */}
                <div className="space-y-4">
                  {/* Card 1: Dados da Categoria de Adicionais */}
                  <div className="rounded-xl border p-4 space-y-3.5 bg-background shadow-sm">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                        1. Dados da Categoria de Adicionais
                        {draft.id && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      </h4>
                      {draft.id && <Badge variant="secondary" className="text-[10px]">Salvo</Badge>}
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">Nome da categoria</Label>
                      <Input
                        value={draft.name}
                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        className="mt-1"
                        placeholder="Ex.: Adicionais de Arroz, Molhos, Bebidas extras"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">Instruções para o cliente (opcional)</Label>
                      <Textarea
                        value={draft.description}
                        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                        className="mt-1"
                        placeholder="Ex.: Escolha porções extras para acompanhar"
                        rows={2}
                      />
                    </div>

                    <div className="rounded-xl border p-3 space-y-3 bg-muted/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs font-semibold">Obrigatório</Label>
                          <p className="text-[11px] text-muted-foreground">Exige escolha do cliente</p>
                        </div>
                        <Switch
                          checked={draft.required}
                          onCheckedChange={(v) => setDraft({ ...draft, required: v, min_select: v && draft.min_select < 1 ? 1 : draft.min_select })}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-[11px]">Mínimo</Label>
                          <Input
                            type="number" min={0} max={20}
                            value={draft.min_select}
                            onChange={(e) => setDraft({ ...draft, min_select: Math.max(0, Number(e.target.value) || 0) })}
                            className="mt-0.5 h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px]">Máximo</Label>
                          <Input
                            type="number" min={1} max={20}
                            value={draft.max_select}
                            onChange={(e) => setDraft({ ...draft, max_select: Math.max(1, Number(e.target.value) || 1) })}
                            className="mt-0.5 h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px]">Ordem</Label>
                          <Input
                            type="number" min={0}
                            value={draft.sort_order}
                            onChange={(e) => setDraft({ ...draft, sort_order: Math.max(0, Number(e.target.value) || 0) })}
                            className="mt-0.5 h-8 text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t">
                        <Label className="text-xs font-semibold">Categoria ativa</Label>
                        <Switch
                          checked={draft.active}
                          onCheckedChange={(v) => setDraft({ ...draft, active: v })}
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={() => draft && saveCategoryOnlyMut.mutate(draft)}
                      disabled={saveCategoryOnlyMut.isPending || !draft.name.trim()}
                      className="w-full gap-2 font-semibold shadow-sm"
                      variant={draft.id ? "outline" : "default"}
                    >
                      {saveCategoryOnlyMut.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : draft.id ? (
                        "Atualizar Dados da Categoria"
                      ) : (
                        "Salvar e Criar Categoria"
                      )}
                    </Button>
                  </div>

                  {/* Card 2: Cadastro de Adicionais (Opções) */}
                  <div className={`rounded-xl border p-3.5 space-y-3 bg-background shadow-sm transition-all ${
                    !draft.id ? "opacity-50 pointer-events-none select-none border-dashed bg-muted/20" : ""
                  }`}>
                    {!draft.id && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 font-semibold flex items-center gap-2">
                        <Lock className="h-4 w-4 shrink-0 text-amber-600" />
                        <span>Salve a Categoria acima para liberar o cadastro de itens.</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold text-sm">Itens de Adicionais</Label>
                      <Badge variant="outline">{draft.options.length} item(ns)</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Informe a descrição e o valor do adicional.
                    </p>

                    {/* Importar de categoria existente */}
                    {allGroups.length > 0 && draft.id && (
                      <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/40 text-xs">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="text-muted-foreground whitespace-nowrap">Copiar de:</span>
                        <select
                          className="h-7 text-xs bg-background border rounded px-2 w-full text-foreground"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleImportFromGroup(e.target.value);
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="" disabled>Selecione uma categoria cadastrada...</option>
                          {allGroups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name} ({g.options.length} itens)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {draft.options.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic bg-muted/20 p-2.5 rounded-md text-center">
                        Nenhum adicional adicionado ainda. Cadastre abaixo.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {draft.options.map((o, idx) => (
                          <div key={o.id || idx} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-1.5">
                            <span className="text-xs font-medium">{o.name}</span>
                            <div className="flex items-center gap-1.5">
                              <Badge variant={o.price > 0 ? "default" : "secondary"} className="text-[11px]">
                                {o.price > 0 ? moneyBR(o.price) : "Grátis"}
                              </Badge>
                              {o.id && (
                                <ReorderButtons
                                  entity="addonOption"
                                  id={o.id}
                                  invalidateKeys={[["admin", "addon-groups"]]}
                                  isFirst={idx === 0}
                                  isLast={idx === draft.options.length - 1}
                                />
                              )}
                              <Button
                                size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveOption(idx, o.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Datalist com opções/adicionais já cadastrados */}
                    <datalist id="saved-adicionais-options-list">
                      {savedOptionsList.map((so) => (
                        <option key={so.name} value={so.name}>
                          {so.price > 0 ? moneyBR(so.price) : "Grátis"}
                        </option>
                      ))}
                    </datalist>

                    <div className="grid grid-cols-[1fr_130px_auto] gap-2 pt-1">
                      <Input
                        ref={optInputRef}
                        list="saved-adicionais-options-list"
                        value={newOption.name}
                        onChange={(e) => handleOptionNameChange(e.target.value)}
                        placeholder="Ex.: Queijo extra, Molho especial"
                        className="h-9 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddOption();
                          }
                        }}
                      />
                      <CurrencyInput
                        value={newOption.price}
                        onChange={(v) => setNewOption({ ...newOption, price: v })}
                        className="h-9 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddOption();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={handleAddOption}
                        disabled={!newOption.name.trim()}
                        size="sm"
                        className="h-9 px-3 gap-1"
                      >
                        <Plus className="h-4 w-4" /> Adicionar
                      </Button>
                    </div>

                    {/* Chips de sugestões rápidas de adicionais já salvos */}
                    {savedOptionsList.length > 0 && draft.id && (
                      <div className="space-y-1 pt-1.5 border-t border-dashed">
                        <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-amber-500" /> Clique para adicionar itens salvos da loja:
                        </p>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                          {savedOptionsList
                            .filter((so) => !draft.options.some((o) => o.name.toLowerCase().trim() === so.name.toLowerCase().trim()))
                            .map((so) => (
                              <button
                                key={so.name}
                                type="button"
                                onClick={() => handleQuickAddOption(so.name, so.price)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] bg-background hover:bg-muted font-medium transition-colors border-muted-foreground/20 text-foreground"
                              >
                                <Plus className="h-2.5 w-2.5" />
                                <span>{so.name}</span>
                                {so.price > 0 && <span className="text-muted-foreground font-normal">({moneyBR(so.price)})</span>}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUNA DIREITA: Vincular a Categorias e Produtos */}
                <div className={`space-y-4 lg:border-l lg:pl-6 transition-all ${
                  !draft.id ? "opacity-50 pointer-events-none select-none" : ""
                }`}>
                  <h4 className="font-semibold text-sm border-b pb-2 text-foreground">2. Vincular a Categorias ou Produtos</h4>
                  {!draft.id ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 font-semibold flex items-center gap-2">
                      <Lock className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>Salve a Categoria de Adicionais à esquerda para liberar os vínculos.</span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Escolha em quais categorias de produtos ou produtos específicos esta categoria de adicionais vai aparecer.
                    </p>
                  )}

                  {/* Categorias de Produtos */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-xs font-semibold">Aplicar a categorias de produtos</Label>
                      {draft.category_ids.length > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {draft.category_ids.length} selecionada(s)
                        </Badge>
                      )}
                    </div>
                    {categories.length > 5 && (
                      <Input
                        value={catSearch}
                        onChange={(e) => setCatSearch(e.target.value)}
                        placeholder="Buscar categoria de produto..."
                        className="mb-1.5 h-7 text-xs"
                      />
                    )}
                    <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border p-2 bg-muted/10">
                      {categories.length === 0 && (
                        <p className="px-2 py-2 text-xs text-muted-foreground text-center">Nenhuma categoria cadastrada.</p>
                      )}
                      {filteredCategories.map((c) => {
                        const checked = draft.category_ids.includes(c.id as string);
                        return (
                          <label key={c.id as string} className="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-xs hover:bg-muted/50 transition-colors">
                            <span className="flex items-center gap-2">
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
                              <span className={checked ? "font-semibold text-foreground" : "text-muted-foreground"}>{c.name}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Produtos específicos */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-xs font-semibold">Aplicar a produtos específicos (opcional)</Label>
                      {draft.product_ids.length > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {draft.product_ids.length} selecionado(s)
                        </Badge>
                      )}
                    </div>
                    {products.length > 5 && (
                      <Input
                        value={prodSearch}
                        onChange={(e) => setProdSearch(e.target.value)}
                        placeholder="Buscar produto..."
                        className="mb-1.5 h-7 text-xs"
                      />
                    )}
                    <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border p-2 bg-muted/10">
                      {products.length === 0 && (
                        <p className="px-2 py-2 text-xs text-muted-foreground text-center">Nenhum produto cadastrado.</p>
                      )}
                      {filteredProducts.map((p) => {
                        const checked = draft.product_ids.includes(p.id as string);
                        return (
                          <label key={p.id as string} className="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-xs hover:bg-muted/50 transition-colors">
                            <span className="flex items-center gap-2">
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
                              <span className={checked ? "font-semibold text-foreground" : "text-muted-foreground"}>{p.name}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
                <Button
                  onClick={() => draft && saveMut.mutate(draft)}
                  disabled={saveMut.isPending || !draft.name.trim() || !draft.id}
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar e Concluir"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
}


