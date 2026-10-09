// Builder de comanda simplificada para impressora da cozinha.
// Omite valores financeiros, dados da loja e métodos de pagamento.
// Foco: informação operacional para preparo, com fonte ampliada nos itens
// para leitura rápida de longe pela cozinha.

import { formatDateTime } from "@/lib/format";
import type { Order } from "@/lib/domain-types";
import { parseAddonLabel } from "@/lib/product-selection";
import { formatScheduledShort } from "@/lib/scheduling";
import { cashTicketBlock } from "@/lib/cash-change";
import { center, lineOf, stripAccents, wrap } from "@/lib/receipt-builder";
import { columnsFor, type PaperWidth, type FontSize, type FontFamily } from "@/lib/printer-types";

// ...
export function kitchenColumnsFor(paper: PaperWidth, fontSize?: FontSize, fontFamily?: FontFamily) {
  return columnsFor(paper, fontSize, fontFamily);
}

// ESC/POS sequences:
// - ESC @         (\x1b@)        : initialize printer
// - GS ! n        (\x1d!n)       : char size; high nibble = altura, low = largura
//   0x00 = normal · 0x11 = 2x largura+altura · 0x01 = só 2x largura
const ESC_INIT = "\x1b@";
const ESC_BIG = "\x1d!\x11";
const ESC_NORMAL = "\x1d!\x00";

const KITCHEN_MODE_TITLE: Record<Order["mode"], string> = {
  entrega: "DELIVERY",
  retirada: "RETIRADA",
  consumo_local: "CONSUMO",
};

export function buildKitchenTicket(
  order: Order,
  cols: number,
  options?: { doubleBody?: boolean },
): string {
  const sep = lineOf("=", cols);
  const sepThin = lineOf("-", cols);
  const bigCols = Math.max(12, Math.floor(cols / 2));
  const bodyCols = options?.doubleBody ? bigCols : cols;
  const bigSep = lineOf("=", bigCols);
  const bodySepThin = lineOf("-", bodyCols);

  const out: string[] = [];

  // Reset inicial
  out.push(ESC_INIT);

  // ── CABEÇALHO (fonte grande) ─────────────────────────────
  out.push(ESC_BIG);
  out.push(center(KITCHEN_MODE_TITLE[order.mode], bigCols));
  out.push(center(`PEDIDO #${order.number}`, bigCols));
  out.push(bigSep);

  if (order.scheduledFor)
    out.push(center(`AGENDADO ${formatScheduledShort(order.scheduledFor)}`, bigCols));

  if (order.mode === "consumo_local" && order.table) {
    wrap(`MESA: ${stripAccents(order.table)}`, bigCols).forEach((l) =>
      out.push(center(l, bigCols)),
    );
  } else if (order.customerName) {
    wrap(stripAccents(order.customerName), bigCols).forEach((l) => out.push(center(l, bigCols)));
  }
  out.push(bodySepThin);

  if (!options?.doubleBody) out.push(ESC_NORMAL);

  // ── ITENS (fonte normal ou dupla, conforme a impressora) ──
  for (const item of order.items) {
    const head = `${item.qty}x ${stripAccents(item.name).toUpperCase()}`;
    wrap(head, bodyCols).forEach((l) => out.push(l));

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

    if (sizes.length) wrap(` Tam: ${sizes.join(", ")}`, bodyCols).forEach((l) => out.push(l));
    if (flavors.length)
      wrap(` Sabores: ${flavors.join(" + ")}`, bodyCols).forEach((l) => out.push(l));
    for (const [g, opts] of Object.entries(groups)) {
      wrap(` ${g}: ${opts.join(", ")}`, bodyCols).forEach((l) => out.push(l));
    }
    if (extras.length) wrap(` + ${extras.join(", ")}`, bodyCols).forEach((l) => out.push(l));
    if (item.note)
      wrap(` >> OBS: ${stripAccents(item.note).toUpperCase()}`, bodyCols).forEach((l) =>
        out.push(l),
      );

    out.push("");
  }

  // ── RODAPÉ (fonte normal) ────────────────────────────────
  out.push(ESC_NORMAL);
  // Bloco de troco para a expedição (somente pedidos em dinheiro), em fonte grande.
  const cashBlock = cashTicketBlock(order, bigCols);
  if (cashBlock) {
    out.push(ESC_BIG);
    cashBlock.forEach((l) => out.push(l));
    out.push(ESC_NORMAL);
  }
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
