import type { Order } from "@/lib/domain-types";
import { parseAddonLabel } from "@/lib/product-selection";

/** Compact descriptions only; no catalog changes or recalculation of recorded prices. */
export function receiptItemDetails(item: Order["items"][number], showPrices: boolean): string[] {
  const out: string[] = [];
  for (const addon of item.addons ?? []) {
    const parsed = parseAddonLabel(addon.name);
    const all = parsed.label.trim().replace(/^\[|\]$/g, "").toLowerCase() === "todos os adicionais";
    const group = parsed.groupName ?? "";
    const redundant = /^(adicionais?|complementos?|observa[cç][oõ]es?)(\s*\([^)]*\))?$/i.test(group);
    let label = all ? "Todos os adicionais"
      : parsed.kind === "size" ? `Tamanho: ${parsed.label}`
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