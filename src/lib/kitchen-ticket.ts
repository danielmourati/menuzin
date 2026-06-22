// Builder de comanda simplificada para impressora da cozinha.
// Omite valores financeiros, dados da loja e métodos de pagamento.
// Foco: informação operacional para preparo, com fonte ampliada nos itens
// para leitura rápida de longe pela cozinha.

import { formatDateTime, modeLabel } from "@/lib/format";
import type { Order } from "@/lib/domain-types";
import { parseAddonLabel } from "@/lib/product-selection";
import {
  center,
  lineOf,
  stripAccents,
  wrap,
} from "@/lib/receipt-builder";
import { columnsFor, type PaperWidth } from "@/lib/printer-types";

// ESC/POS sequences:
// - ESC @         (\x1b@)        : initialize printer
// - GS ! n        (\x1d!n)       : char size; high nibble = altura, low = largura
//   0x00 = normal · 0x11 = 2x largura+altura · 0x01 = só 2x largura
const ESC_INIT = "\x1b@";
const ESC_BIG = "\x1d!\x11"; // 2x largura + 2x altura
const ESC_NORMAL = "\x1d!\x00";

export function buildKitchenTicket(order: Order, cols: number): string {
  const sep = lineOf("=", cols);
  const sepThin = lineOf("-", cols);
  // Em fonte 2x largura, cada char ocupa o dobro -> reduzimos cols pela metade
  // para o bloco de itens. Mantemos um mínimo seguro.
  const bigCols = Math.max(12, Math.floor(cols / 2));
  const bigSep = lineOf("=", bigCols);
  const bigSepThin = lineOf("-", bigCols);

  const out: string[] = [];

  // Reset inicial
  out.push(ESC_INIT);

  // ── CABEÇALHO (fonte grande) ─────────────────────────────
  out.push(ESC_BIG);
  out.push(center(`COZINHA`, bigCols));
  out.push(center(`PEDIDO #${order.number}`, bigCols));
  out.push(bigSep);

  const mode = stripAccents(modeLabel[order.mode] ?? order.mode).toUpperCase();
  out.push(center(mode, bigCols));

  if (order.mode === "consumo_local" && order.table) {
    wrap(`MESA: ${stripAccents(order.table)}`, bigCols).forEach((l) => out.push(center(l, bigCols)));
  } else if (order.customerName) {
    wrap(stripAccents(order.customerName), bigCols).forEach((l) => out.push(center(l, bigCols)));
  }
  out.push(bigSepThin);

  // ── ITENS (fonte grande) ──────────────────────────────────
  for (const item of order.items) {
    const head = `${item.qty}x ${stripAccents(item.name).toUpperCase()}`;
    wrap(head, bigCols).forEach((l) => out.push(l));

    const sizes: string[] = [];
    const flavors: string[] = [];
    const groups: Record<string, string[]> = {};
    const extras: string[] = [];

    for (const a of item.addons ?? []) {
      const p = parseAddonLabel(a.name);
      const label = stripAccents(p.label);
      if (p.kind === "size") sizes.push(label);
      else if (p.kind === "flavor") flavors.push(label);
      else if (p.kind === "group" && p.groupName) {
        const g = stripAccents(p.groupName);
        (groups[g] ||= []).push(label);
      } else extras.push(label);
    }

    if (sizes.length) wrap(` Tam: ${sizes.join(", ")}`, bigCols).forEach((l) => out.push(l));
    if (flavors.length) wrap(` Sabores: ${flavors.join(" + ")}`, bigCols).forEach((l) => out.push(l));
    for (const [g, opts] of Object.entries(groups)) {
      wrap(` ${g}: ${opts.join(", ")}`, bigCols).forEach((l) => out.push(l));
    }
    if (extras.length) wrap(` + ${extras.join(", ")}`, bigCols).forEach((l) => out.push(l));
    if (item.note) wrap(` >> OBS: ${stripAccents(item.note).toUpperCase()}`, bigCols).forEach((l) => out.push(l));

    out.push("");
  }

  // ── RODAPÉ (fonte normal) ────────────────────────────────
  out.push(ESC_NORMAL);
  if (order.note) {
    out.push(sepThin);
    out.push("NOTA GERAL:");
    wrap(stripAccents(order.note), cols).forEach((l) => out.push(l));
  }
  out.push(sep);
  out.push(center(formatDateTime(order.createdAt), cols));
  out.push(sep);

  return out.join("\n");
}

export function kitchenColumnsFor(paper: PaperWidth) {
  return columnsFor(paper);
}
