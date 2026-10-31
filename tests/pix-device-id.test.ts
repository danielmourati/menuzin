import { describe, expect, test } from "bun:test";
import { CreateTransparentPaymentInput } from "../src/lib/payments.functions";

const base = {
  store_slug: "pastelaojunin",
  order_id: "2782b2ec-334c-4cd6-96d8-3285a9d5ac2a",
  payment_method: "pix_online" as const,
  payer: {
    email: "",
    phone: "86994422827",
    first_name: "Daniel",
    last_name: "Sistema",
    identification: { type: "CPF" as const, number: "52998224725" },
  },
};

describe("Pix: device id do Mercado Pago", () => {
  test("aceita o device id longo (231 caracteres) gerado pelo security.js", () => {
    const deviceId = "armor." + "a".repeat(225);
    expect(deviceId.length).toBe(231);
    expect(() => CreateTransparentPaymentInput.parse({ ...base, device_id: deviceId })).not.toThrow();
  });
});
