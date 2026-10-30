import { describe, expect, test } from "bun:test";
import { stepGroupOptionQty } from "./product-selection";
import { receiptItemDetails } from "./receipt-item-details";

describe("quantidade de adicionais no PDV", () => {
  test("+ duas vezes gera 2 unidades do mesmo adicional", () => {
    expect(stepGroupOptionQty(stepGroupOptionQty([], "bacon", 1, 0), "bacon", 1, 0)).toEqual(["bacon", "bacon"]);
  });
  test("respeita o máximo do grupo", () => {
    expect(stepGroupOptionQty(["a", "b"], "a", 1, 2)).toEqual(["a", "b"]);
  });
  test("- remove uma unidade", () => {
    expect(stepGroupOptionQty(["a", "a", "b"], "a", -1, 0)).toEqual(["a", "b"]);
  });
  test("comanda agrupa repetidos como 2x", () => {
    const item = { addons: [{ name: "Bacon", price: 3.5 }, { name: "Bacon", price: 3.5 }], note: null } as any;
    expect(receiptItemDetails(item, false)).toEqual(["2x Bacon"]);
  });
});
