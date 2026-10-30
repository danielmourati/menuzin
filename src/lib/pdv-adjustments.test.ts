import { describe, expect, test } from "bun:test";
import { computePdvDiscount } from "./pdv-discount";
import { isFlavorGroup, receiptFlavorBlock } from "./receipt-item-details";
import { normalizeSearch } from "./utils";

describe("ajustes PDV", () => {
  test("desconto em R$ não passa do subtotal", () => {
    expect(computePdvDiscount(35, 50, "brl")).toBe(35);
    expect(computePdvDiscount(35, 5, "brl")).toBe(5);
  });
  test("desconto em % sobre o subtotal", () => {
    expect(computePdvDiscount(35, 10, "pct")).toBe(3.5);
    expect(computePdvDiscount(35, 150, "pct")).toBe(35);
  });
  test("'Monte o seu' vira bloco de sabores sem o nome do grupo", () => {
    expect(isFlavorGroup("Monte o seu (até 2 Sabores)")).toBe(true);
    const block = receiptFlavorBlock({ name: "Pastel 2 Sabores", qty: 1, unitPrice: 12, addons: [
      { name: "Monte o seu (até 2 Sabores): Frango", price: 0 },
      { name: "Monte o seu (até 2 Sabores): Queijo Coalho", price: 0 },
    ] } as never, false);
    expect(block?.lines).toEqual(["Frango", "Queijo Coalho"]);
  });
  test("busca ignora acentos", () => {
    expect(normalizeSearch("Pastel de Camarão").includes(normalizeSearch("camarao"))).toBe(true);
  });
});
