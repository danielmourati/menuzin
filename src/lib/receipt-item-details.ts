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

const stripAccentsLocal = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Grupos de sabores: "Escolha N sabores", "Sabores" ou "Monte o seu (...)" (nome do grupo no admin). */
export function isFlavorGroup(groupName?: string): boolean {
  if (!groupName) return false;
  const g = stripAccentsLocal(groupName).trim().toLowerCase();
  return /^(escolha\s+\d+\s+sabores|sabores)$/.test(g) || /^monte\s+(o\s+)?seu\b/.test(g);
}

export type ReceiptFlavorBlock = { header: string; lines: string[] };

/**
 * Bloco de sabores para grupos "Escolha N sabores"/"Sabores": cabeçalho único
 * "Sabores:" + um sabor por linha (sem repetir o nome do grupo). Retorna null
 * quando o item não tem grupos de sabores. Imprime em negrito nos builders.
 */
export function receiptFlavorBlock(
  item: Order["items"][number],
  showPrices: boolean,
): ReceiptFlavorBlock | null {
  const lines: string[] = [];
  for (const addon of item.addons ?? []) {
    const parsed = parseAddonLabel(addon.name);
    if (parsed.kind !== "group" || !isFlavorGroup(parsed.groupName)) continue;
    let label = parsed.label.trim();
    if (showPrices && Number(addon.price) > 0) {
      label += ` (+${Number(addon.price).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
    }
    lines.push(label);
  }
  if (!lines.length) return null;
  return { header: "Sabores:", lines };
}

/** Compact descriptions only; no catalog changes or recalculation of recorded prices. */
export function receiptItemDetails(item: Order["items"][number], showPrices: boolean): string[] {
  const out: string[] = [];
  for (const addon of item.addons ?? []) {
    const parsed = parseAddonLabel(addon.name);
    if (parsed.kind === "size") continue;
    if (parsed.kind === "group" && isFlavorGroup(parsed.groupName)) continue; // impressos via receiptFlavorBlock
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
  // Adicionais repetidos (quantidade) viram "2x Bacon".
  const counts = new Map<string, number>();
  for (const l of out) counts.set(l, (counts.get(l) ?? 0) + 1);
  const grouped = [...counts].map(([l, n]) => (n > 1 ? `${n}x ${l}` : l));
  if (item.note?.trim()) grouped.push(`Obs: ${item.note.trim()}`);
  return grouped;
}