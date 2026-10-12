import type { Order } from "@/lib/domain-types";
import { parseAddonLabel } from "@/lib/product-selection";

/** Printed heading uses recorded selections, never live catalog data. */
export function receiptItemName(item: Order["items"][number]): string {
  const sizes = (item.addons ?? [])
    .map((addon) => parseAddonLabel(addon.name))
    .filter((parsed) => parsed.kind === "size" && parsed.label.trim())
    .map((parsed) => parsed.label.trim().toUpperCase());
  return sizes.length ? `${item.name} (${[...new Set(sizes)].join(" / ")})` : item.name;
}

/** Compact descriptions only; no catalog changes or recalculation of recorded prices. */
export function receiptItemDetails(item: Order["items"][number], showPrices: boolean): string[] {
  const out: string[] = [];
  for (const addon of item.addons ?? []) {
    const parsed = parseAddonLabel(addon.name);
    if (parsed.kind === "size") continue;
    const all = parsed.label.trim().replace(/^\[|\]$/g, "").toLowerCase() === "todos os adicionais";
    const group = parsed.groupName ?? "";
    const redundant = /^(adicionais?|complementos?|observa[cç][oõ]es?)(\s*\([^)]*\))?$/i.test(group);
    let label = all ? "Todos os adicionais"
      : parsed.kind === "flavor" ? `Sabor: ${parsed.label}`
      : parsed.kind === "group" && !redundant ? `${group}: ${parsed.label}`
      : parsed.label;
    if (showPrices && Number(addon.price) > 0) {
      label += ` (+${Number(addon.price).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
    }
    out.push(label);
  }
  if (item.note?.trim()) out.push(`Obs: ${item.note.trim()}`);
  return out;
}