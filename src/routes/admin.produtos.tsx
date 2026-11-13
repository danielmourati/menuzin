import { setPrintLocations } from "@/lib/tenant-printers.functions";
import { PrintLocationPicker } from "@/components/admin/PrintLocationPicker";
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
import { Plus, Search, Edit2, Trash2, Star, Loader2, Pizza, Link2 as LinkIcon, Package, MessageSquare, Layers, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ChevronUp, ChevronDown, Settings2, Zap } from "lucide-react";
import { ReorderButtons } from "@/components/admin/ReorderButtons";
import { PizzaCategoryConfigDialog, STANDARD_PIZZA_SIZES_PRESET, createMissingPizzaSizes } from "@/components/admin/PizzaCategoryConfigDialog";
import { brl } from "@/lib/format";
import { ImageUploader } from "@/components/ui/image-uploader";
import { productImage, isDefaultProductImage } from "@/lib/product-image";
import { toast } from "sonner";
import {
  listMyCategories, listMyProducts, saveProduct, deleteProduct, toggleProductAvailable,
  saveProductSize, deleteProductSize, saveProductFlavor, deleteProductFlavor,
  listCategoryPizzaConfig, listAddonGroups, saveAddonGroup, saveAddonOption, setAddonGroupTargets,
  deleteAddonGroup, deleteAddonOption,
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

type DraftPizzaSize = {
  category_size_id: string;
  name: string;
  sort_order: number;
  max_flavors: number;
  pieces: number;
  enabled: boolean;
  price: number;
  fraction_prices: Record<string, number>;
  existingId?: string;
};
type DraftPizzaSizeMap = Record<string, DraftPizzaSize>;

function computeFractionPrices(
  base: number,
  maxFlavors: number,
  existing?: Record<string, number> | null,
  editedKeys?: Set<string>
): Record<string, number> {
  const next: Record<string, number> = { "1": base };
  for (let n = 2; n <= maxFlavors; n++) {
    const key = String(n);
    if (editedKeys?.has(key) && existing && existing[key] !== undefined) {
      next[key] = existing[key];
    } else {
      next[key] = Number((base / n).toFixed(2));
    }
  }
  return next;
}

const getNormalizedProductState = (
  ed: Editing | null,
  groupIds: string[],
  sizes: { name: string; price: number }[],
  pizzaSizes: DraftPizzaSizeMap = {}
) => {
  if (!ed) return "";
  return JSON.stringify({
    name: (ed.name ?? "").trim(),
    description: (ed.description ?? "").trim(),
    category_id: ed.category_id ?? null,
    price: Number(ed.price || 0),
    promo_price: ed.promo_price != null && Number(ed.promo_price) > 0 ? Number(ed.promo_price) : null,
    image_url: ed.image_url ?? "",
    available: Boolean(ed.available),
    featured: Boolean(ed.featured),
    bestseller: Boolean(ed.bestseller),
    prep_time: (ed.prep_time ?? "").trim() || null,
    type: ed.type ?? "standard",
    max_flavors: ed.max_flavors ?? null,
    allow_observations: Boolean(ed.allow_observations),
    listed_as_flavor: ed.listed_as_flavor ?? null,
    free_gift_kind: ed.free_gift_kind ?? null,
    free_gift_ref_id: ed.free_gift_ref_id ?? null,
    free_crust_mode: ed.free_crust_mode ?? "none",
    selectedGroupIds: [...groupIds].sort(),
    draftSizes: sizes.map((s) => ({ name: s.name.trim(), price: Number(s.price || 0) })),
    pizzaSizes: Object.values(pizzaSizes)
      .sort((a, b) => a.category_size_id.localeCompare(b.category_size_id))
      .map((s) => ({
        id: s.category_size_id,
        enabled: s.enabled,
        price: Number(s.price || 0),
        fraction_prices: s.fraction_prices,
      })),
  });
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
  const [draftSizes, setDraftSizes] = useState<{ name: string; price: number }[]>([]);
  const [draftPizzaSizes, setDraftPizzaSizes] = useState<DraftPizzaSizeMap>({});
  const [pizzaConfigCat, setPizzaConfigCat] = useState<{ id: string; name: string } | null>(null);
  const [pizzaFocusNonce, setPizzaFocusNonce] = useState(0);
  const [draftPrintLocs, setDraftPrintLocs] = useState<string[]>([]);
  const editingKey = editing ? (editing.id ?? "new") : null;
  useEffect(() => { setDraftSizes([]); setDraftPrintLocs([]); }, [editingKey]);
  const [open, setOpen] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const initialSnapshotRef = useRef<string | null>(null);
  const initialPizzaMetaRef = useRef<{ editing: Editing; groupIds: string[] } | null>(null);
  const pizzaHydratedKeyRef = useRef<string | null>(null);
  const skipNextPizzaHydrateRef = useRef(false);
  const isConfirmingRef = useRef(false);

  // States for inline creation/editing of observation/addon groups
  const [inlineGroupOpen, setInlineGroupOpen] = useState(false);
  const [inlineGroupId, setInlineGroupId] = useState<string | null>(null);
  const [inlineGroupKind, setInlineGroupKind] = useState<"observacao" | "adicional">("observacao");
  const [inlineGroupName, setInlineGroupName] = useState("");
  const [inlineGroupRequired, setInlineGroupRequired] = useState(false);
  const [inlineGroupMin, setInlineGroupMin] = useState(0);
  const [inlineGroupMax, setInlineGroupMax] = useState(1);
  const [inlineOptions, setInlineOptions] = useState<{ id?: string; name: string; price: number }[]>([]);
  const [deletedOptionIds, setDeletedOptionIds] = useState<string[]>([]);
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

  const handleMoveInlineOpt = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= inlineOptions.length) return;
    setInlineOptions((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const handleRemoveInlineOpt = (index: number) => {
    const opt = inlineOptions[index];
    if (opt?.id) {
      setDeletedOptionIds((prev) => [...prev, opt.id!]);
    }
    setInlineOptions((prev) => prev.filter((_, i) => i !== index));
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

  const pizzaConfigQ = useQuery({
    queryKey: ["admin", "pizza-config", editing?.category_id],
    queryFn: () => listCategoryPizzaConfig({ data: { category_id: editing!.category_id! } }),
    enabled: open && isPizzaCategory && !!editing?.category_id,
  });

  useEffect(() => {
    if (!open || !isPizzaCategory || !editing?.category_id || !pizzaConfigQ.data?.sizes) return;
    const catSizes = pizzaConfigQ.data.sizes;
    const targetKey = `${editing.id ?? "new"}:${editing.category_id}`;

    if (skipNextPizzaHydrateRef.current) {
      skipNextPizzaHydrateRef.current = false;
      pizzaHydratedKeyRef.current = targetKey;
      setDraftPizzaSizes((prev) => {
        const next: DraftPizzaSizeMap = {};
        for (const sz of catSizes) {
          const prevEntry = prev[sz.id];
          next[sz.id] = prevEntry
            ? {
                ...prevEntry,
                existingId: undefined,
                name: sz.name,
                sort_order: sz.sort_order,
                max_flavors: sz.max_flavors,
                pieces: sz.pieces,
              }
            : {
                category_size_id: sz.id,
                name: sz.name,
                sort_order: sz.sort_order,
                max_flavors: sz.max_flavors,
                pieces: sz.pieces,
                enabled: false,
                price: 0,
                fraction_prices: { "1": 0 },
              };
        }
        const base = initialPizzaMetaRef.current;
        if (base && base.editing.category_id === editing.category_id) {
          initialSnapshotRef.current = getNormalizedProductState(base.editing, base.groupIds, [], next);
        }
        return next;
      });
      return;
    }

    if (pizzaHydratedKeyRef.current !== targetKey) {
      const nextMap: DraftPizzaSizeMap = {};
      for (const sz of catSizes) {
        const matched = editing.id
          ? currentProduct?.sizes?.find((s) => s.category_size_id === sz.id)
          : undefined;
        const basePrice = matched ? Number(matched.price) : 0;
        const maxFlavors = sz.max_flavors ?? 1;
        nextMap[sz.id] = {
          category_size_id: sz.id,
          name: sz.name,
          sort_order: sz.sort_order,
          max_flavors: maxFlavors,
          pieces: sz.pieces,
          enabled: !!matched,
          price: basePrice,
          fraction_prices: matched?.fraction_prices ?? computeFractionPrices(basePrice, maxFlavors),
          existingId: matched?.id,
        };
      }
      pizzaHydratedKeyRef.current = targetKey;
      setDraftPizzaSizes(nextMap);
      const base = initialPizzaMetaRef.current;
      if (base && base.editing.category_id === editing.category_id) {
        initialSnapshotRef.current = getNormalizedProductState(base.editing, base.groupIds, [], nextMap);
      }
      return;
    }

    setDraftPizzaSizes((prev) => {
      let changed = Object.keys(prev).length !== catSizes.length;
      const next: DraftPizzaSizeMap = {};
      for (const sz of catSizes) {
        const prevEntry = prev[sz.id];
        if (prevEntry) {
          if (
            prevEntry.name !== sz.name ||
            prevEntry.sort_order !== sz.sort_order ||
            prevEntry.max_flavors !== sz.max_flavors ||
            prevEntry.pieces !== sz.pieces
          ) {
            changed = true;
          }
          next[sz.id] = {
            ...prevEntry,
            name: sz.name,
            sort_order: sz.sort_order,
            max_flavors: sz.max_flavors,
            pieces: sz.pieces,
            fraction_prices: computeFractionPrices(
              prevEntry.price,
              sz.max_flavors,
              prevEntry.fraction_prices,
              new Set(Object.keys(prevEntry.fraction_prices))
            ),
          };
        } else {
          changed = true;
          next[sz.id] = {
            category_size_id: sz.id,
            name: sz.name,
            sort_order: sz.sort_order,
            max_flavors: sz.max_flavors,
            pieces: sz.pieces,
            enabled: false,
            price: 0,
            fraction_prices: { "1": 0 },
          };
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isPizzaCategory, editing?.id, editing?.category_id, pizzaConfigQ.data?.sizes]);

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
    mutationFn: async ({
      input,
      keepOpenForNext = false,
      pizzaSizesSnapshot,
    }: {
      input: Editing;
      keepOpenForNext?: boolean;
      pizzaSizesSnapshot?: DraftPizzaSizeMap;
    }) => {
      const inputCat = categories.find((c) => c.id === input.category_id);
      const isPizza = inputCat?.kind === "pizza";
      const pizzaSizesList = Object.values(pizzaSizesSnapshot ?? {});
      const enabledPizzaSizes = pizzaSizesList.filter((s) => s.enabled && Number(s.price) > 0);
      const minPizzaPrice =
        isPizza && enabledPizzaSizes.length > 0
          ? Math.min(...enabledPizzaSizes.map((s) => Number(s.price)))
          : Number(input.price || 0);

      const payload: Editing = isPizza
        ? {
            ...input,
            type: "pizza",
            listed_as_flavor: input.listed_as_flavor ?? true,
            price: minPizzaPrice,
          }
        : input;

      const res = await saveProduct({ data: payload });
      const pid = res.id;
      if (!input.id && draftPrintLocs.length > 0) {
        await setPrintLocations({ data: { kind: "product", id: pid, location_ids: draftPrintLocs } });
        qc.invalidateQueries({ queryKey: ["print-routing"] });
      }
      if (!input.id && payload.type !== "pizza" && draftSizes.length > 0) {
        for (let i = 0; i < draftSizes.length; i++) {
          await saveProductSize({ data: { product_id: pid, name: draftSizes[i].name, price: draftSizes[i].price, sort_order: i } });
        }
      }
      if (isPizza) {
        for (const sz of pizzaSizesList) {
          if (sz.enabled && Number(sz.price) > 0) {
            await saveProductSize({
              data: {
                id: sz.existingId,
                product_id: pid,
                name: sz.name,
                price: Number(sz.price),
                sort_order: sz.sort_order,
                category_size_id: sz.category_size_id,
                fraction_prices: sz.fraction_prices,
              },
            });
          } else if (sz.existingId) {
            await deleteProductSize({ data: { id: sz.existingId } });
          }
        }
      }

      // Synchronize addon group targets for selected/unselected groups
      for (const g of addonGroups) {
        const isTargeted = selectedGroupIds.includes(g.id);
        const currentCategoryIds = g.targets.filter((t) => t.category_id).map((t) => t.category_id as string);
        const currentProductIds = g.targets.filter((t) => t.product_id).map((t) => t.product_id as string);
        const catId = payload.category_id;
        const targetsCategory = catId ? currentCategoryIds.includes(catId) : false;
        const targetsProduct = currentProductIds.includes(pid);
        const currentlyHasGroup = targetsCategory || targetsProduct;

        if (isTargeted) {
          if (!currentlyHasGroup) {
            // Group is checked but not currently targeted -> add pid to product_ids
            const nextPids = Array.from(new Set([...currentProductIds, pid]));
            await setAddonGroupTargets({
              data: { group_id: g.id, category_ids: currentCategoryIds, product_ids: nextPids },
            });
          }
        } else {
          if (currentlyHasGroup) {
            // Group is unchecked but currently targeted -> remove target for pid
            let nextCatIds = [...currentCategoryIds];
            let nextPids = [...currentProductIds];

            if (targetsProduct) {
              nextPids = nextPids.filter((id) => id !== pid);
            }
            if (targetsCategory && catId) {
              // Unbundle category target into specific product targets for all other products in this category
              nextCatIds = nextCatIds.filter((id) => id !== catId);
              const otherProductsInCat = products
                .filter((p) => p.category_id === catId && p.id !== pid)
                .map((p) => p.id);
              nextPids = Array.from(new Set([...nextPids, ...otherProductsInCat]));
            }

            await setAddonGroupTargets({
              data: { group_id: g.id, category_ids: nextCatIds, product_ids: nextPids },
            });
          }
        }
      }

      return { res, input, isPizza, keepOpenForNext, pizzaSizesSnapshot };
    },
    onSuccess: ({ input, isPizza, keepOpenForNext, pizzaSizesSnapshot }) => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["admin", "addon-groups"] });
      if (keepOpenForNext) {
        toast.success("Sabor salvo! Pronto para cadastrar o próximo.");
        const clearedSizes: DraftPizzaSizeMap = {};
        for (const [k, v] of Object.entries(pizzaSizesSnapshot ?? {})) {
          clearedSizes[k] = { ...v, existingId: undefined };
        }
        const nextEditing: Editing = {
          ...input,
          id: undefined,
          name: "",
          description: "",
          image_url: "",
          available: true,
          featured: false,
          bestseller: false,
          free_gift_kind: null,
          free_gift_ref_id: null,
          free_crust_mode: "none",
          sort_order: products.length + 2,
        };
        pizzaHydratedKeyRef.current = `new:${nextEditing.category_id ?? ""}`;
        setDraftPrintLocs([]);
        setDraftPizzaSizes(clearedSizes);
        setEditing(nextEditing);
        initialPizzaMetaRef.current = { editing: nextEditing, groupIds: selectedGroupIds };
        initialSnapshotRef.current = getNormalizedProductState(nextEditing, selectedGroupIds, [], clearedSizes);
        setPizzaFocusNonce((n) => n + 1);
        return;
      }
      toast.success(isPizza ? "Sabor salvo com sucesso!" : "Produto salvo com sucesso!");
      initialSnapshotRef.current = null;
      initialPizzaMetaRef.current = null;
      pizzaHydratedKeyRef.current = null;
      setDraftPizzaSizes({});
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
    const defaultCat = categories[0];
    const isPizza = defaultCat?.kind === "pizza";
    const initialEditing: Editing = {
      name: "", description: "", category_id: defaultCat?.id ?? null,
      price: 0, promo_price: null, image_url: "", available: true,
      featured: false, bestseller: false, prep_time: null, sort_order: products.length + 1,
      type: isPizza ? "pizza" : "standard", max_flavors: null, allow_observations: true,
      listed_as_flavor: isPizza ? true : null,
      free_gift_kind: null, free_gift_ref_id: null, free_crust_mode: "none",
    };
    setEditing(initialEditing);
    // Novos produtos sempre nascem sem nenhum adicional ou observação marcados
    setSelectedGroupIds([]);
    setDraftSizes([]);
    setDraftPizzaSizes({});
    pizzaHydratedKeyRef.current = null;
    initialPizzaMetaRef.current = { editing: initialEditing, groupIds: [] };
    initialSnapshotRef.current = getNormalizedProductState(initialEditing, [], [], {});
    if (isPizza) setPizzaFocusNonce((n) => n + 1);
    setOpen(true);
  };

  const openNewPizzaFlavor = () => {
    const preferredCat =
      categories.find((c) => c.id === catFilter && c.kind === "pizza") ??
      categories.find((c) => c.kind === "pizza");
    if (!preferredCat) {
      navigate({ to: "/admin/cardapio/novo" });
      return;
    }
    const initialEditing: Editing = {
      name: "", description: "", category_id: preferredCat.id,
      price: 0, promo_price: null, image_url: "", available: true,
      featured: false, bestseller: false, prep_time: null, sort_order: products.length + 1,
      type: "pizza", max_flavors: null, allow_observations: true,
      listed_as_flavor: true,
      free_gift_kind: null, free_gift_ref_id: null, free_crust_mode: "none",
    };
    setEditing(initialEditing);
    setSelectedGroupIds([]);
    setDraftSizes([]);
    setDraftPizzaSizes({});
    pizzaHydratedKeyRef.current = null;
    initialPizzaMetaRef.current = { editing: initialEditing, groupIds: [] };
    initialSnapshotRef.current = getNormalizedProductState(initialEditing, [], [], {});
    setPizzaFocusNonce((n) => n + 1);
    setOpen(true);
  };

  const openEditProduct = (p: typeof products[number]) => {
    const pCat = categories.find((c) => c.id === p.category_id);
    const isPizza = pCat?.kind === "pizza";
    const initialEditing: Editing = {
      id: p.id, name: p.name, description: p.description ?? "",
      category_id: p.category_id, price: Number(p.price),
      promo_price: p.promo_price != null ? Number(p.promo_price) : null,
      image_url: p.image_url ?? "", available: p.available, featured: p.featured, bestseller: (p as { bestseller?: boolean }).bestseller ?? false,
      prep_time: p.prep_time ?? null, sort_order: p.sort_order,
      type: isPizza ? "pizza" : ((p.type ?? "standard") as "standard" | "pizza"),
      max_flavors: p.max_flavors ?? null,
      allow_observations: p.allow_observations ?? true,
      listed_as_flavor: isPizza ? ((p as { listed_as_flavor?: boolean | null }).listed_as_flavor ?? true) : ((p as { listed_as_flavor?: boolean | null }).listed_as_flavor ?? null),
      free_gift_kind: (p.free_gift_kind ?? null) as "crust" | "product" | null,
      free_gift_ref_id: p.free_gift_ref_id ?? null,
      free_crust_mode: ((p.free_crust_mode ?? "none") as "none" | "fixed" | "customer_choice"),
    };
    const initialGroupIds = addonGroups
      .filter((g) => g.targets.some((t) => t.product_id === p.id || (p.category_id && t.category_id === p.category_id)))
      .map((g) => g.id);
    setEditing(initialEditing);
    setSelectedGroupIds(initialGroupIds);
    setDraftSizes([]);
    setDraftPizzaSizes({});
    pizzaHydratedKeyRef.current = null;
    initialPizzaMetaRef.current = { editing: initialEditing, groupIds: initialGroupIds };
    initialSnapshotRef.current = getNormalizedProductState(initialEditing, initialGroupIds, [], {});
    setOpen(true);
  };

  const openInlineGroupModal = (kind: "observacao" | "adicional") => {
    setInlineGroupId(null);
    setInlineGroupKind(kind);
    setInlineGroupName("");
    setInlineGroupRequired(kind === "observacao");
    setInlineGroupMin(kind === "observacao" ? 1 : 0);
    setInlineGroupMax(kind === "observacao" ? 1 : 5);
    setInlineOptions([]);
    setDeletedOptionIds([]);
    setNewOptName("");
    setNewOptPrice(0);
    setInlineGroupOpen(true);
  };

  const openEditInlineGroupModal = (g: typeof addonGroups[number]) => {
    setInlineGroupId(g.id);
    setInlineGroupKind(g.kind as "observacao" | "adicional");
    setInlineGroupName(g.name);
    setInlineGroupRequired(g.required);
    setInlineGroupMin(g.min_select);
    setInlineGroupMax(g.max_select);
    setInlineOptions(g.options.map((o) => ({ id: o.id, name: o.name, price: Number(o.price) })));
    setDeletedOptionIds([]);
    setNewOptName("");
    setNewOptPrice(0);
    setInlineGroupOpen(true);
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    const ok = await confirmDialog({
      title: `Excluir "${groupName}"?`,
      description: "Esta ação excluirá permanentemente este grupo e suas opções de todos os produtos.",
      confirmText: "Excluir grupo",
      cancelText: "Cancelar",
      variant: "destructive",
    });
    if (!ok) return;

    try {
      await deleteAddonGroup({ data: { id: groupId } });
      setSelectedGroupIds((prev) => prev.filter((id) => id !== groupId));
      await qc.invalidateQueries({ queryKey: ["admin", "addon-groups"] });
      toast.success("Grupo excluído com sucesso.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao excluir grupo.");
    }
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
          id: inlineGroupId ?? undefined,
          name: inlineGroupName.trim(),
          kind: inlineGroupKind,
          required: inlineGroupRequired,
          min_select: inlineGroupMin,
          max_select: inlineGroupMax,
          active: true,
          sort_order: inlineGroupId
            ? (addonGroups.find((g) => g.id === inlineGroupId)?.sort_order ?? 0)
            : addonGroups.length,
        },
      });

      for (const delId of deletedOptionIds) {
        await deleteAddonOption({ data: { id: delId } });
      }

      for (let i = 0; i < inlineOptions.length; i++) {
        const opt = inlineOptions[i];
        await saveAddonOption({
          data: {
            id: opt.id,
            group_id: resGroup.id,
            name: opt.name,
            price: opt.price,
            active: true,
            sort_order: i,
          },
        });
      }

      await qc.invalidateQueries({ queryKey: ["admin", "addon-groups"] });
      setSelectedGroupIds((prev) => (prev.includes(resGroup.id) ? prev : [...prev, resGroup.id]));
      toast.success(
        inlineGroupId
          ? "Grupo atualizado com sucesso!"
          : `${inlineGroupKind === "observacao" ? "Grupo de observação" : "Categoria de adicionais"} criada e vinculada!`
      );
      setInlineGroupOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar grupo.");
    } finally {
      setIsSavingInline(false);
    }
  };

  const save = (keepOpenForNext = false) => {
    if (!editing) return;
    if (!editing.name.trim()) return toast.error("Nome é obrigatório");
    if (
      isPizzaCategory &&
      Object.keys(draftPizzaSizes).length > 0 &&
      editing.available &&
      !Object.values(draftPizzaSizes).some((s) => s.enabled && Number(s.price) > 0)
    ) {
      return toast.error("Informe o preço de pelo menos 1 tamanho disponível (ou pause o sabor).");
    }
    saveMut.mutate({
      input: editing,
      keepOpenForNext,
      pizzaSizesSnapshot: isPizzaCategory ? draftPizzaSizes : undefined,
    });
  };

  const catNameById = new Map(categories.map((c) => [c.id, c.name]));


  const checkIsDirty = (): boolean => {
    if (!editing || !initialSnapshotRef.current) return false;
    const current = getNormalizedProductState(
      editing,
      selectedGroupIds,
      draftSizes,
      isPizzaCategory ? draftPizzaSizes : {}
    );
    return current !== initialSnapshotRef.current;
  };

  const handleRequestClose = async () => {
    if (isConfirmingRef.current) return;
    if (checkIsDirty()) {
      isConfirmingRef.current = true;
      try {
        const ok = await confirmDialog({
          title: "Descartar alterações?",
          description: "Há dados não salvos no produto. Se fechar agora, as alterações serão perdidas.",
          confirmText: "Descartar e sair",
          cancelText: "Continuar editando",
          variant: "destructive",
        });
        if (!ok) return;
      } finally {
        isConfirmingRef.current = false;
      }
    }
    initialSnapshotRef.current = null;
    initialPizzaMetaRef.current = null;
    pizzaHydratedKeyRef.current = null;
    setDraftPizzaSizes({});
    setOpen(false);
    setEditing(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleRequestClose();
    } else {
      setOpen(true);
    }
  };

  const saveRef = useRef(() => save(false));
  saveRef.current = () => save(false);
  const handleSaveInlineGroupRef = useRef(handleSaveInlineGroup);
  handleSaveInlineGroupRef.current = handleSaveInlineGroup;
  const handleRequestCloseRef = useRef(handleRequestClose);
  handleRequestCloseRef.current = handleRequestClose;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        e.stopPropagation();
        if (inlineGroupOpen) {
          handleSaveInlineGroupRef.current();
        } else if (!saveMut.isPending) {
          saveRef.current();
        }
        return;
      }
      if (e.key === "Escape") {
        if (inlineGroupOpen || isConfirmingRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        handleRequestCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, inlineGroupOpen, saveMut.isPending]);

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

  return (
    <AdminLayout
      title="Produtos"
      action={
        <div className="flex flex-wrap items-center gap-2">
          {isPizzaria && pizzaCatIds.size > 0 && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  const preferred =
                    categories.find((c) => c.id === catFilter && c.kind === "pizza") ??
                    categories.find((c) => c.kind === "pizza");
                  if (preferred) setPizzaConfigCat({ id: preferred.id, name: preferred.name });
                }}
              >
                <Settings2 className="mr-1.5 h-4 w-4" /> Tamanhos e Bordas
              </Button>
              <Button variant="secondary" onClick={openNewPizzaFlavor}>
                <Pizza className="mr-1.5 h-4 w-4" /> Novo sabor de pizza
              </Button>
            </>
          )}
          <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Novo produto</Button>
        </div>
      }
    >
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
                    siblingIds={filtered.map((x) => x.id)}
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
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            handleRequestClose();
          }}
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
              categorySizes={pizzaConfigQ.data?.sizes ?? []}
              pizzaConfigLoading={pizzaConfigQ.isLoading}
              draftPizzaSizes={draftPizzaSizes}
              setDraftPizzaSizes={setDraftPizzaSizes}
              draftPrintLocs={draftPrintLocs}
              setDraftPrintLocs={setDraftPrintLocs}
              focusNonce={pizzaFocusNonce}
              onOpenPizzaConfig={(cat) => setPizzaConfigCat(cat)}
              onClose={handleRequestClose}
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
                        setEditing({
                          ...editing,
                          category_id: v,
                          type: cat?.kind === "pizza" ? "pizza" : "standard",
                          listed_as_flavor: cat?.kind === "pizza" ? (editing.listed_as_flavor ?? true) : editing.listed_as_flavor,
                        });
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

                  <PrintLocationPicker
                    kind="product"
                    id={editing.id}
                    categoryId={editing.category_id}
                    categoryName={categories.find((c) => c.id === editing.category_id)?.name}
                    draft={draftPrintLocs}
                    onDraftChange={setDraftPrintLocs}
                  />

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

                  <div className="rounded-xl border bg-card p-3 space-y-3">
                    <h4 className="font-semibold text-sm">Preços e tamanhos</h4>
                  {!(editing.type !== "pizza" && ((currentProduct?.sizes?.length ?? 0) > 0 || (!currentProduct && draftSizes.length > 0))) && (
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
                  )}
                  {editing.type !== "pizza" && !currentProduct && (
                    <div className="border-t pt-3">
                      <h4 className="font-semibold text-xs text-muted-foreground mb-2">Tamanhos e preços</h4>
                      <DraftSizesEditor sizes={draftSizes} onChange={setDraftSizes} />
                    </div>
                  )}
                  {editing.type !== "pizza" && currentProduct && (
                    <div className="border-t pt-3">
                      <h4 className="font-semibold text-xs text-muted-foreground mb-2">Tamanhos e preços</h4>
                      <SizesEditor
                        productId={currentProduct.id}
                        sizes={currentProduct.sizes ?? []}
                        onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "products"] })}
                      />
                    </div>
                  )}
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

                </div>

                {/* LADO DIREITO: Observações e Complementos (Fixado ao rolar a página / modal) */}
                <div className="space-y-4 lg:sticky lg:top-0">
                  {/* Categorias de Adicionais */}
                  <div className="rounded-xl border p-4 bg-card space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm flex items-center gap-1.5">
                          <Layers className="h-4 w-4 text-primary" /> Categorias de Adicionais
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
                        <Plus className="h-3.5 w-3.5" /> Criar nova categoria
                      </Button>
                    </div>

                    {addonSubcats.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-4 text-center bg-muted/20">
                        <p className="text-xs text-muted-foreground font-medium">Nenhuma categoria de adicionais cadastrada ainda.</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Ex: "Molhos Extras", "Bebidas 2L", "Acompanhamentos".</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="mt-2.5 h-7 text-xs gap-1"
                          onClick={() => openInlineGroupModal("adicional")}
                        >
                          <Plus className="h-3 w-3" /> + Cadastrar primeira categoria
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-2 pt-1 max-h-56 overflow-y-auto pr-1">
                        {addonSubcats.map((g, idx) => {
                          const isCategoryTarget = !!editing.category_id && g.targets.some((t) => t.category_id === editing.category_id);
                          const isChecked = selectedGroupIds.includes(g.id);
                          const optionsSummary = g.options
                            .map((o) => `${o.name} (${o.price > 0 ? brl(o.price) : "Grátis"})`)
                            .join(", ");
                          return (
                            <div
                              key={g.id}
                              onClick={() => {
                                setSelectedGroupIds((prev) =>
                                  prev.includes(g.id) ? prev.filter((id) => id !== g.id) : [...prev, g.id]
                                );
                              }}
                              className={`flex items-center gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-all hover:border-primary/50 ${
                                isChecked ? "border-primary/60 bg-primary/5" : "bg-background"
                              }`}
                            >
                              <div onClick={(e) => e.stopPropagation()}>
                                <ReorderButtons
                                  entity="addonGroup"
                                  id={g.id}
                                  invalidateKeys={[["admin", "addon-groups"]]}
                                  isFirst={idx === 0}
                                  isLast={idx === addonSubcats.length - 1}
                                  siblingIds={addonSubcats.map((x) => x.id)}
                                />
                              </div>
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => {}}
                                className="mt-0.5 pointer-events-none"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
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
                              <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  title="Editar categoria de adicionais"
                                  onClick={() => openEditInlineGroupModal(g)}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                  title="Excluir categoria de adicionais"
                                  onClick={() => handleDeleteGroup(g.id, g.name)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

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
                        {obsGroups.map((g, idx) => {
                          const isCategoryTarget = !!editing.category_id && g.targets.some((t) => t.category_id === editing.category_id);
                          const isChecked = selectedGroupIds.includes(g.id);
                          const optionsText = g.options.map((o) => o.name).join(", ");
                          return (
                            <div
                              key={g.id}
                              onClick={() => {
                                setSelectedGroupIds((prev) =>
                                  prev.includes(g.id) ? prev.filter((id) => id !== g.id) : [...prev, g.id]
                                );
                              }}
                              className={`flex items-center gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-all hover:border-primary/50 ${
                                isChecked ? "border-primary/60 bg-primary/5" : "bg-background"
                              }`}
                            >
                              <div onClick={(e) => e.stopPropagation()}>
                                <ReorderButtons
                                  entity="addonGroup"
                                  id={g.id}
                                  invalidateKeys={[["admin", "addon-groups"]]}
                                  isFirst={idx === 0}
                                  isLast={idx === obsGroups.length - 1}
                                  siblingIds={obsGroups.map((x) => x.id)}
                                />
                              </div>
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => {}}
                                className="mt-0.5 pointer-events-none"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
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
                              <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  title="Editar grupo"
                                  onClick={() => openEditInlineGroupModal(g)}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                  title="Excluir grupo"
                                  onClick={() => handleDeleteGroup(g.id, g.name)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t mt-4">
                <Button variant="outline" onClick={handleRequestClose}>Cancelar</Button>
                <Button onClick={() => save(false)} disabled={saveMut.isPending} className="px-6 gap-2">
                  {saveMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Salvar Produto</span>
                      <kbd className="hidden sm:inline-flex items-center text-[10px] font-medium bg-primary-foreground/20 px-1.5 py-0.5 rounded border border-primary-foreground/30 text-primary-foreground">
                        F2
                      </kbd>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {pizzaConfigCat && (
        <PizzaCategoryConfigDialog
          open={!!pizzaConfigCat}
          onOpenChange={(v) => { if (!v) setPizzaConfigCat(null); }}
          categoryId={pizzaConfigCat.id}
          categoryName={pizzaConfigCat.name}
        />
      )}

      {/* Inline Modal for creation/editing of Observation Groups or Addon Subcategories */}
      <Dialog open={inlineGroupOpen} onOpenChange={setInlineGroupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {inlineGroupId ? "Editar" : "Novo"} {inlineGroupKind === "observacao" ? "Grupo de Observação" : "Categoria de Adicionais"}
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
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {inlineOptions.map((opt, idx) => (
                  <div key={opt.id || idx} className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs bg-muted/30">
                    <span className="font-medium">{opt.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground font-semibold">{opt.price > 0 ? brl(opt.price) : "Grátis"}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        disabled={idx === 0}
                        title="Mover opção para cima"
                        onClick={() => handleMoveInlineOpt(idx, "up")}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        disabled={idx === inlineOptions.length - 1}
                        title="Mover opção para baixo"
                        onClick={() => handleMoveInlineOpt(idx, "down")}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                        title="Excluir opção"
                        onClick={() => handleRemoveInlineOpt(idx)}
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
            <Button size="sm" onClick={handleSaveInlineGroup} disabled={isSavingInline || !inlineGroupName.trim()} className="gap-1.5">
              {isSavingInline ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <span>{inlineGroupId ? "Salvar Alterações" : "Criar e Vincular"}</span>
                  <kbd className="hidden sm:inline-flex items-center text-[10px] font-medium bg-primary-foreground/20 px-1 py-0.5 rounded border border-primary-foreground/30 text-primary-foreground">
                    F2
                  </kbd>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

// ===== Pizza product form (Detalhes / Preço / Classificação) =====

function PizzaProductForm({
  editing, setEditing, categories, allProducts,
  categorySizes, pizzaConfigLoading, draftPizzaSizes, setDraftPizzaSizes,
  draftPrintLocs, setDraftPrintLocs, focusNonce,
  onOpenPizzaConfig, onClose, onSave, isSaving,
}: {
  editing: Editing;
  setEditing: (e: Editing) => void;
  categories: { id: string; name: string; kind: "standard" | "pizza" | "oferta" }[];
  allProducts: { id: string; name: string }[];
  categorySizes: {
    id: string;
    name: string;
    pieces: number;
    max_flavors: number;
    sort_order: number;
    active: boolean;
    price_rule?: "sum_fractions" | "max_value" | "fixed" | null;
  }[];
  pizzaConfigLoading: boolean;
  draftPizzaSizes: DraftPizzaSizeMap;
  setDraftPizzaSizes: React.Dispatch<React.SetStateAction<DraftPizzaSizeMap>>;
  draftPrintLocs: string[];
  setDraftPrintLocs: (ids: string[]) => void;
  focusNonce: number;
  onOpenPizzaConfig: (cat: { id: string; name: string }) => void;
  onClose: () => void;
  onSave: (keepOpenForNext?: boolean) => void;
  isSaving: boolean;
}) {
  const qc = useQueryClient();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const currentCat = categories.find((c) => c.id === editing.category_id) ?? null;
  const priceRule = categorySizes.find((s) => s.price_rule)?.price_rule ?? "sum_fractions";

  useEffect(() => {
    if (!editing.id) {
      const t = setTimeout(() => nameInputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [focusNonce, editing.id]);

  const quickSizesMut = useMutation({
    mutationFn: async () => {
      if (!editing.category_id) return 0;
      return createMissingPizzaSizes(editing.category_id, [], STANDARD_PIZZA_SIZES_PRESET, "sum_fractions", 0);
    },
    onSuccess: (created) => {
      if (editing.category_id) {
        qc.invalidateQueries({ queryKey: ["admin", "pizza-config", editing.category_id] });
      }
      if (created > 0) {
        toast.success("Tamanhos padrão (P, M, G, Família) criados!");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hasGift = editing.free_crust_mode !== "none" || editing.free_gift_kind !== null;

  return (
    <div className="space-y-4 pt-1">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* COLUNA ESQUERDA: Dados do Sabor */}
        <div className="space-y-3.5 rounded-xl border p-4 bg-muted/10">
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5 border-b pb-2">
            <Pizza className="h-4 w-4 text-primary" /> Dados do Sabor
          </h4>

          <div>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-semibold">Categoria</Label>
              {currentCat && (
                <button
                  type="button"
                  onClick={() => onOpenPizzaConfig({ id: currentCat.id, name: currentCat.name })}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  <Settings2 className="h-3 w-3" /> Tamanhos e bordas
                </button>
              )}
            </div>
            <Select
              value={editing.category_id ?? ""}
              onValueChange={(v) => {
                const cat = categories.find((c) => c.id === v);
                const nextIsPizza = cat?.kind === "pizza";
                setEditing({
                  ...editing,
                  category_id: v,
                  type: nextIsPizza ? "pizza" : "standard",
                  listed_as_flavor: nextIsPizza ? (editing.listed_as_flavor ?? true) : editing.listed_as_flavor,
                });
              }}
            >
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
              <SelectContent>
                {categories.filter((c) => c.kind === "pizza").map((c) => (
                  <SelectItem key={c.id} value={c.id}>🍕 {c.name}</SelectItem>
                ))}
                {categories.some((c) => c.kind !== "pizza") && (
                  <>
                    <div className="px-2 pt-2 pb-1 text-xs font-semibold text-muted-foreground">Outras categorias</div>
                    {categories.filter((c) => c.kind !== "pizza").map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Nome do Sabor</Label>
              <span className="text-[10px] text-muted-foreground">{editing.name.length}/80</span>
            </div>
            <Input
              ref={nameInputRef}
              maxLength={80}
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="mt-1"
              placeholder="Ex: Calabresa com Cebola"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold">Ingredientes / Descrição</Label>
            <Textarea
              maxLength={1000}
              rows={3}
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              className="mt-1 text-xs"
              placeholder="Ex: Molho artesanal, mussarela especial, calabresa fatiada e cebola..."
            />
          </div>

          <ImageUploader
            label="Foto do sabor (opcional)"
            value={editing.image_url}
            onChange={(url) => setEditing({ ...editing, image_url: url })}
            folder="produtos"
          />

          <PrintLocationPicker
            kind="product"
            id={editing.id}
            categoryId={editing.category_id}
            categoryName={currentCat?.name}
            draft={draftPrintLocs}
            onDraftChange={setDraftPrintLocs}
          />
        </div>

        {/* COLUNA DIREITA: Tamanhos e Preços + Opções */}
        <div className="space-y-4">
          <div className="rounded-xl border p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
              <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                Tamanhos e Preços
              </h4>
              {currentCat && categorySizes.length > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenPizzaConfig({ id: currentCat.id, name: currentCat.name })}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition"
                >
                  <span>Meio a meio: {priceRule === "max_value" ? "Maior valor" : "Média proporcional"}</span>
                  <span className="text-primary">· Alterar</span>
                </button>
              )}
            </div>

            {pizzaConfigLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : categorySizes.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-center space-y-3">
                <p className="text-xs text-muted-foreground">
                  Esta categoria ainda não tem tamanhos configurados (Pequena, Média, Grande…).
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={quickSizesMut.isPending}
                    onClick={() => quickSizesMut.mutate()}
                  >
                    {quickSizesMut.isPending ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Criar tamanhos padrão agora (P, M, G, Família)
                  </Button>
                  {currentCat && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenPizzaConfig({ id: currentCat.id, name: currentCat.name })}
                    >
                      Configurar manualmente
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Informe o valor da pizza inteira em cada tamanho vendido. Pizzas meio a meio são calculadas automaticamente.
                </p>
                <div className="space-y-2">
                  {categorySizes.map((sz) => {
                    const entry = draftPizzaSizes[sz.id] ?? {
                      category_size_id: sz.id,
                      name: sz.name,
                      sort_order: sz.sort_order,
                      max_flavors: sz.max_flavors,
                      pieces: sz.pieces,
                      enabled: false,
                      price: 0,
                      fraction_prices: { "1": 0 },
                    };
                    return (
                      <PizzaSizePriceRow
                        key={sz.id}
                        size={sz}
                        entry={entry}
                        priceRule={priceRule}
                        onChange={(nextEntry) =>
                          setDraftPizzaSizes((prev) => ({ ...prev, [sz.id]: nextEntry }))
                        }
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl border p-4 space-y-2.5">
            <h4 className="font-semibold text-sm text-foreground border-b pb-2">Opções e Destaques</h4>

            <div className="flex items-center justify-between gap-3 py-1">
              <Label className="text-xs font-medium">Disponível no cardápio</Label>
              <Switch checked={editing.available} onCheckedChange={(v) => setEditing({ ...editing, available: v })} />
            </div>

            <div className="flex items-center justify-between gap-3 py-1">
              <div>
                <Label className="text-xs font-medium">Aceitar em pizzas meio a meio / múltiplos sabores</Label>
                <p className="text-[11px] text-muted-foreground">Permite combinar este sabor com outros na montagem da pizza.</p>
              </div>
              <Switch
                checked={editing.listed_as_flavor !== false}
                onCheckedChange={(v) => setEditing({ ...editing, listed_as_flavor: v })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="flex items-center justify-between rounded-lg border px-2.5 py-2 text-xs cursor-pointer">
                <span>Em destaque</span>
                <Switch checked={editing.featured} onCheckedChange={(v) => setEditing({ ...editing, featured: v })} />
              </label>
              <label className="flex items-center justify-between rounded-lg border px-2.5 py-2 text-xs cursor-pointer">
                <span>🔥 Mais vendido</span>
                <Switch checked={editing.bestseller} onCheckedChange={(v) => setEditing({ ...editing, bestseller: v })} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 items-center pt-1">
              <label className="flex items-center justify-between rounded-lg border px-2.5 py-2 text-xs cursor-pointer">
                <span>Aceita observação</span>
                <Switch checked={editing.allow_observations} onCheckedChange={(v) => setEditing({ ...editing, allow_observations: v })} />
              </label>
              <Input
                value={editing.prep_time ?? ""}
                onChange={(e) => setEditing({ ...editing, prep_time: e.target.value })}
                className="h-9 text-xs"
                placeholder="Preparo (ex: 30 min)"
              />
            </div>
          </div>

          <details className="rounded-xl border p-3 group" open={hasGift}>
            <summary className="cursor-pointer list-none flex items-center justify-between text-xs font-semibold text-foreground">
              <span>Brindes e Promoções (opcional)</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                {hasGift ? "Ativo" : "Clique para expandir"}
              </span>
            </summary>
            <div className="mt-3 space-y-3 pt-2 border-t">
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
            </div>
          </details>
        </div>
      </div>

      <DialogFooter className="pt-3 border-t mt-2 flex-wrap gap-2 sm:justify-between">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isSaving || !editing.name.trim()}
            onClick={() => onSave(true)}
          >
            Salvar e adicionar outro
          </Button>
          <Button
            type="button"
            onClick={() => onSave(false)}
            disabled={isSaving || !editing.name.trim()}
            className="gap-2 px-5"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>Salvar Sabor</span>
                <kbd className="hidden sm:inline-flex items-center text-[10px] font-medium bg-primary-foreground/20 px-1.5 py-0.5 rounded border border-primary-foreground/30 text-primary-foreground">
                  F2
                </kbd>
              </>
            )}
          </Button>
        </div>
      </DialogFooter>
    </div>
  );
}

function PizzaSizePriceRow({
  size, entry, priceRule, onChange,
}: {
  size: { id: string; name: string; pieces: number; max_flavors: number; active: boolean };
  entry: DraftPizzaSize;
  priceRule: "sum_fractions" | "max_value" | "fixed";
  onChange: (next: DraftPizzaSize) => void;
}) {
  const [editedFracs, setEditedFracs] = useState<Set<string>>(new Set());

  const handlePriceChange = (val: number) => {
    const nextFracs = computeFractionPrices(val, size.max_flavors, entry.fraction_prices, editedFracs);
    onChange({
      ...entry,
      enabled: val > 0 ? true : entry.enabled,
      price: val,
      fraction_prices: nextFracs,
    });
  };

  const handleToggle = (checked: boolean) => {
    onChange({
      ...entry,
      enabled: checked,
    });
  };

  const handleFractionChange = (key: string, val: number) => {
    const nextEdited = new Set(editedFracs);
    nextEdited.add(key);
    setEditedFracs(nextEdited);
    onChange({
      ...entry,
      fraction_prices: { ...entry.fraction_prices, [key]: val },
    });
  };

  const handleRecalc = () => {
    setEditedFracs(new Set());
    onChange({
      ...entry,
      fraction_prices: computeFractionPrices(entry.price, size.max_flavors),
    });
  };

  return (
    <div className={`rounded-lg border p-2.5 transition ${entry.enabled ? "bg-card border-border" : "bg-muted/20 border-dashed"}`}>
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2.5 cursor-pointer min-w-0">
          <Checkbox checked={entry.enabled} onCheckedChange={(v) => handleToggle(!!v)} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-semibold ${!entry.enabled ? "text-muted-foreground" : ""}`}>
                {size.name}
              </span>
              {!size.active && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Pausado</span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {size.pieces} {size.pieces === 1 ? "pedaço" : "pedaços"} · até {size.max_flavors} {size.max_flavors > 1 ? "sabores" : "sabor"}
            </p>
          </div>
        </label>

        <div className="w-32 shrink-0">
          <CurrencyInput
            value={entry.price}
            onChange={handlePriceChange}
            className="h-9 text-right font-semibold"
          />
        </div>
      </div>

      {entry.enabled && entry.price > 0 && size.max_flavors > 1 && (
        <div className="mt-2 pt-2 border-t border-dashed space-y-2">
          <p className="text-[11px] text-muted-foreground">
            {priceRule === "max_value" ? (
              "Meio a meio: prevalece o sabor de maior valor selecionado"
            ) : (
              <>
                Meio a meio automático:{" "}
                {Array.from({ length: size.max_flavors - 1 }, (_, i) => i + 2)
                  .map((n) => `1/${n} = ${brl(entry.fraction_prices[String(n)] ?? Number((entry.price / n).toFixed(2)))}`)
                  .join(" · ")}
              </>
            )}
          </p>

          {priceRule !== "max_value" && (
            <details className="text-xs">
              <summary className="cursor-pointer text-[11px] font-medium text-primary hover:underline w-fit">
                Personalizar frações (1/2{size.max_flavors >= 3 ? ", 1/3…" : ""})
              </summary>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Array.from({ length: size.max_flavors - 1 }, (_, i) => i + 2).map((n) => (
                  <div key={n} className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Valor 1/{n} sabor</Label>
                    <CurrencyInput
                      value={entry.fraction_prices[String(n)] ?? Number((entry.price / n).toFixed(2))}
                      onChange={(v) => handleFractionChange(String(n), v)}
                      className="h-8 text-xs text-right"
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleRecalc}
                className="mt-1.5 text-[11px] text-muted-foreground hover:text-primary hover:underline"
              >
                Recalcular proporcional automático
              </button>
            </details>
          )}
        </div>
      )}
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
  const sortedSizes = [...sizes].sort((a, b) => a.sort_order - b.sort_order);
  const swap = async (i: number, j: number) => {
    try {
      const list = [...sortedSizes];
      [list[i], list[j]] = [list[j], list[i]];
      await Promise.all(list.map((x, k) => saveProductSize({ data: { id: x.id, product_id: productId, name: x.name, price: Number(x.price), sort_order: k } })));
      onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao reordenar"); }
  };
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
      <p className="text-xs text-muted-foreground">Com tamanhos cadastrados, o cliente paga o preço do tamanho escolhido e o cardápio mostra "A partir de". O preço base passa a ser o menor tamanho.</p>
      <div className="space-y-2">
        {sizes.length === 0 && <p className="text-sm text-muted-foreground">Sem tamanhos cadastrados.</p>}
        {sortedSizes.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-2 rounded-xl border p-2">
            <div className="flex flex-col">
              <Button type="button" size="icon" variant="ghost" className="h-5 w-6" disabled={idx === 0 || saveMut.isPending} onClick={() => swap(idx, idx - 1)}><ChevronUp className="h-3 w-3" /></Button>
              <Button type="button" size="icon" variant="ghost" className="h-5 w-6" disabled={idx === sortedSizes.length - 1 || saveMut.isPending} onClick={() => swap(idx, idx + 1)}><ChevronDown className="h-3 w-3" /></Button>
            </div>
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

function DraftSizesEditor({ sizes, onChange }: {
  sizes: { name: string; price: number }[];
  onChange: (next: { name: string; price: number }[]) => void;
}) {
  const [draft, setDraft] = useState({ name: "", price: 0 });
  const update = (i: number, patch: Partial<{ name: string; price: number }>) =>
    onChange(sizes.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const move = (i: number, j: number) => {
    const list = [...sizes];
    [list[i], list[j]] = [list[j], list[i]];
    onChange(list);
  };
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Os tamanhos serão gravados ao salvar o produto. O preço base passa a ser o menor tamanho.</p>
      <div className="space-y-2">
        {sizes.length === 0 && <p className="text-sm text-muted-foreground">Sem tamanhos cadastrados.</p>}
        {sizes.map((s, idx) => (
          <div key={idx} className="flex items-center gap-2 rounded-xl border p-2">
            <div className="flex flex-col">
              <Button type="button" size="icon" variant="ghost" className="h-5 w-6" disabled={idx === 0} onClick={() => move(idx, idx - 1)}><ChevronUp className="h-3 w-3" /></Button>
              <Button type="button" size="icon" variant="ghost" className="h-5 w-6" disabled={idx === sizes.length - 1} onClick={() => move(idx, idx + 1)}><ChevronDown className="h-3 w-3" /></Button>
            </div>
            <Input className="flex-1" value={s.name} onChange={(e) => update(idx, { name: e.target.value })} />
            <CurrencyInput className="w-32" value={s.price} onChange={(v) => update(idx, { price: v })} />
            <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => onChange(sizes.filter((_, k) => k !== idx))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-2 border-t pt-3">
        <div className="flex-1"><Label className="text-xs">Novo tamanho</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex: Grande" className="mt-1" /></div>
        <div className="w-32"><Label className="text-xs">Preço</Label><CurrencyInput value={draft.price} onChange={(v) => setDraft({ ...draft, price: v })} className="mt-1" /></div>
        <Button type="button" disabled={!draft.name.trim()} onClick={() => { onChange([...sizes, { name: draft.name.trim(), price: draft.price }]); setDraft({ name: "", price: 0 }); }}><Plus className="h-4 w-4" /></Button>
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
