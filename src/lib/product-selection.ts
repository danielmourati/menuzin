import type { Product, ProductSize, ProductFlavor, AddonGroup } from "./domain-types";

export type GroupSelections = Record<string, string[]>;

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

  if (product.type === "pizza") {
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
