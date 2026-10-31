// @ts-ignore
import { expect, test } from "bun:test";
import { pixFailureMessage } from "../src/lib/pix-result";
test("Pix recusado por risco gera erro de segurança", () => {
  expect(pixFailureMessage("rejected", "rejected_high_risk", undefined)).toContain("por segurança");
});
test("Pix pendente sem QR gera erro em vez de tela vazia", () => {
  expect(pixFailureMessage("pending", "pending_waiting_transfer", "")).not.toBeNull();
});
test("Pix pendente com QR segue normalmente", () => {
  expect(pixFailureMessage("pending", "pending_waiting_transfer", "000201...")).toBeNull();
});
