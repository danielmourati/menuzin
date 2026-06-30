// Smoke tests for product selection validation.
// Run with: bun scripts/product-selection-tests.mjs
import assert from "node:assert/strict";
import {
  validateSelection,
  computeBasePrice,
  toggleFlavorId,
  toggleGroupOptionId,
  parseAddonLabel,
  getVisiblePizzaSizesForProduct,
  positivePizzaFlavorPrice,
  pizzaPreviewDivisor,
  pizzaChargeDivisor,
  pizzaFlavorShare,
  computeFractionedPizzaPrice,
} from "../src/lib/product-selection.ts";

const baseProduct = {
  id: "p1", name: "Pizza", price: 0, image: "", description: "", available: true,
  type: "pizza", maxFlavors: 2, allowObservations: true,
  sizes: [
    { id: "s-m", name: "Média", price: 40, sortOrder: 0 },
    { id: "s-g", name: "Grande", price: 60, sortOrder: 1 },
  ],
  flavors: [
    { id: "f1", name: "Margherita", description: "", priceDelta: 0, available: true, sortOrder: 0 },
    { id: "f2", name: "Calabresa", description: "", priceDelta: 5, available: true, sortOrder: 1 },
    { id: "f3", name: "Quatro Queijos", description: "", priceDelta: 10, available: true, sortOrder: 2 },
  ],
  addonGroups: [
    {
      id: "g1", name: "Borda", required: true, minSelect: 1, maxSelect: 1, sortOrder: 0, active: true,
      options: [
        { id: "o1", name: "Catupiry", price: 8, active: true, sortOrder: 0 },
        { id: "o2", name: "Cheddar", price: 8, active: true, sortOrder: 1 },
      ],
    },
    {
      id: "g2", name: "Adicionais", required: false, minSelect: 0, maxSelect: 2, sortOrder: 1, active: true,
      options: [
        { id: "o3", name: "Bacon", price: 3, active: true, sortOrder: 0 },
        { id: "o4", name: "Cebola", price: 2, active: true, sortOrder: 1 },
      ],
    },
  ],
};

// --- validateSelection ---
{
  const errs = validateSelection({ product: baseProduct, sizeId: null, flavorIds: [], groupSelections: {} });
  assert.ok(errs.includes("Escolha um tamanho"), "missing size");
  assert.ok(errs.includes("Escolha ao menos 1 sabor"), "missing flavor");
  assert.ok(errs.some((e) => e.startsWith("Borda:")), "required group missing");
}
{
  const errs = validateSelection({
    product: baseProduct, sizeId: "s-m", flavorIds: ["f1", "f2", "f3"], groupSelections: { g1: ["o1"] },
  });
  assert.ok(errs.some((e) => e.includes("Máximo 2 sabores")), "too many flavors");
}
{
  const errs = validateSelection({
    product: baseProduct, sizeId: "s-m", flavorIds: ["f1"], groupSelections: { g1: ["o1"], g2: ["o3", "o4"] },
  });
  assert.equal(errs.length, 0, `expected ok, got ${errs.join(" | ")}`);
}
{
  const errs = validateSelection({
    product: baseProduct, sizeId: "s-m", flavorIds: ["f1"], groupSelections: { g1: ["o1"], g2: ["o3", "o4", "o3"] },
  });
  assert.ok(errs.some((e) => e.includes("Adicionais: máximo 2")), "exceeded max in optional group");
}

// --- computeBasePrice ---
{
  const price = computeBasePrice(baseProduct, baseProduct.sizes[0], [baseProduct.flavors[0], baseProduct.flavors[2]]);
  // (0 + 10) / 2 = 5, base size = 40 → 45
  assert.equal(price, 45, `expected 45, got ${price}`);
}
{
  const plain = { ...baseProduct, type: "standard", sizes: undefined, flavors: undefined, addonGroups: undefined, price: 25, promoPrice: 20 };
  assert.equal(computeBasePrice(plain), 20, "promo price wins when no size");
}

// --- toggleFlavorId (max 2: replaces last) ---
{
  assert.deepEqual(toggleFlavorId(["a"], "a", 2), [], "remove if present");
  assert.deepEqual(toggleFlavorId(["a"], "b", 2), ["a", "b"], "add when under max");
  assert.deepEqual(toggleFlavorId(["a", "b"], "c", 2), ["a", "c"], "replace last when at max");
}

// --- toggleGroupOptionId ---
{
  // radio (max=1)
  assert.deepEqual(toggleGroupOptionId(["a"], "a", 1), [], "radio off");
  assert.deepEqual(toggleGroupOptionId(["a"], "b", 1), ["b"], "radio swap");
  // multi
  assert.deepEqual(toggleGroupOptionId(["a"], "b", 2), ["a", "b"], "multi add");
  assert.deepEqual(toggleGroupOptionId(["a", "b"], "c", 2), ["a", "b"], "multi blocked at max");
}

// --- pizza category pricing / visibility ---
{
  const pizzaSizes = [
    { id: "m", name: "Média", maxFlavors: 1 },
    { id: "g", name: "Pizza G (8 Fatias)", maxFlavors: 2 },
    { id: "f", name: "Família", maxFlavors: 3 },
  ];
  const flavors = [
    { id: "calabresa", pricesByCategorySizeId: { m: 0, g: 62 } },
    { id: "mussarela", pricesByCategorySizeId: { g: 62, f: 90 } },
  ];

  assert.equal(positivePizzaFlavorPrice(flavors[0], "m"), 0, "zero price is not configured");
  assert.deepEqual(
    getVisiblePizzaSizesForProduct(pizzaSizes, flavors, "calabresa").map((s) => s.id),
    ["g"],
    "selected flavor only shows sizes configured for that flavor",
  );
  assert.deepEqual(
    getVisiblePizzaSizesForProduct(pizzaSizes, flavors, "calabresa", [{ categorySizeId: "g", price: 62 }]).map((s) => s.id),
    ["g"],
    "opened product uses its own configured sizes as the strongest source of truth",
  );
  assert.deepEqual(
    getVisiblePizzaSizesForProduct(pizzaSizes, flavors).map((s) => s.id),
    ["g", "f"],
    "generic pizza modal hides zero-priced sizes",
  );
  assert.equal(pizzaPreviewDivisor(0, 2), 2, "2-flavor size previews half price before selection");
  assert.equal(pizzaPreviewDivisor(0, 3), 3, "3-flavor size previews one third before selection");
  assert.equal(pizzaPreviewDivisor(1, 2), 1, "single selected flavor is charged full price");
  assert.equal(pizzaChargeDivisor(2), 2, "two selected flavors charge halves");
  assert.equal(pizzaFlavorShare(62, 2), 31, "R$ 62 split in two is R$ 31");
  assert.equal(computeFractionedPizzaPrice([62, 62], 2), 62, "two half flavors total one full pizza");
  assert.equal(computeFractionedPizzaPrice([90, 90, 90], 3), 90, "three third flavors total one full pizza");
}

// --- parseAddonLabel ---
{
  assert.deepEqual(parseAddonLabel("Tamanho: Grande"), { kind: "size", label: "Grande" });
  assert.deepEqual(parseAddonLabel("Sabor: Calabresa"), { kind: "flavor", label: "Calabresa" });
  assert.deepEqual(parseAddonLabel("Borda: Catupiry"), { kind: "group", groupName: "Borda", label: "Catupiry" });
  assert.deepEqual(parseAddonLabel("Bacon Extra"), { kind: "addon", label: "Bacon Extra" });
}

console.log("✅ product-selection tests passed");
