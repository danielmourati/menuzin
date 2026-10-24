// Regra pura de roteamento de itens para locais de impressão.
// Prioridade: locais do produto > locais da categoria > local padrão.

export type PrintRouting = {
  products: Record<string, { category_id: string | null; print_location_ids: string[] }>;
  categories: Record<string, string[]>;
};

/** Locais escolhidos para um produto; [] = sem escolha (vai para o padrão). */
export function locationsForProduct(productId: string | null | undefined, routing: PrintRouting | null | undefined): string[] {
  if (!productId || !routing) return [];
  const p = routing.products[productId];
  if (!p) return [];
  if (p.print_location_ids?.length) return p.print_location_ids;
  if (p.category_id) return routing.categories[p.category_id] ?? [];
  return [];
}

/**
 * Itens que devem sair num local. Itens sem escolha (ou apontando só para
 * locais inativos/removidos) vão para o local padrão.
 */
export function itemsForPrinter<T extends { productId?: string | null }>(
  items: T[],
  printerId: string,
  defaultPrinterId: string,
  routing: PrintRouting | null | undefined,
  activePrinterIds: string[],
): T[] {
  const active = new Set(activePrinterIds);
  return items.filter((it) => {
    const locs = locationsForProduct(it.productId, routing).filter((id) => active.has(id));
    if (locs.length === 0) return printerId === defaultPrinterId;
    return locs.includes(printerId);
  });
}
