// Builder de comanda simplificada para impressora da cozinha.
// Omite valores financeiros, dados da loja e métodos de pagamento.
// Foco: informação operacional para preparo.

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

export function buildKitchenTicket(order: Order, cols: number): string {
  const sep = lineOf("=", cols);
  const sepThin = lineOf("-", cols);
  const out: string[] = [];

  out.push(sep);
  out.push(center(`COZINHA - PEDIDO #${order.number}`, cols));
  out.push(sep);

  const mode = stripAccents(modeLabel[order.mode] ?? order.mode).toUpperCase();
  out.push(center(mode, cols));

  if (order.mode === "consumo_local" && order.table) {
    out.push(center(`MESA/LOCAL: ${stripAccents(order.table)}`, cols));
  } else if (order.customerName) {
    out.push(center(`Cliente: ${stripAccents(order.customerName)}`, cols));
  }

  out.push(center(formatDateTime(order.createdAt), cols));
  out.push(sepThin);

  for (const item of order.items) {
    const head = `${item.qty}x ${stripAccents(item.name).toUpperCase()}`;
    wrap(head, cols).forEach((l) => out.push(l));

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

    if (sizes.length) wrap(`  Tamanho: ${sizes.join(", ")}`, cols).forEach((l) => out.push(l));
    if (flavors.length) wrap(`  Sabores: ${flavors.join(" + ")}`, cols).forEach((l) => out.push(l));
    for (const [g, opts] of Object.entries(groups)) {
      wrap(`  ${g}: ${opts.join(", ")}`, cols).forEach((l) => out.push(l));
    }
    if (extras.length) wrap(`  + ${extras.join(", ")}`, cols).forEach((l) => out.push(l));
    if (item.note) wrap(`  >> Obs: ${stripAccents(item.note)}`, cols).forEach((l) => out.push(l));

    out.push("");
  }

  if (order.note) {
    out.push(sepThin);
    out.push("NOTA GERAL:");
    wrap(stripAccents(order.note), cols).forEach((l) => out.push(l));
  }

  out.push(sep);
  return out.join("\n");
}

export function kitchenColumnsFor(paper: PaperWidth) {
  return columnsFor(paper);
}
