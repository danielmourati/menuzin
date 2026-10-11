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
  const bigCols = Math.max(1, Math.floor(cols / 2));
  const double = !!options?.doubleBody;
  const bodyCols = double ? bigCols : cols;
  const bigSep = lineOf("=", bigCols);
  const bodySep = lineOf("=", bodyCols);
  const bodySepThin = lineOf("-", bodyCols);

  // Detalhe com rótulo: recuo pendente alinhado após o rótulo (ou 2 espaços
  // se o rótulo for longo demais para a largura).
  const detail = (label: string, value: string) => {
    const prefix = ` ${label}`;
    const hang = prefix.length > Math.floor(bodyCols / 3) ? 2 : prefix.length;
    return wrapIndent(value, bodyCols, prefix, hang);
  };

  const out: string[] = [];

  // Reset inicial
  out.push(ESC_INIT);

  // ── CABEÇALHO (fonte grande) ─────────────────────────────
  out.push(ESC_BIG);
  wrapIndent(KITCHEN_MODE_TITLE[order.mode], bigCols).forEach((l) => out.push(center(l, bigCols)));
  wrapIndent(`PEDIDO #${order.number}`, bigCols).forEach((l) => out.push(center(l, bigCols)));
  out.push(bigSep);

  if (order.scheduledFor)
    wrapIndent(`AGENDADO ${formatScheduledShort(order.scheduledFor)}`, bigCols).forEach((l) =>
      out.push(center(l, bigCols)),
    );
  if (order.source === "ai_agent")
    wrapIndent("VIA ATENDENTE IA", bigCols).forEach((l) => out.push(center(l, bigCols)));

  if (order.mode === "consumo_local" && order.table) {
    wrapIndent(`MESA: ${stripAccents(order.table)}`, bigCols).forEach((l) =>
      out.push(center(l, bigCols)),
    );
  } else if (order.customerName) {
    wrapIndent(stripAccents(order.customerName), bigCols).forEach((l) =>
      out.push(center(l, bigCols)),
    );
  }

  if (!double) out.push(ESC_NORMAL);
  out.push(bodySepThin);

  // ── ITENS (fonte normal ou dupla, conforme a impressora) ──
  order.items.forEach((item, idx) => {
    const qty = `${item.qty}x `;
    wrapIndent(stripAccents(item.name).toUpperCase(), bodyCols, qty, qty.length).forEach((l) =>
      out.push(l),
    );

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

    if (sizes.length) detail("Tam: ", sizes.join(", ")).forEach((l) => out.push(l));
    if (flavors.length) detail("Sabores: ", flavors.join(" + ")).forEach((l) => out.push(l));
    for (const [g, opts] of Object.entries(groups)) {
      detail(`${g}: `, opts.join(", ")).forEach((l) => out.push(l));
    }
    if (extras.length) {
      if (double) extras.forEach((e) => detail("+ ", e).forEach((l) => out.push(l)));
      else detail("+ ", extras.join(", ")).forEach((l) => out.push(l));
    }
    if (item.note)
      detail(">> OBS: ", stripAccents(item.note).toUpperCase()).forEach((l) => out.push(l));

    out.push(idx === order.items.length - 1 ? bodySep : bodySepThin);
  });

  // ── RODAPÉ (fonte normal) ────────────────────────────────
  out.push(ESC_NORMAL);
  // Bloco de troco para a expedição (somente pedidos em dinheiro), em fonte grande.
  const cashBlock = cashTicketBlock(order, bigCols);
  if (cashBlock) {
    out.push(ESC_BIG);
    cashBlock
      .flatMap((l) => l.split("\n"))
      .forEach((l) =>
        (l.length > bigCols ? wrapIndent(l.trim(), bigCols) : [l]).forEach((x) => out.push(x)),
      );
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
