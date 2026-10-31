// @ts-ignore
import { test, expect } from "bun:test";
import { canAdvanceOrder } from "../src/lib/order-payment-gate";

test("Pix online recusado não vai para preparo", () => {
  expect(canAdvanceOrder("preparo", "Pagar agora · Pix Online (Mercado Pago)", "rejected")).toBe(false);
});
test("Pix online pendente não vai para preparo", () => {
  expect(canAdvanceOrder("preparo", "Pix Online", "pending")).toBe(false);
});
test("Pix online aprovado vai para preparo", () => {
  expect(canAdvanceOrder("preparo", "Pix Online", "approved")).toBe(true);
});
test("Pix online recusado pode ser cancelado", () => {
  expect(canAdvanceOrder("cancelado", "Pix Online", "rejected")).toBe(true);
});
test("Dinheiro na entrega avança sem pagamento", () => {
  expect(canAdvanceOrder("preparo", "Pagar na entrega · Dinheiro em Espécie", "pending")).toBe(true);
});
