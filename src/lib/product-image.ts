import defaultFood from "@/assets/default-food.svg.asset.json";

export const DEFAULT_PRODUCT_IMAGE = defaultFood.url;

export function productImage(url?: string | null): string {
  return url && url.trim() ? url : DEFAULT_PRODUCT_IMAGE;
}

export function isDefaultProductImage(url?: string | null): boolean {
  return !url || !url.trim();
}
