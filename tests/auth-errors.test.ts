import { describe, it, expect } from "vitest";
import { translateAuthError } from "../src/lib/auth-errors";
describe("translateAuthError", () => {
  it("traduz senha fraca", () => {
    expect(translateAuthError("Password is known to be weak and easy to guess, please choose a different one.")).toBe("Essa senha é muito comum e fácil de adivinhar. Escolha outra.");
  });
  it("traduz e-mail já cadastrado", () => {
    expect(translateAuthError("A user with this email address has already been registered")).toBe("Este e-mail já está cadastrado.");
  });
});
