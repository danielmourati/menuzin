// Pure helper: decides whether a PDV product must go through the customization modal
// (pizza, multi-flavor, combo/offer, or a required add-on group applies).

export type PdvGroupLite = {
  active: boolean;
  required: boolean;
  min_select: number;
  targets: { category_id: string | null; product_id: string | null }[];
};

export type PdvProductLite = {
  id: string;
  category_id: string | null;
  type?: string | null;
  max_flavors?: number | null;
  offer_max_flavors?: number | null;
};

export function requiresCustomization(
  p: PdvProductLite,
  ctx: { categoryKind?: string | null; groups: PdvGroupLite[] },
): boolean {
  if (p.type === "pizza" || ctx.categoryKind === "pizza") return true;
  if (ctx.categoryKind === "oferta") return true;
  if ((p.max_flavors ?? 0) > 1 || (p.offer_max_flavors ?? 0) > 1) return true;
  return ctx.groups.some(
    (g) =>
      g.active &&
      (g.required || g.min_select > 0) &&
      g.targets.some((t) => t.product_id === p.id || (!!p.category_id && t.category_id === p.category_id)),
  );
}

/** Stable soft color per category (token-based palette). */
const PALETTE = [
  "bg-primary text-primary-foreground",
  "bg-success text-success-foreground",
  "bg-chart-1 text-primary-foreground",
  "bg-chart-2 text-primary-foreground",
  "bg-chart-3 text-primary-foreground",
  "bg-chart-4 text-primary-foreground",
  "bg-chart-5 text-primary-foreground",
  "bg-secondary text-secondary-foreground",
];
export function categoryColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
