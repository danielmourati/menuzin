import assert from "node:assert/strict";
import { columnsFor, DEFAULT_PRINTER_SETTINGS, resolvePrinterTypography } from "../src/lib/printer-types.ts";
import { buildReceipt, sampleOrderForPreview, wrapIndent } from "../src/lib/receipt-builder.ts";
import { buildKitchenTicket } from "../src/lib/kitchen-ticket.ts";
import { plainPrintText, parsePrintSpans, ESC_BOLD_ON, ESC_BOLD_OFF } from "../src/lib/escpos-format.ts";
import { receiptItemDetails } from "../src/lib/receipt-item-details.ts";

const order = sampleOrderForPreview();
order.items.push({ productId: "long", name: "Calabresa Mineira", qty: 3, unitPrice: 24, addons: [{ id: "paid", name: "Adicionais (Grátis): Queijo", price: 4 }], note: "Sem cebola e sem molho, embalar separado por favor" });
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
  assert(plain.includes("2x Carne\nUnit: 9,00  Total: 18,00"));
  assert(plain.includes(" - Todos os adicionais"));
  assert(!plain.includes("[Todos"));
  assert(!plain.includes("Adicionais (Gratis):"));
  assert(!plain.includes("+ 1x"));
  assert(receipt.includes(ESC_BOLD_ON + "2x Carne"));
  assert(receipt.includes("18,00" + ESC_BOLD_OFF));
  assert(plain.includes("Queijo (+4,00)"));
  for (const line of plain.split("\n")) assert(line.length <= cols, `${cols}: ${line}`);
  for (const doubleBody of [false, true]) {
    const ticket = buildKitchenTicket(order, cols, { doubleBody });
    const kitchenPlain = plainPrintText(ticket);
    assert(!kitchenPlain.includes("Unit:"));
    assert(!kitchenPlain.includes("4,00"));
    assert(kitchenPlain.includes(" - Tamanho: Pequeno"));
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
assert.deepEqual(receiptItemDetails(order.items[1], false), ["Tamanho: Pequeno", "Todos os adicionais"]);
assert.deepEqual(wrapIndent("Pequeno", 16, " - Tamanho: ", 3), [" - Tamanho:", "   Pequeno"]);
assert.equal(JSON.stringify(order), original, "printing must not change the order");
console.log("Receipt layout tests passed: 55/80mm, normal/double, bold, paid/free extras, all extras, wrapping and unchanged values.");