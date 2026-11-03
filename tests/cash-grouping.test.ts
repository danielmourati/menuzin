import { describe, expect, it } from "vitest";
import { summarizeByMethod, spDayKey, dayLabel, diffKind, groupBy, spMonthKey } from "../src/lib/cash-grouping";

describe("cash grouping", () => {
  it("total do turno soma todas as formas e ignora cancelados", () => {
    const r = summarizeByMethod([
      { status: "finalizado", total: 50, payment_label: "Dinheiro" },
      { status: "finalizado", total: 30.5, payment_label: "Pix Online" },
      { status: "finalizado", total: 20, payment_label: "Dinheiro" },
      { status: "cancelado", total: 99, payment_label: "Pix Online" },
    ]);
    expect(r.total).toBe(100.5);
    expect(r.methods[0]).toEqual({ label: "Dinheiro", count: 2, total: 70 });
  });
  it("dia em São Paulo: 01:00 UTC pertence ao dia anterior", () => {
    expect(spDayKey("2026-10-25T01:00:00Z")).toBe("2026-10-24");
  });
  it("rótulos Hoje/Ontem", () => {
    const now = new Date("2026-11-03T15:00:00Z");
    expect(dayLabel("2026-11-03", now)).toBe("Hoje");
    expect(dayLabel("2026-11-02", now)).toBe("Ontem");
    expect(dayLabel("2026-10-24", now)).toBe("24/10/2026");
  });
  it("agrupa por mês mais recente primeiro", () => {
    const g = groupBy(["2026-10-05T12:00:00Z", "2026-11-01T12:00:00Z"], spMonthKey);
    expect(g.map((x) => x.key)).toEqual(["2026-11", "2026-10"]);
  });
  it("situação do fechamento", () => {
    expect(diffKind(0)).toBe("ok");
    expect(diffKind(2)).toBe("sobra");
    expect(diffKind(-1)).toBe("falta");
  });
});
