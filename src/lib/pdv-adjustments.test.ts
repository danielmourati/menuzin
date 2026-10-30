// @ts-nocheck
import { describe, expect, test } from "bun:test";
import { computePdvDiscount } from "./pdv-discount";
import { isFlavorGroup, receiptFlavorBlock, receiptItemDetails } from "./receipt-item-details";
import { normalizeSearch } from "./utils";
import { buildReceipt, sampleOrderForPreview } from "./receipt-builder";
import { plainPrintText } from "./escpos-format";
import { DEFAULT_PRINTER_SETTINGS } from "./printer-types";

describe("ajustes PDV", () => {
  test("desconto em R$ não passa do subtotal", () => {
    expect(computePdvDiscount(35, 50, "brl")).toBe(35);
    expect(computePdvDiscount(35, 5, "brl")).toBe(5);
    expect(computePdvDiscount(35, -5, "brl")).toBe(0);
  });

  test("desconto em % sobre o subtotal", () => {
    expect(computePdvDiscount(35, 10, "pct")).toBe(3.5);
    expect(computePdvDiscount(35, 150, "pct")).toBe(35);
  });

  test("'Monte o seu' vira bloco de sabores sem o nome do grupo", () => {
    expect(isFlavorGroup("Monte o seu (até 2 Sabores)")).toBe(true);
    expect(isFlavorGroup("Monte seu (até 3 Sabores)")).toBe(true);
    expect(isFlavorGroup("Monte o seu")).toBe(true);
    expect(isFlavorGroup("Escolha 2 sabores")).toBe(true);
    expect(isFlavorGroup("Sabores")).toBe(true);
    expect(isFlavorGroup("Adicionais")).toBe(false);

    const item = {
      name: "Pastel 2 Sabores",
      qty: 1,
      unitPrice: 12,
      addons: [
        { name: "Monte o seu (até 2 Sabores): Frango", price: 0 },
        { name: "Monte o seu (até 2 Sabores): Queijo Coalho", price: 0 },
      ],
    };
    const block = receiptFlavorBlock(item as never, false);
    expect(block?.header).toBe("Sabores:");
    expect(block?.lines).toEqual(["Frango", "Queijo Coalho"]);
    expect(receiptItemDetails(item as never, false)).toEqual([]);
  });

  test("busca ignora acentos", () => {
    expect(normalizeSearch("Pastel de Camarão").includes(normalizeSearch("camarao"))).toBe(true);
    expect(normalizeSearch("pastel de camarao").includes(normalizeSearch("Camarão"))).toBe(true);
    expect(normalizeSearch("Açaí na Tigela").includes(normalizeSearch("acai"))).toBe(true);
  });

  test("cupom imprime desconto e endereço avulso quando presentes", () => {
    const order = sampleOrderForPreview();
    order.subtotal = 50;
    order.discountAmount = 10;
    order.deliveryFee = 5;
    order.total = 45;
    order.mode = "entrega";
    order.address = { free_text: "Rua X, 120, perto do mercado" };

    const plain = plainPrintText(buildReceipt(order, 42, DEFAULT_PRINTER_SETTINGS, {}));
    expect(plain.includes("Subtotal")).toBe(true);
    expect(plain.includes("Desconto")).toBe(true);
    expect(plain.includes("-10,00")).toBe(true);
    expect(plain.includes("TOTAL")).toBe(true);
    expect(plain.includes("45,00")).toBe(true);
    expect(plain.includes("Rua X, 120, perto do mercado")).toBe(true);
  });
});
