import { describe, it, expect } from "vitest";
import { computeStoreOpen } from "../src/lib/store-hours";

const hoursSchedule = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, enabled: true, open: "18:00", close: "23:20" }));
const t = { openMode: "open" as const, hoursSchedule };

describe("abertura manual respeita o fechamento", () => {
  it("23:33 de sábado (pedido #1550) → fechada", () => {
    expect(computeStoreOpen(t, new Date("2026-11-22T02:33:00Z")).open).toBe(false);
  });
  it("17:00 → aberta manualmente antes do horário", () => {
    expect(computeStoreOpen(t, new Date("2026-11-21T20:00:00Z")).open).toBe(true);
  });
  it("23:00 → aberta", () => {
    expect(computeStoreOpen(t, new Date("2026-11-22T02:00:00Z")).open).toBe(true);
  });
});
