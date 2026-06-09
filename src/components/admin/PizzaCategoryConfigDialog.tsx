import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import {
  listCategoryPizzaConfig,
  saveCategoryPizzaSize, deleteCategoryPizzaSize,
  saveCategoryPizzaDough, deleteCategoryPizzaDough,
  saveCategoryPizzaCrust, deleteCategoryPizzaCrust,
} from "@/lib/catalog-admin.functions";

export function PizzaCategoryConfigDialog({
  open, onOpenChange, categoryId, categoryName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categoryId: string;
  categoryName: string;
}) {
  const qc = useQueryClient();
  const cfgQ = useQuery({
    queryKey: ["admin", "pizza-config", categoryId],
    queryFn: () => listCategoryPizzaConfig({ data: { category_id: categoryId } }),
    enabled: open,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "pizza-config", categoryId] });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{categoryName}</DialogTitle>
          <p className="text-sm text-muted-foreground">Detalhes da categoria pizza</p>
        </DialogHeader>

        {cfgQ.isLoading && (
          <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        )}

        {cfgQ.data && (
          <Tabs defaultValue="tamanhos">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tamanhos">Tamanhos</TabsTrigger>
              <TabsTrigger value="massas">Massas</TabsTrigger>
              <TabsTrigger value="bordas">Bordas</TabsTrigger>
            </TabsList>

            <TabsContent value="tamanhos" className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Indique quais os tamanhos das pizzas, em quantos pedaços são cortadas e até quantos sabores cada tamanho monta.
              </p>
              <SizesTable
                sizes={cfgQ.data.sizes}
                onChange={invalidate}
                categoryId={categoryId}
              />
              <ResumoTamanhos sizes={cfgQ.data.sizes} />
            </TabsContent>

            <TabsContent value="massas" className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Defina as opções de massas que seus clientes terão como escolha.
              </p>
              <ExtraTable
                items={cfgQ.data.doughs}
                onChange={invalidate}
                categoryId={categoryId}
                addLabel="+ Adicionar massa"
                colName="Massa"
                save={(d) => saveCategoryPizzaDough({ data: d })}
                remove={(id) => deleteCategoryPizzaDough({ data: { id } })}
              />
            </TabsContent>

            <TabsContent value="bordas" className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Cadastre as bordas (recheada, tradicional…) que o cliente pode escolher.
              </p>
              <ExtraTable
                items={cfgQ.data.crusts}
                onChange={invalidate}
                categoryId={categoryId}
                addLabel="+ Adicionar borda"
                colName="Borda"
                save={(d) => saveCategoryPizzaCrust({ data: d })}
                remove={(id) => deleteCategoryPizzaCrust({ data: { id } })}
              />
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type PizzaSize = { id: string; category_id: string; name: string; pieces: number; max_flavors: number; pdv_code: string | null; active: boolean; sort_order: number };

function SizesTable({ sizes, onChange, categoryId }: { sizes: PizzaSize[]; onChange: () => void; categoryId: string }) {
  const [draft, setDraft] = useState({ name: "", pieces: 8, max_flavors: 1 });
  const saveMut = useMutation({
    mutationFn: (d: Parameters<typeof saveCategoryPizzaSize>[0]["data"]) => saveCategoryPizzaSize({ data: d }),
    onSuccess: () => { onChange(); setDraft({ name: "", pieces: 8, max_flavors: 1 }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteCategoryPizzaSize({ data: { id } }),
    onSuccess: onChange,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-xl border">
      <div className="grid grid-cols-[1fr_120px_180px_120px_40px] gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium">
        <div>Nome</div>
        <div>Qtd. Pedaços</div>
        <div>Qtd. Sabores</div>
        <div>Status</div>
        <div></div>
      </div>
      {sizes.map((s) => (
        <SizeRow key={s.id} size={s} onSave={(d) => saveMut.mutate(d)} onDelete={() => { if (confirm(`Remover "${s.name}"?`)) delMut.mutate(s.id); }} />
      ))}
      <div className="grid grid-cols-[1fr_120px_180px_120px_40px] items-center gap-2 px-3 py-3">
        <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex: Pequena" />
        <Input type="number" min={1} max={24} value={draft.pieces} onChange={(e) => setDraft({ ...draft, pieces: Number(e.target.value) })} />
        <FlavorsPicker value={draft.max_flavors} onChange={(v) => setDraft({ ...draft, max_flavors: v })} />
        <div className="text-xs text-muted-foreground">Ativo</div>
        <Button size="icon" variant="ghost" disabled={!draft.name || saveMut.isPending}
          onClick={() => saveMut.mutate({ category_id: categoryId, name: draft.name, pieces: draft.pieces, max_flavors: draft.max_flavors, active: true, sort_order: sizes.length, pdv_code: "" })}>
          <Plus className="h-4 w-4 text-primary" />
        </Button>
      </div>
    </div>
  );
}

function SizeRow({ size, onSave, onDelete }: { size: PizzaSize; onSave: (d: Parameters<typeof saveCategoryPizzaSize>[0]["data"]) => void; onDelete: () => void }) {
  return (
    <div className="grid grid-cols-[1fr_120px_180px_120px_40px] items-center gap-2 border-b px-3 py-2">
      <Input defaultValue={size.name} onBlur={(e) => e.target.value !== size.name && onSave({ id: size.id, category_id: size.category_id, name: e.target.value, pieces: size.pieces, max_flavors: size.max_flavors, active: size.active, sort_order: size.sort_order, pdv_code: size.pdv_code ?? "" })} />
      <Input type="number" min={1} max={24} defaultValue={size.pieces} onBlur={(e) => Number(e.target.value) !== size.pieces && onSave({ id: size.id, category_id: size.category_id, name: size.name, pieces: Number(e.target.value), max_flavors: size.max_flavors, active: size.active, sort_order: size.sort_order, pdv_code: size.pdv_code ?? "" })} />
      <FlavorsPicker value={size.max_flavors} onChange={(v) => onSave({ id: size.id, category_id: size.category_id, name: size.name, pieces: size.pieces, max_flavors: v, active: size.active, sort_order: size.sort_order, pdv_code: size.pdv_code ?? "" })} />
      <div className="flex items-center gap-2">
        <Switch checked={size.active} onCheckedChange={(v) => onSave({ id: size.id, category_id: size.category_id, name: size.name, pieces: size.pieces, max_flavors: size.max_flavors, active: v, sort_order: size.sort_order, pdv_code: size.pdv_code ?? "" })} />
        <span className="text-xs">{size.active ? "Ativado" : "Pausado"}</span>
      </div>
      <Button size="icon" variant="ghost" className="text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}

function FlavorsPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition ${value >= n ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground"}`}>
          {n}
        </button>
      ))}
    </div>
  );
}

function ResumoTamanhos({ sizes }: { sizes: PizzaSize[] }) {
  if (sizes.length === 0) return null;
  return (
    <div>
      <h4 className="mb-3 font-bold">Resumo e status de venda</h4>
      <div className="grid gap-3 sm:grid-cols-3">
        {sizes.map((s) => (
          <div key={s.id} className="rounded-xl border p-3 text-center">
            <div className="text-2xl">🍕</div>
            <p className="mt-1 font-semibold">{s.name}</p>
            <p className="text-xs text-muted-foreground">Cortada em {s.pieces} pedaço{s.pieces > 1 ? "s" : ""}</p>
            <p className="text-xs text-muted-foreground">Aceita até {s.max_flavors} sabor{s.max_flavors > 1 ? "es" : ""}</p>
            <p className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${s.active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {s.active ? "Ativado" : "Pausado"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

type Extra = { id: string; category_id: string; name: string; extra_price: number; pdv_code: string | null; active: boolean; sort_order: number };
type ExtraInput = { id?: string; category_id: string; name: string; extra_price: number; pdv_code: string; active: boolean; sort_order: number };

function ExtraTable({
  items, onChange, categoryId, addLabel, colName, save, remove,
}: {
  items: Extra[];
  onChange: () => void;
  categoryId: string;
  addLabel: string;
  colName: string;
  save: (d: ExtraInput) => Promise<{ id: string }>;
  remove: (id: string) => Promise<{ ok: boolean }>;
}) {
  const [draft, setDraft] = useState({ name: "", extra_price: 0 });
  const saveMut = useMutation({
    mutationFn: save,
    onSuccess: () => { onChange(); setDraft({ name: "", extra_price: 0 }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: remove,
    onSuccess: onChange,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-xl border">
      <div className="grid grid-cols-[1fr_140px_140px_40px] gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium">
        <div>{colName}</div>
        <div>Preço</div>
        <div>Status</div>
        <div></div>
      </div>
      {items.map((it) => (
        <div key={it.id} className="grid grid-cols-[1fr_140px_140px_40px] items-center gap-2 border-b px-3 py-2">
          <Input defaultValue={it.name}
            onBlur={(e) => e.target.value !== it.name && saveMut.mutate({ id: it.id, category_id: it.category_id, name: e.target.value, extra_price: it.extra_price, pdv_code: it.pdv_code ?? "", active: it.active, sort_order: it.sort_order })} />
          <CurrencyInput value={Number(it.extra_price)}
            onChange={(v) => saveMut.mutate({ id: it.id, category_id: it.category_id, name: it.name, extra_price: v, pdv_code: it.pdv_code ?? "", active: it.active, sort_order: it.sort_order })} />
          <div className="flex items-center gap-2">
            <Switch checked={it.active} onCheckedChange={(v) => saveMut.mutate({ id: it.id, category_id: it.category_id, name: it.name, extra_price: it.extra_price, pdv_code: it.pdv_code ?? "", active: v, sort_order: it.sort_order })} />
            <span className="text-xs">{it.active ? "Ativado" : "Pausado"}</span>
          </div>
          <Button size="icon" variant="ghost" className="text-destructive"
            onClick={() => { if (confirm(`Remover "${it.name}"?`)) delMut.mutate(it.id); }}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <div className="px-3 py-3">
        <div className="grid grid-cols-[1fr_140px_140px_40px] items-center gap-2">
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={`Nome da ${colName.toLowerCase()}`} />
          <CurrencyInput value={draft.extra_price} onChange={(v) => setDraft({ ...draft, extra_price: v })} />
          <div className="text-xs text-muted-foreground">Ativo</div>
          <Button size="icon" variant="ghost" disabled={!draft.name || saveMut.isPending}
            onClick={() => saveMut.mutate({ category_id: categoryId, name: draft.name, extra_price: draft.extra_price, pdv_code: "", active: true, sort_order: items.length })}>
            <Plus className="h-4 w-4 text-primary" />
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{addLabel}: digite acima e pressione +. Preço cobrado adicional. Total: {brl(items.reduce((s, x) => s + Number(x.extra_price), 0))}.</p>
      </div>
    </div>
  );
}
