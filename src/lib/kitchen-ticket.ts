// Builder de comanda simplificada para impressora da cozinha.
// Omite valores financeiros, dados da loja e métodos de pagamento.
// Foco: informação operacional para preparo, com fonte ampliada nos itens
// para leitura rápida de longe pela cozinha.

import { formatDateTime } from "@/lib/format";
import type { Order } from "@/lib/domain-types";
import { receiptItemDetails } from "@/lib/receipt-item-details";
import { ESC_BOLD_ON, ESC_BOLD_OFF, printerReset, compactPrintCommands } from "@/lib/escpos-format";
import { formatScheduledShort } from "@/lib/scheduling";
import { cashTicketBlock } from "@/lib/cash-change";
import { center, lineOf, stripAccents, wrap, wrapIndent } from "@/lib/receipt-builder";
import { columnsFor, type PaperWidth, type FontSize, type FontFamily } from "@/lib/printer-types";

// ...
export function kitchenColumnsFor(paper: PaperWidth, fontSize?: FontSize, fontFamily?: FontFamily) {
  return columnsFor(paper, fontSize, fontFamily);
}

// ESC/POS sequences:
// - ESC @         (\x1b@)        : initialize printer
// - GS ! n        (\x1d!n)       : char size; high nibble = altura, low = largura
//   0x00 = normal · 0x11 = 2x largura+altura · 0x01 = só 2x largura
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
  options?: { doubleBody?: boolean; compact?: boolean },
): string {
  const sep = lineOf("=", cols);
  const sepThin = lineOf("-", cols);
  const bigCols = Math.max(1, Math.floor(cols / 2));
  const double = !!options?.doubleBody;
  const bodyCols = double ? bigCols : cols;
  const bigSep = lineOf("=", bigCols);

  const out: string[] = [];

  // Reset inicial
  out.push(printerReset(options?.compact));

  // ── CABEÇALHO (fonte grande) ─────────────────────────────
  out.push(ESC_BIG);
  if (order.editedAt) out.push(center("*ALTERADO*", bigCols));
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

  out.push(ESC_NORMAL);
  out.push(sepThin);

  // ── ITENS (fonte normal ou dupla, conforme a impressora) ──
  order.items.forEach((item, idx) => {
    out.push(double ? ESC_BIG : ESC_NORMAL);
    out.push(ESC_BOLD_ON);
    const qty = `${item.qty}x `;
    wrapIndent(stripAccents(item.name).toUpperCase(), bodyCols, qty, qty.length).forEach((l) =>
      out.push(l),
    );

    out.push(ESC_BOLD_OFF, ESC_NORMAL);
    for (const detail of receiptItemDetails(item, false)) {
      out.push(...wrapIndent(stripAccents(detail), cols, " - ", 3));
    }
    out.push(idx === order.items.length - 1 ? sep : sepThin);
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
  if (cashBlock || order.note || !order.items.length) out.push(sep);
  out.push(center(formatDateTime(order.createdAt), cols));
  out.push(sep);

  return compactPrintCommands(out.join("\n"));
}
