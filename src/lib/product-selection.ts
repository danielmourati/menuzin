import type { Product, ProductSize, ProductFlavor, AddonGroup } from "./domain-types";

export type GroupSelections = Record<string, string[]>;

export type PizzaPricedSize = { id: string; maxFlavors?: number };

export type PizzaPricedFlavor = {
  id: string;
  pricesByCategorySizeId: Record<string, number>;
};

export type PizzaProductSizePrice = {
  categorySizeId?: string | null;
  price: number;
};

export type SelectionInput = {
  product: Product;
  sizeId: string | null;
  flavorIds: string[];
  groupSelections: GroupSelections;
};

/**
 * Valida a seleção atual no modal de produto.
 * Retorna lista de mensagens (vazio = ok).
 */
export function validateSelection(i: SelectionInput): string[] {
  const errors: string[] = [];
  const { product, sizeId, flavorIds, groupSelections } = i;

  if (product.sizes && product.sizes.length > 0 && !sizeId) {
    errors.push("Escolha um tamanho");
  }

  // Só valida sabores quando o produto realmente expõe sabores selecionáveis.
  if (product.type === "pizza" && (product.flavors?.length ?? 0) > 0) {
    const max = Math.max(1, product.maxFlavors ?? 1);
    if (flavorIds.length < 1) errors.push("Escolha ao menos 1 sabor");
    else if (flavorIds.length > max) errors.push(`Máximo ${max} sabor${max > 1 ? "es" : ""}`);
  }

  for (const g of product.addonGroups ?? []) {
    const ids = groupSelections[g.id] ?? [];
    const min = Math.max(0, g.minSelect | 0);
    const max = Math.max(min || 1, g.maxSelect | 0);
    if (g.required && ids.length < Math.max(1, min)) {
      errors.push(`${g.name}: selecione ${Math.max(1, min)}`);
    } else if (ids.length > max) {
      errors.push(`${g.name}: máximo ${max}`);
    } else if (!g.required && ids.length > 0 && ids.length < min) {
      errors.push(`${g.name}: mínimo ${min}`);
    }
  }

  return errors;
}

/** Preço unitário base (sem qty, sem grupos): tamanho + média do priceDelta dos sabores. */
export function computeBasePrice(
  product: Product,
  selectedSize?: ProductSize,
  selectedFlavors: ProductFlavor[] = [],
): number {
  const fromProduct = product.promoPrice ?? product.price;
  const base = selectedSize ? selectedSize.price : fromProduct;
  if (product.type === "pizza" && selectedFlavors.length > 0) {
    const delta = selectedFlavors.reduce((s, f) => s + f.priceDelta, 0) / selectedFlavors.length;
    return base + delta;
  }
  return base;
}

/** Aplica toggle de sabor respeitando o máximo (substitui o último). */
export function toggleFlavorId(prev: string[], id: string, max: number): string[] {
  if (prev.includes(id)) return prev.filter((x) => x !== id);
  if (prev.length >= max) return [...prev.slice(0, Math.max(0, max - 1)), id];
  return [...prev, id];
}

/** Aplica toggle em opção de grupo respeitando maxSelect (1 = radio). */
export function toggleGroupOptionId(
  prev: string[] | undefined,
  optionId: string,
  maxSelect: number,
): string[] {
  const cur = prev ?? [];
  if (maxSelect <= 1) return cur.includes(optionId) ? [] : [optionId];
  if (cur.includes(optionId)) return cur.filter((x) => x !== optionId);
  if (cur.length >= maxSelect) return cur;
  return [...cur, optionId];
}

export function positivePizzaFlavorPrice(flavor: PizzaPricedFlavor, categorySizeId: string): number {
  const price = Number(flavor.pricesByCategorySizeId[categorySizeId] ?? 0);
  return Number.isFinite(price) && price > 0 ? price : 0;
}

export function getVisiblePizzaSizesForProduct<TSize extends PizzaPricedSize, TFlavor extends PizzaPricedFlavor>(
  sizes: TSize[],
  flavors: TFlavor[],
  currentProductId?: string | null,
  currentProductSizes: PizzaProductSizePrice[] = [],
): TSize[] {
  const configuredCurrentSizeIds = getConfiguredPizzaSizeIds(currentProductSizes);
  if (configuredCurrentSizeIds.size > 0) {
    return sizes.filter((size) => configuredCurrentSizeIds.has(size.id));
  }

  const currentFlavor = currentProductId ? flavors.find((f) => f.id === currentProductId) : undefined;
  const currentFlavorHasPrices = currentFlavor
    ? sizes.some((size) => positivePizzaFlavorPrice(currentFlavor, size.id) > 0)
    : false;

  return sizes.filter((size) => {
    if (currentFlavor && currentFlavorHasPrices) {
      return positivePizzaFlavorPrice(currentFlavor, size.id) > 0;
    }
    return flavors.some((flavor) => positivePizzaFlavorPrice(flavor, size.id) > 0);
  });
}

export function getConfiguredPizzaSizeIds(productSizes: PizzaProductSizePrice[]): Set<string> {
  return new Set(
    productSizes
      .filter((size) => size.categorySizeId && Number(size.price) > 0)
      .map((size) => size.categorySizeId as string),
  );
}

export function pizzaChargeDivisor(selectedFlavorCount: number): number {
  return selectedFlavorCount > 1 ? selectedFlavorCount : 1;
}

export function pizzaPreviewDivisor(selectedFlavorCount: number, maxFlavors: number): number {
  if (selectedFlavorCount > 0) return pizzaChargeDivisor(selectedFlavorCount);
  return maxFlavors > 1 ? maxFlavors : 1;
}

export function pizzaFlavorShare(price: number, divisor: number): number {
  return divisor > 1 ? price / divisor : price;
}

export function computeFractionedPizzaPrice(prices: number[], selectedFlavorCount: number): number {
  const divisor = pizzaChargeDivisor(selectedFlavorCount);
  return prices.reduce((sum, price) => sum + pizzaFlavorShare(price, divisor), 0);
}

/** Indica se o tamanho exige seleção explícita de sabores no storefront. */
export function requiresExplicitFlavorSelection(maxFlavors: number): boolean {
  return (maxFlavors ?? 1) > 1;
}

/**
 * Valida a quantidade de sabores escolhidos para um tamanho de pizza.
 * Regra: deve ser exatamente igual ao maxFlavors do tamanho.
 */
export function validatePizzaFlavorCount(selectedCount: number, maxFlavors: number): string | null {
  const max = Math.max(1, maxFlavors ?? 1);
  if (selectedCount < max) {
    return max === 1
      ? "Escolha 1 sabor"
      : `Escolha ${max} sabores (${selectedCount}/${max})`;
  }
  if (selectedCount > max) {
    return `Máximo ${max} sabor${max > 1 ? "es" : ""}`;
  }
  return null;
}

export type AddonLabelKind = "size" | "flavor" | "group" | "addon";
export type ParsedAddonLabel = {
  kind: AddonLabelKind;
  label: string;
  groupName?: string;
};

/**
 * Faz parsing do `name` de um addon persistido em order_items.addons[].
 * Reconhece os prefixos gerados no checkout:
 *  - "Tamanho: <x>"
 *  - "Sabor: <x>"
 *  - "<Grupo>: <opção>"
 *  - qualquer outro = adicional legado
 */
export function parseAddonLabel(name: string): ParsedAddonLabel {
  if (name.startsWith("Tamanho:")) return { kind: "size", label: name.slice(8).trim() };
  if (name.startsWith("Sabor:")) return { kind: "flavor", label: name.slice(6).trim() };
  const idx = name.indexOf(": ");
  if (idx > 0) return { kind: "group", groupName: name.slice(0, idx).trim(), label: name.slice(idx + 2).trim() };
  return { kind: "addon", label: name };
}

/** Helper auxiliar para uso em ProductModal (mantém comportamento atual). */
export function listAddonGroups(product: Product): AddonGroup[] {
  return product.addonGroups ?? [];
}
