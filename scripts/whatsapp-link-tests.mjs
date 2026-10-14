import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildWhatsAppLink } from "../src/lib/whatsapp-link.ts";
import { whatsappLink as formatLink, whatsappOrderMessage } from "../src/lib/format.ts";
import { whatsappLink as orderLink } from "../src/lib/whatsapp.ts";
import { driverWhatsAppUrl, buildDriverSummaryWhatsApp } from "../src/lib/driver-summary.ts";

const samples = [
  "🛵 🍔 ⏳ 🎉 🗺️ 👨‍👩‍👧‍👦 👍🏽",
  "Olá, João! *Pedido #1047*\nSão Paulo — R$ 100,00\nTroco: R$ 12,00",
  "Confira o cardápio de Açaí & Cia 🍔: https://menuzin.app/demo?cupom=A%20B&produto=carne#pedido",
  "Observação literal: 50% + %F0%9F%8D%94 (não decodificar texto do cliente)",
];
for (const text of samples) {
  const link = buildWhatsAppLink("5586999312882", text);
  const url = new URL(link);
  assert.equal(url.searchParams.get("text"), text);
  assert.equal(url.hash, "");
  assert.equal([...url.searchParams].length, 1);
  assert.equal(url.pathname, "/5586999312882");
  assert.equal(new URL(formatLink("(86) 99931-2882", text)).searchParams.get("text"), text);
  assert.equal(new URL(orderLink("5586999312882", text)).searchParams.get("text"), text);
  assert.equal(new URL(driverWhatsAppUrl(null, text)).searchParams.get("text"), text);
}
assert.equal(buildWhatsAppLink("5586999312882"), "https://wa.me/5586999312882");
assert.equal(formatLink("", "Olá"), "#");
assert.equal(new URL(driverWhatsAppUrl("86999312882", "Olá")).pathname, "/5586999312882");
for (const status of ["aceito", "preparo", "saiu_entrega", "pronto_retirada", "cancelado", "conversa"]) {
  const text = whatsappOrderMessage(status, { cliente: "João 🧑🏽", numero: 1047, loja: "Açaí & Cia", motivo: "Cliente solicitou" });
  assert.equal(new URL(formatLink("86999312882", text)).searchParams.get("text"), text);
  assert.ok(!text.includes("�"));
}
const summary = buildDriverSummaryWhatsApp({
  driver_name: "João 🛵", deliveries: [{ number: 1047, is_cash: true, total: 50, paid_with: 100, fee: 8, neighborhood: "São José" }],
  orders: 1, to_collect: 50, change_out: 50, must_return: 50, fees_total: 8,
}, { opened_at: "2026-10-14T12:00:00Z", closed_at: null }, "Açaí & Cia");
assert.equal(new URL(driverWhatsAppUrl("86999312882", summary)).searchParams.get("text"), summary);
assert.ok(summary.includes("Total a devolver: R$ 50,00"));
assert.ok(summary.includes("Total: R$ 8,00"));
const storefront = readFileSync(new URL("../src/routes/$slug.tsx", import.meta.url), "utf8");
assert.ok(!storefront.includes("api.whatsapp.com/send?text="));
assert.equal(storefront.match(/buildWhatsAppLink\(null, `Confira o cardápio/g)?.length, 2);
console.log("WhatsApp: Unicode, emojis compostos, acentos, linhas, URLs, status e resumo preservados.");