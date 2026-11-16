import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { confirmDialog } from "@/hooks/useConfirm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Plus, Trash2, Loader2, Zap, Check } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import type { DbCategoryPizzaSize } from "@/lib/db-types";
import {
  listCategoryPizzaConfig,
  saveCategoryPizzaSize, deleteCategoryPizzaSize,
  saveCategoryPizzaDough, deleteCategoryPizzaDough,
  saveCategoryPizzaCrust, deleteCategoryPizzaCrust,
} from "@/lib/catalog-admin.functions";

export type PizzaPriceRule = "sum_fractions" | "max_value" | "fixed";

export type PizzaCategoryFlavorMode = "single" | "half" | "multi";

export type PizzaSizePreset = {
  name: string;
  pieces: number;
  max_flavors: number;
  standard?: boolean;
};

export const DEFAULT_PIZZA_SIZES_PRESET: PizzaSizePreset[] = [
  { name: "Brotinho", pieces: 4, max_flavors: 1, standard: false },
  { name: "Pequena", pieces: 4, max_flavors: 2, standard: true },
  { name: "Média", pieces: 6, max_flavors: 2, standard: true },
  { name: "Grande", pieces: 8, max_flavors: 3, standard: true },
  { name: "Família", pieces: 12, max_flavors: 4, standard: true },
];

export const STANDARD_PIZZA_SIZES_PRESET = DEFAULT_PIZZA_SIZES_PRESET.filter((s) => s.standard);

export const DEFAULT_PIZZA_DOUGHS_PRESET = [
  { name: "Tradicional", extra_price: 0 },
  { name: "Massa Fina", extra_price: 0 },
  { name: "Massa Pan", extra_price: 0 },
];

export const DEFAULT_PIZZA_CRUSTS_PRESET = [
  { name: "Tradicional (sem recheio)", extra_price: 0 },
  { name: "Catupiry", extra_price: 0 },
  { name: "Cheddar", extra_price: 0 },
  { name: "Cream Cheese", extra_price: 0 },
  { name: "Chocolate", extra_price: 0 },
];

const normName = (v: string) => v.trim().toLowerCase();

const MODE_STORAGE_PREFIX = "menuzin_pizza_cat_mode_";

export function getStoredPizzaCategoryMode(
  categoryId: string | null | undefined,
): PizzaCategoryFlavorMode | null {
  if (!categoryId || typeof window === "undefined") return null;
  const val = window.localStorage.getItem(`${MODE_STORAGE_PREFIX}${categoryId}`);
  if (val === "single" || val === "half" || val === "multi") return val;
  return null;
}

export function setStoredPizzaCategoryMode(
  categoryId: string,
  mode: PizzaCategoryFlavorMode | boolean,
): void {
  if (!categoryId || typeof window === "undefined") return;
  const resolved: PizzaCategoryFlavorMode =
    typeof mode === "boolean" ? (mode ? "multi" : "single") : mode;
  window.localStorage.setItem(`${MODE_STORAGE_PREFIX}${categoryId}`, resolved);
}

export function getPizzaCategoryFlavorMode(
  categoryId: string | null | undefined,
  sizes?: { max_flavors?: number; price_rule?: string | null }[],
): PizzaCategoryFlavorMode {
  const stored = getStoredPizzaCategoryMode(categoryId);
  if (sizes && sizes.length > 0) {
    if (sizes.every((s) => s.price_rule === "fixed" && (s.max_flavors ?? 1) <= 1)) {
      return "single";
    }
    const maxF = Math.max(...sizes.map((s) => s.max_flavors ?? 1));
    if (stored === "half" && maxF <= 2) return "half";
    if (stored === "multi" && maxF >= 2) return "multi";
    if (maxF <= 2) return "half";
    return "multi";
  }
  return stored ?? "half";
}

export function isSingleFlavorPizzaCategory(
  categoryId: string | null | undefined,
  sizes?: { max_flavors?: number; price_rule?: string | null }[],
): boolean {
  return getPizzaCategoryFlavorMode(categoryId, sizes) === "single";
}

export async function applyPizzaCategoryFlavorMode(
  categoryId: string,
  sizes: DbCategoryPizzaSize[],
  mode: PizzaCategoryFlavorMode | boolean,
): Promise<void> {
  const resolved: PizzaCategoryFlavorMode =
    typeof mode === "boolean" ? (mode ? "multi" : "single") : mode;
  setStoredPizzaCategoryMode(categoryId, resolved);
  if (sizes.length === 0) return;

  await Promise.all(
    sizes.map((s) => {
      if (resolved === "single") {
        return saveCategoryPizzaSize({
          data: {
            id: s.id,
            category_id: s.category_id,
            name: s.name,
            pieces: s.pieces,
            max_flavors: 1,
            pdv_code: s.pdv_code ?? "",
            active: s.active,
            sort_order: s.sort_order,
            price_rule: "fixed",
          },
        });
      }

      const preset = DEFAULT_PIZZA_SIZES_PRESET.find((p) => normName(p.name) === normName(s.name));
      const isBrotinho = normName(s.name) === "brotinho";
      const nextMax =
        resolved === "half"
          ? isBrotinho
            ? 1
            : 2
          : preset
            ? Math.max(s.max_flavors, preset.max_flavors)
            : s.max_flavors > 2
              ? s.max_flavors
              : isBrotinho
                ? 1
                : 3;

      const nextRule: PizzaPriceRule =
        s.price_rule && s.price_rule !== "fixed" ? s.price_rule : "sum_fractions";

      return saveCategoryPizzaSize({
        data: {
          id: s.id,
          category_id: s.category_id,
          name: s.name,
          pieces: s.pieces,
          max_flavors: nextMax,
          pdv_code: s.pdv_code ?? "",
          active: s.active,
          sort_order: s.sort_order,
          price_rule: nextRule,
        },
      });
    }),
  );
}

export function PizzaCategoryBehaviorSelector({
  value,
  allowMultipleFlavors,
  onChange,
  onModeChange,
  disabled = false,
}: {
  value?: PizzaCategoryFlavorMode;
  allowMultipleFlavors?: boolean;
  onChange?: (allowMultiple: boolean) => void;
  onModeChange?: (mode: PizzaCategoryFlavorMode) => void;
  disabled?: boolean;
}) {
  const currentMode: PizzaCategoryFlavorMode =
    value ?? (allowMultipleFlavors === false ? "single" : "half");

  const handleSelect = (mode: PizzaCategoryFlavorMode) => {
    onModeChange?.(mode);
    onChange?.(mode !== "single");
  };

  const options: {
    mode: PizzaCategoryFlavorMode;
    title: string;
    desc: string;
  }[] = [
    {
      mode: "single",
      title: "Apenas 1 sabor (Inteira fixa)",
      desc: "Venda somente de pizza inteira com preço fixo por tamanho (sem divisão).",
    },
    {
      mode: "half",
      title: "Meio a Meio (Até 2 sabores)",
      desc: "O cliente pode pedir inteira (1 sabor) ou dividir em 2 sabores (½ + ½).",
    },
    {
      mode: "multi",
      title: "Múltiplos sabores (Até 3 ou 4)",
      desc: "Permite dividir a pizza em até 3 ou 4 sabores conforme o tamanho.",
    },
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground">Comportamento da categoria</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((opt) => {
          const active = currentMode === opt.mode;
          return (
            <button
              key={opt.mode}
              type="button"
              disabled={disabled}
              onClick={() => handleSelect(opt.mode)}
              className={`rounded-xl border p-3 text-left transition ${
                active
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "bg-background hover:border-primary/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold leading-snug text-foreground">
                  {opt.title}
                </span>
                {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {opt.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export async function createMissingPizzaSizes(
  categoryId: string,
  existingNames: string[],
  presets: PizzaSizePreset[],
  priceRule: PizzaPriceRule = "sum_fractions",
  startSortOrder = 0,
  flavorMode: PizzaCategoryFlavorMode | boolean = "multi",
): Promise<number> {
  const resolvedMode: PizzaCategoryFlavorMode =
    typeof flavorMode === "boolean" ? (flavorMode ? "single" : "multi") : flavorMode;
  const isSingle = resolvedMode === "single" || priceRule === "fixed";
  const effectiveRule: PizzaPriceRule = isSingle
    ? "fixed"
    : priceRule === "fixed"
      ? "sum_fractions"
      : priceRule;
  const existingSet = new Set(existingNames.map(normName));
  const missing = presets.filter((p) => !existingSet.has(normName(p.name)));
  for (let i = 0; i < missing.length; i++) {
    const p = missing[i];
    const maxFlavors = isSingle
      ? 1
      : resolvedMode === "half"
        ? Math.min(2, p.max_flavors)
        : p.max_flavors;
    await saveCategoryPizzaSize({
      data: {
        category_id: categoryId,
        name: p.name,
        pieces: p.pieces,
        max_flavors: maxFlavors,
        pdv_code: "",
        active: true,
        sort_order: startSortOrder + i,
        price_rule: effectiveRule,
      },
    });
  }
  return missing.length;
}

export function PizzaCategoryConfigDialog({
  open, onOpenChange, categoryId, categoryName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categoryId: string;
  categoryName: string;
}) {
  const qc = useQueryClient();
  const [overrideRule, setOverrideRule] = useState<PizzaPriceRule | null>(null);
  const [overrideMode, setOverrideMode] = useState<PizzaCategoryFlavorMode | null>(null);

  const cfgQ = useQuery({
    queryKey: ["admin", "pizza-config", categoryId],
    queryFn: () => listCategoryPizzaConfig({ data: { category_id: categoryId } }),
    enabled: open && !!categoryId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "pizza-config", categoryId] });
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };

  const sizes = cfgQ.data?.sizes ?? [];
  const doughs = cfgQ.data?.doughs ?? [];
  const crusts = cfgQ.data?.crusts ?? [];

  const flavorMode: PizzaCategoryFlavorMode =
    overrideMode ?? getPizzaCategoryFlavorMode(categoryId, sizes);
  const allowMultipleFlavors = flavorMode !== "single";

  const rawRule =
    overrideRule ?? sizes.find((s) => s.price_rule && s.price_rule !== "fixed")?.price_rule ?? "sum_fractions";
  const activeRule: PizzaPriceRule = allowMultipleFlavors ? rawRule : "fixed";

  const modeMut = useMutation({
    mutationFn: async (nextMode: PizzaCategoryFlavorMode) => {
      setOverrideMode(nextMode);
      await applyPizzaCategoryFlavorMode(categoryId, sizes, nextMode);
      return nextMode;
    },
    onSuccess: (nextMode) => {
      setOverrideMode(nextMode);
      if (nextMode === "single") setOverrideRule("fixed");
      else if (overrideRule === "fixed") setOverrideRule("sum_fractions");
      invalidate();
      toast.success(
        nextMode === "single"
          ? "Categoria configurada para Apenas 1 sabor (Inteira fixa)!"
          : nextMode === "half"
            ? "Categoria configurada para Meio a Meio (Até 2 sabores)!"
            : "Categoria configurada para Múltiplos sabores (Até 3 ou 4)!",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ruleMut = useMutation({
    mutationFn: async (rule: PizzaPriceRule) => {
      setOverrideRule(rule);
      await Promise.all(
        sizes.map((s) =>
          saveCategoryPizzaSize({
            data: {
              id: s.id,
              category_id: s.category_id,
              name: s.name,
              pieces: s.pieces,
              max_flavors: s.max_flavors,
              pdv_code: s.pdv_code ?? "",
              active: s.active,
              sort_order: s.sort_order,
              price_rule: rule,
            },
          })
        )
      );
      return rule;
    },
    onSuccess: (rule) => {
      setOverrideRule(rule);
      invalidate();
      if (sizes.length > 0) {
        toast.success("Regra de cálculo atualizada para os tamanhos!");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const presetMut = useMutation({
    mutationFn: (presets: PizzaSizePreset[]) =>
      createMissingPizzaSizes(
        categoryId,
        sizes.map((s) => s.name),
        presets,
        activeRule,
        sizes.length,
        flavorMode,
      ),
    onSuccess: (created) => {
      invalidate();
      if (created > 0) {
        toast.success(`${created} tamanho${created > 1 ? "s" : ""} adicionado${created > 1 ? "s" : ""}!`);
      } else {
        toast.info("Esses tamanhos já estão cadastrados nesta categoria.");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const existingSizeNames = new Set(sizes.map((s) => normName(s.name)));
  const missingStandardCount = STANDARD_PIZZA_SIZES_PRESET.filter(
    (p) => !existingSizeNames.has(normName(p.name))
  ).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setOverrideRule(null);
          setOverrideMode(null);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{categoryName}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {flavorMode === "single"
              ? "Tamanhos (inteira fixa), massas e bordas"
              : flavorMode === "half"
                ? "Tamanhos (meio a meio — até 2 sabores), massas e bordas"
                : "Tamanhos (múltiplos sabores), massas e bordas"}
          </p>
        </DialogHeader>

        {cfgQ.isLoading && (
          <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        )}

        {cfgQ.data && (
          <Tabs defaultValue="tamanhos">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tamanhos">Tamanhos ({sizes.length})</TabsTrigger>
              <TabsTrigger value="massas">Massas ({doughs.length})</TabsTrigger>
              <TabsTrigger value="bordas">Bordas ({crusts.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="tamanhos" className="mt-4 space-y-4">
              {/* Seletor de comportamento da categoria: 1 sabor vs Meio a Meio vs Múltiplos sabores */}
              <div className="rounded-xl border bg-muted/15 p-3">
                <PizzaCategoryBehaviorSelector
                  value={flavorMode}
                  onModeChange={(next) => {
                    if (next !== flavorMode) modeMut.mutate(next);
                  }}
                  disabled={modeMut.isPending}
                />
              </div>

              {/* Regra de cálculo para pizzas com 2 ou mais sabores (oculto quando Apenas 1 sabor) */}
              {allowMultipleFlavors && (
                <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold">Regra de preço para múltiplos sabores (meio a meio)</p>
                      <p className="text-[11px] text-muted-foreground">
                        Define como o sistema calcula automaticamente quando o cliente escolhe 2 ou mais sabores.
                      </p>
                    </div>
                    {ruleMut.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={ruleMut.isPending}
                      onClick={() => ruleMut.mutate("sum_fractions")}
                      className={`rounded-lg border p-2.5 text-left transition ${
                        activeRule === "sum_fractions"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "bg-background hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">Média / Proporcional</span>
                        {activeRule === "sum_fractions" && <Check className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Soma as frações escolhidas (ex.: ½ Frango + ½ Camarão).
                      </p>
                    </button>
                    <button
                      type="button"
                      disabled={ruleMut.isPending}
                      onClick={() => ruleMut.mutate("max_value")}
                      className={`rounded-lg border p-2.5 text-left transition ${
                        activeRule === "max_value"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "bg-background hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">Maior valor</span>
                        {activeRule === "max_value" && <Check className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Cobra sempre pelo valor do sabor mais caro da pizza.
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Atalhos 1 clique */}
              <div className="rounded-xl border border-dashed p-3 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Atalhos rápidos — preencha com 1 clique e ajuste se quiser:
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant={sizes.length === 0 ? "default" : "outline"}
                    disabled={presetMut.isPending || missingStandardCount === 0}
                    onClick={() => presetMut.mutate(STANDARD_PIZZA_SIZES_PRESET)}
                  >
                    {presetMut.isPending ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Adicionar tamanhos padrão (P, M, G, Família)
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_PIZZA_SIZES_PRESET.map((preset) => {
                    const exists = existingSizeNames.has(normName(preset.name));
                    const presetMax =
                      flavorMode === "single"
                        ? 1
                        : flavorMode === "half"
                          ? Math.min(2, preset.max_flavors)
                          : preset.max_flavors;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        disabled={exists || presetMut.isPending}
                        onClick={() => presetMut.mutate([preset])}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
                          exists
                            ? "border-primary/30 bg-primary/10 text-primary cursor-default"
                            : "bg-background hover:border-primary hover:bg-primary/5"
                        }`}
                      >
                        {exists ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        <span className="font-medium">{preset.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {allowMultipleFlavors
                            ? `(${preset.pieces}p · ${presetMax}s)`
                            : `(${preset.pieces} fatias)`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <SizesTable
                sizes={sizes}
                onChange={invalidate}
                categoryId={categoryId}
                defaultPriceRule={activeRule}
                flavorMode={flavorMode}
              />
              <ResumoTamanhos sizes={sizes} singleFlavorOnly={!allowMultipleFlavors} />
            </TabsContent>

            <TabsContent value="massas" className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Defina as opções de massas que seus clientes terão como escolha.
              </p>
              <ExtraTable
                items={doughs}
                onChange={invalidate}
                categoryId={categoryId}
                addLabel="+ Adicionar massa"
                colName="Massa"
                presets={DEFAULT_PIZZA_DOUGHS_PRESET}
                save={(d) => saveCategoryPizzaDough({ data: d })}
                remove={(id) => deleteCategoryPizzaDough({ data: { id } })}
              />
            </TabsContent>

            <TabsContent value="bordas" className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Cadastre as bordas (recheada, tradicional…) que o cliente pode escolher.
              </p>
              <ExtraTable
                items={crusts}
                onChange={invalidate}
                categoryId={categoryId}
                addLabel="+ Adicionar borda"
                colName="Borda"
                presets={DEFAULT_PIZZA_CRUSTS_PRESET}
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

type PizzaSize = DbCategoryPizzaSize;

type SizeInput = {
  id?: string;
  category_id: string;
  name: string;
  pieces: number;
  max_flavors: number;
  pdv_code: string;
  active: boolean;
  sort_order: number;
  price_rule: PizzaPriceRule;
};

function SizesTable({
  sizes, onChange, categoryId, defaultPriceRule, flavorMode,
}: {
  sizes: PizzaSize[];
  onChange: () => void;
  categoryId: string;
  defaultPriceRule: PizzaPriceRule;
  flavorMode: PizzaCategoryFlavorMode;
}) {
  const singleFlavorOnly = flavorMode === "single";
  const maxAllowedFlavors = flavorMode === "half" ? 2 : 4;
  const [draft, setDraft] = useState({ name: "", pieces: 8, max_flavors: flavorMode === "single" ? 1 : 2 });
  const saveMut = useMutation({
    mutationFn: (d: SizeInput) => saveCategoryPizzaSize({ data: d }),
    onSuccess: () => {
      onChange();
      setDraft({ name: "", pieces: 8, max_flavors: flavorMode === "single" ? 1 : 2 });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteCategoryPizzaSize({ data: { id } }),
    onSuccess: onChange,
    onError: (e: Error) => toast.error(e.message),
  });

  const gridCols = singleFlavorOnly
    ? "grid-cols-[1fr_130px_130px_40px]"
    : "grid-cols-[1fr_120px_180px_120px_40px]";

  return (
    <div className="rounded-xl border">
      <div className={`grid ${gridCols} gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium`}>
        <div>Nome</div>
        <div>Qtd. Pedaços</div>
        {!singleFlavorOnly && <div>Qtd. Sabores</div>}
        <div>Status</div>
        <div></div>
      </div>
      {sizes.map((s) => (
        <SizeRow
          key={s.id}
          size={s}
          defaultPriceRule={defaultPriceRule}
          flavorMode={flavorMode}
          onSave={(d) => saveMut.mutate(d)}
          onDelete={async () => {
            if (await confirmDialog({ title: `Remover "${s.name}"?`, variant: "destructive", confirmText: "Remover" })) {
              delMut.mutate(s.id);
            }
          }}
        />
      ))}
      <div className={`grid ${gridCols} items-center gap-2 px-3 py-3`}>
        <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex: Pequena" />
        <Input type="number" min={1} max={24} value={draft.pieces} onChange={(e) => setDraft({ ...draft, pieces: Number(e.target.value) })} />
        {!singleFlavorOnly && (
          <FlavorsPicker
            value={Math.min(maxAllowedFlavors, draft.max_flavors)}
            maxAllowed={maxAllowedFlavors}
            onChange={(v) => setDraft({ ...draft, max_flavors: v })}
          />
        )}
        <div className="text-xs text-muted-foreground">Ativo</div>
        <Button
          size="icon"
          variant="ghost"
          disabled={!draft.name || saveMut.isPending}
          onClick={() =>
            saveMut.mutate({
              category_id: categoryId,
              name: draft.name,
              pieces: draft.pieces,
              max_flavors: singleFlavorOnly ? 1 : Math.min(maxAllowedFlavors, draft.max_flavors),
              active: true,
              sort_order: sizes.length,
              pdv_code: "",
              price_rule: singleFlavorOnly ? "fixed" : defaultPriceRule,
            })
          }
        >
          <Plus className="h-4 w-4 text-primary" />
        </Button>
      </div>
    </div>
  );
}

function SizeRow({
  size, defaultPriceRule, flavorMode, onSave, onDelete,
}: {
  size: PizzaSize;
  defaultPriceRule: PizzaPriceRule;
  flavorMode: PizzaCategoryFlavorMode;
  onSave: (d: SizeInput) => void;
  onDelete: () => void;
}) {
  const singleFlavorOnly = flavorMode === "single";
  const maxAllowedFlavors = flavorMode === "half" ? 2 : 4;
  const rule = singleFlavorOnly ? "fixed" : (size.price_rule ?? defaultPriceRule);
  const effectiveMaxFlavors = singleFlavorOnly ? 1 : Math.min(maxAllowedFlavors, size.max_flavors);
  const basePayload = {
    id: size.id,
    category_id: size.category_id,
    name: size.name,
    pieces: size.pieces,
    max_flavors: effectiveMaxFlavors,
    active: size.active,
    sort_order: size.sort_order,
    pdv_code: size.pdv_code ?? "",
    price_rule: rule,
  };
  const gridCols = singleFlavorOnly
    ? "grid-cols-[1fr_130px_130px_40px]"
    : "grid-cols-[1fr_120px_180px_120px_40px]";

  return (
    <div className={`grid ${gridCols} items-center gap-2 border-b px-3 py-2`}>
      <Input defaultValue={size.name} onBlur={(e) => e.target.value !== size.name && onSave({ ...basePayload, name: e.target.value })} />
      <Input type="number" min={1} max={24} defaultValue={size.pieces} onBlur={(e) => Number(e.target.value) !== size.pieces && onSave({ ...basePayload, pieces: Number(e.target.value) })} />
      {!singleFlavorOnly && (
        <FlavorsPicker
          value={effectiveMaxFlavors}
          maxAllowed={maxAllowedFlavors}
          onChange={(v) => onSave({ ...basePayload, max_flavors: v })}
        />
      )}
      <div className="flex items-center gap-2">
        <Switch checked={size.active} onCheckedChange={(v) => onSave({ ...basePayload, active: v })} />
        <span className="text-xs">{size.active ? "Ativado" : "Pausado"}</span>
      </div>
      <Button size="icon" variant="ghost" className="text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}

function FlavorsPicker({
  value,
  maxAllowed = 4,
  onChange,
}: {
  value: number;
  maxAllowed?: number;
  onChange: (v: number) => void;
}) {
  const options = Array.from({ length: Math.min(4, Math.max(1, maxAllowed)) }, (_, idx) => idx + 1);
  return (
    <div className="flex gap-1">
      {options.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition ${value >= n ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground"}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function ResumoTamanhos({ sizes, singleFlavorOnly }: { sizes: PizzaSize[]; singleFlavorOnly: boolean }) {
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
            {!singleFlavorOnly && (
              <p className="text-xs text-muted-foreground">Aceita até {s.max_flavors} sabor{s.max_flavors > 1 ? "es" : ""}</p>
            )}
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
  items, onChange, categoryId, addLabel, colName, presets, save, remove,
}: {
  items: Extra[];
  onChange: () => void;
  categoryId: string;
  addLabel: string;
  colName: string;
  presets: { name: string; extra_price: number }[];
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

  const existingNames = new Set(items.map((it) => normName(it.name)));

  return (
    <div className="space-y-3">
      {presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-dashed p-2.5">
          <span className="mr-1 text-xs font-medium text-muted-foreground">Sugestões:</span>
          {presets.map((p) => {
            const exists = existingNames.has(normName(p.name));
            return (
              <button
                key={p.name}
                type="button"
                disabled={exists || saveMut.isPending}
                onClick={() =>
                  saveMut.mutate({
                    category_id: categoryId,
                    name: p.name,
                    extra_price: p.extra_price,
                    pdv_code: "",
                    active: true,
                    sort_order: items.length,
                  })
                }
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
                  exists
                    ? "border-primary/30 bg-primary/10 text-primary cursor-default"
                    : "bg-background hover:border-primary hover:bg-primary/5"
                }`}
              >
                {exists ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                {p.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border">
        <div className="grid grid-cols-[1fr_140px_140px_40px] gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium">
          <div>{colName}</div>
          <div>Preço</div>
          <div>Status</div>
          <div></div>
        </div>
        {items.map((it) => (
          <div key={it.id} className="grid grid-cols-[1fr_140px_140px_40px] items-center gap-2 border-b px-3 py-2">
            <Input
              defaultValue={it.name}
              onBlur={(e) => e.target.value !== it.name && saveMut.mutate({ id: it.id, category_id: it.category_id, name: e.target.value, extra_price: it.extra_price, pdv_code: it.pdv_code ?? "", active: it.active, sort_order: it.sort_order })}
            />
            <CurrencyInput
              value={Number(it.extra_price)}
              onChange={(v) => saveMut.mutate({ id: it.id, category_id: it.category_id, name: it.name, extra_price: v, pdv_code: it.pdv_code ?? "", active: it.active, sort_order: it.sort_order })}
            />
            <div className="flex items-center gap-2">
              <Switch checked={it.active} onCheckedChange={(v) => saveMut.mutate({ id: it.id, category_id: it.category_id, name: it.name, extra_price: it.extra_price, pdv_code: it.pdv_code ?? "", active: v, sort_order: it.sort_order })} />
              <span className="text-xs">{it.active ? "Ativado" : "Pausado"}</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive"
              onClick={async () => {
                if (await confirmDialog({ title: `Remover "${it.name}"?`, variant: "destructive", confirmText: "Remover" })) {
                  delMut.mutate(it.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <div className="px-3 py-3">
          <div className="grid grid-cols-[1fr_140px_140px_40px] items-center gap-2">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={`Nome da ${colName.toLowerCase()}`} />
            <CurrencyInput value={draft.extra_price} onChange={(v) => setDraft({ ...draft, extra_price: v })} />
            <div className="text-xs text-muted-foreground">Ativo</div>
            <Button
              size="icon"
              variant="ghost"
              disabled={!draft.name || saveMut.isPending}
              onClick={() => saveMut.mutate({ category_id: categoryId, name: draft.name, extra_price: draft.extra_price, pdv_code: "", active: true, sort_order: items.length })}
            >
              <Plus className="h-4 w-4 text-primary" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{addLabel}: digite acima e pressione +. Preço cobrado adicional. Total: {brl(items.reduce((s, x) => s + Number(x.extra_price), 0))}.</p>
        </div>
      </div>
    </div>
  );
}
