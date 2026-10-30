import assert from "node:assert/strict";
import { computePdvDiscount } from "../src/lib/pdv-discount.ts";
import { isFlavorGroup, receiptFlavorBlock, receiptItemDetails } from "../src/lib/receipt-item-details.ts";
import { normalizeSearch } from "../src/lib/utils.ts";
import { buildReceipt, sampleOrderForPreview } from "../src/lib/receipt-builder.ts";
import { plainPrintText } from "../src/lib/escpos-format.ts";
import { DEFAULT_PRINTER_SETTINGS } from "../src/lib/printer-types.ts";

// 1. Limite do desconto
assert.equal(computePdvDiscount(35, 50, "brl"), 35);
assert.equal(computePdvDiscount(35, 5, "brl"), 5);
assert.equal(computePdvDiscount(35, -5, "brl"), 0);
assert.equal(computePdvDiscount(35, 10, "pct"), 3.5);
assert.equal(computePdvDiscount(35, 150, "pct"), 35);

// 2. Regra de sabores "Monte o seu"
assert.equal(isFlavorGroup("Monte o seu (até 2 Sabores)"), true);
assert.equal(isFlavorGroup("Monte seu (até 3 Sabores)"), true);
assert.equal(isFlavorGroup("Monte o seu"), true);
assert.equal(isFlavorGroup("Escolha 2 sabores"), true);
assert.equal(isFlavorGroup("Sabores"), true);
assert.equal(isFlavorGroup("Adicionais"), false);

const item = {
  name: "Pastel 2 Sabores",
  qty: 1,
  unitPrice: 12,
  addons: [
    { name: "Monte o seu (até 2 Sabores): Frango", price: 0 },
    { name: "Monte o seu (até 2 Sabores): Queijo Coalho", price: 0 },
  ],
};
const block = receiptFlavorBlock(item, false);
assert.equal(block?.header, "Sabores:");
assert.deepEqual(block?.lines, ["Frango", "Queijo Coalho"]);
assert.deepEqual(receiptItemDetails(item, false), []);

// 3. Busca sem acentos
assert.equal(normalizeSearch("Pastel de Camarão").includes(normalizeSearch("camarao")), true);
assert.equal(normalizeSearch("pastel de camarao").includes(normalizeSearch("Camarão")), true);
assert.equal(normalizeSearch("Açaí na Tigela").includes(normalizeSearch("acai")), true);

// 4. Desconto e endereço livre no cupom impresso
const order = sampleOrderForPreview();
order.subtotal = 50;
order.discountAmount = 10;
order.deliveryFee = 5;
order.total = 45;
order.mode = "entrega";
order.address = { free_text: "Rua X, 120, perto do mercado" };

const plain = plainPrintText(buildReceipt(order, 42, DEFAULT_PRINTER_SETTINGS, {}));
assert(plain.includes("Subtotal"));
assert(plain.includes("Desconto"));
assert(plain.includes("-10,00"));
assert(plain.includes("TOTAL") && plain.includes("45,00"));
assert(plain.includes("Rua X, 120, perto do mercado"));

console.log("All PDV adjustments tests passed successfully!");

