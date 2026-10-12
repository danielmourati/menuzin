import assert from "node:assert/strict";
import { columnsFor, DEFAULT_PRINTER_SETTINGS, resolvePrinterTypography } from "../src/lib/printer-types.ts";
import { buildReceipt, sampleOrderForPreview, wrapIndent } from "../src/lib/receipt-builder.ts";
import { buildKitchenTicket } from "../src/lib/kitchen-ticket.ts";
import { plainPrintText, parsePrintSpans, ESC_BOLD_ON, ESC_BOLD_OFF } from "../src/lib/escpos-format.ts";
import { receiptItemDetails, receiptItemName, receiptFlavorBlock } from "../src/lib/receipt-item-details.ts";

const order = sampleOrderForPreview();
order.items.push({ productId: "long", name: "Calabresa Mineira", qty: 3, unitPrice: 24, addons: [{ id: "paid", name: "Adicionais (Grátis): Queijo", price: 4 }], note: "Sem cebola e sem molho, embalar separado por favor" });
order.items.push({ productId: "montado", name: "Pastel Montado", qty: 1, unitPrice: 15, addons: [{ id: "f1", name: "Escolha 2 sabores: Calabresa", price: 0 }, { id: "f2", name: "Escolha 2 sabores: Mussarela", price: 0 }], note: null });
const original = JSON.stringify(order);
for (const size of ["normal", "large", "compact"]) for (const family of ["mono", "sans", "condensed"]) assert.equal(columnsFor("55mm", size, family), 32);
assert.equal(resolvePrinterTypography({ ...DEFAULT_PRINTER_SETTINGS, paper_width: "55mm", font_size: "large" }).cols, 32);
assert.equal(columnsFor("80mm"), 42);
assert.equal(columnsFor("80mm", "compact"), 56);
assert.equal(columnsFor("80mm", "large"), 32);
for (const cols of [32, 42, 56]) {
  const receipt = buildReceipt(order, cols, DEFAULT_PRINTER_SETTINGS, {});
  const plain = plainPrintText(receipt);
  assert(receipt.startsWith("\x1b@"));
  assert(plain.includes("2x Carne (GRANDE)"));
  assert(plain.includes("2x Frango (PEQUENO)"));
  assert(!plain.includes("Tamanho:"));
  assert(plain.indexOf(" - Obs: Sem cebola") < plain.indexOf("Unit: 9,00 Total: 18,00"));
  assert(plain.includes(" - Todos os adicionais"));
  assert(!plain.includes("[Todos"));
  assert(!plain.includes("Adicionais (Gratis):"));
  assert(!plain.includes("+ 1x"));
  assert(receipt.includes(ESC_BOLD_ON + "2x Carne"));
  assert(receipt.includes("18,00" + ESC_BOLD_OFF));
  assert(plain.includes("Queijo (+4,00)"));
  assert(plain.includes("Sabores:"));
  assert(plain.includes("- Calabresa"));
  assert(plain.includes("- Mussarela"));
  assert(!plain.includes("Escolha 2 sabores"));
  assert(parsePrintSpans(receipt).some(s => s.bold && s.text.includes("Sabores:")));
  for (const line of plain.split("\n")) assert(line.length <= cols, `${cols}: ${line}`);
  for (const doubleBody of [false, true]) {
    const ticket = buildKitchenTicket(order, cols, { doubleBody });
    const kitchenPlain = plainPrintText(ticket);
    assert(!kitchenPlain.includes("Unit:"));
    assert(!kitchenPlain.includes("4,00"));
    assert(!kitchenPlain.includes("Tamanho:"));
    assert(kitchenPlain.includes("(PEQUENO)"));
    assert(kitchenPlain.includes("Sabores:"));
    assert(kitchenPlain.includes("- Mussarela"));
    assert(!kitchenPlain.includes("\n\n"), "formatting commands must not feed blank lines");
    let width = 0;
    for (const span of parsePrintSpans(ticket)) for (const ch of span.text) {
      if (ch === "\n") { assert(width <= cols, `width ${width}/${cols}`); width = 0; }
      else width += span.double ? 2 : 1;
    }
    assert(width <= cols);
    assert(parsePrintSpans(ticket).some(s => s.bold && s.text.includes("CARNE")));
  }
}
assert.deepEqual(receiptItemDetails(order.items[1], false), ["Todos os adicionais"]);
assert.deepEqual(receiptFlavorBlock(order.items[4], true), { header: "Sabores:", lines: ["Calabresa", "Mussarela"] });
assert.equal(receiptFlavorBlock(order.items[0], true), null);
assert.equal(receiptItemName(order.items[0]), "Carne (GRANDE)");
assert.equal(receiptItemName(order.items[1]), "Frango (PEQUENO)");
assert.equal(receiptItemName(order.items[2]), "Taxa de Servico");
for (const [mode, title] of [["entrega", "DELIVERY"], ["retirada", "RETIRADA"], ["consumo_local", "CONSUMO"]]) {
  const receipt = buildReceipt({ ...order, mode }, 32, DEFAULT_PRINTER_SETTINGS, {});
  assert(plainPrintText(receipt).indexOf(title) < plainPrintText(receipt).indexOf("PEDIDO #"));
  assert(parsePrintSpans(receipt).some(s => s.bold && s.double && s.text.includes(title)));
}
assert.deepEqual(wrapIndent("Pequeno", 16, " - Tamanho: ", 3), [" - Tamanho:", "   Pequeno"]);
assert.equal(JSON.stringify(order), original, "printing must not change the order");
console.log("Receipt layout tests passed: 55/80mm, normal/double, bold, paid/free extras, all extras, wrapping and unchanged values.");