// Resumo de entregas por entregador (Caixa) — texto para cupom térmico e WhatsApp.
import { stripAccents, money, lineOf, row, wrapIndent, center } from "@/lib/receipt-builder";
import type { CashDriverSummary } from "@/lib/cash.functions";
import { buildWhatsAppLink } from "@/lib/whatsapp-link";

export type SummaryShift = { opened_at: string; closed_at: string | null };

const dt = (s: string) =>
  new Date(s).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const R = (v: number) => `R$ ${money(v)}`;
const payOf = (x: CashDriverSummary["deliveries"][number]) => (x.is_cash ? "Dinheiro" : x.payment_label || "-");

export function buildDriverSummaryText(d: CashDriverSummary, shift: SummaryShift, storeName: string, cols: number): string {
  const L: string[] = [];
  L.push(center("RESUMO DE ENTREGAS", cols));
  if (storeName) L.push(...wrapIndent(storeName, cols));
  L.push(...wrapIndent(`Entregador: ${d.driver_name}`, cols));
  L.push(...wrapIndent(`Turno: ${dt(shift.opened_at)} -> ${shift.closed_at ? dt(shift.closed_at) : "em aberto"}`, cols));
  L.push(lineOf("-", cols));
  for (const x of d.deliveries) {
    L.push(row(`#${x.number} ${payOf(x)}`, R(x.fee), cols));
    if (x.neighborhood) L.push(...wrapIndent(x.neighborhood, cols, "  ", 2));
    if (x.is_cash) L.push(row("  Total / nota", `${R(x.total)} / ${R(x.paid_with ?? x.total)}`, cols));
  }
  L.push(lineOf("-", cols));
  L.push(`Entregas: ${d.deliveries.length} (${d.orders} em dinheiro)`);
  L.push(lineOf("=", cols));
  L.push("DINHEIRO A DEVOLVER AO CAIXA");
  L.push(row("Cobrado dos clientes", R(d.to_collect), cols));
  L.push(row("Troco levado", R(d.change_out), cols));
  L.push(row("Total a devolver", R(d.must_return), cols));
  L.push(...wrapIndent(`Situacao: ${d.orders === 0 ? "nada a devolver" : d.settled_at ? `devolvido em ${dt(d.settled_at)}` : "pendente"}`, cols));
  L.push(lineOf("=", cols));
  L.push("TAXAS DE ENTREGA (loja -> entregador)");
  L.push(row("Total", R(d.fees_total), cols));
  L.push(...wrapIndent(`Situacao: ${d.fees_paid_at ? `pagas via ${d.fees_paid_method === "cash" ? "dinheiro" : "Pix"} em ${dt(d.fees_paid_at)}` : "a pagar"}`, cols));
  L.push("");
  L.push(center(`Impresso ${dt(new Date().toISOString())}`, cols));
  return stripAccents(L.join("\n"));
}

export function buildDriverSummaryWhatsApp(d: CashDriverSummary, shift: SummaryShift, storeName: string): string {
  const L: string[] = [];
  L.push(`*Resumo de entregas*${storeName ? ` — ${storeName}` : ""}`);
  L.push(`Entregador: *${d.driver_name}*`);
  L.push(`Turno: ${dt(shift.opened_at)} → ${shift.closed_at ? dt(shift.closed_at) : "em aberto"}`);
  L.push("");
  for (const x of d.deliveries) {
    L.push(`• #${x.number}${x.neighborhood ? ` · ${x.neighborhood}` : ""} · ${payOf(x)} · taxa ${R(x.fee)}${x.is_cash ? ` (total ${R(x.total)}, nota ${R(x.paid_with ?? x.total)})` : ""}`);
  }
  L.push("");
  L.push(`Entregas: ${d.deliveries.length} (${d.orders} em dinheiro)`);
  L.push("");
  L.push("*Dinheiro a devolver ao caixa*");
  L.push(`Cobrado dos clientes: ${R(d.to_collect)}`);
  L.push(`Troco levado: ${R(d.change_out)}`);
  L.push(`*Total a devolver: ${R(d.must_return)}*`);
  L.push(`Situação: ${d.orders === 0 ? "nada a devolver" : d.settled_at ? `devolvido em ${dt(d.settled_at)}` : "pendente"}`);
  L.push("");
  L.push("*Taxas de entrega (loja → entregador)*");
  L.push(`*Total: ${R(d.fees_total)}*`);
  L.push(`Situação: ${d.fees_paid_at ? `pagas via ${d.fees_paid_method === "cash" ? "dinheiro" : "Pix"} em ${dt(d.fees_paid_at)}` : "a pagar"}`);
  return L.join("\n");
}

export function driverWhatsAppUrl(phone: string | null | undefined, text: string) {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (digits && digits.length <= 11) digits = `55${digits}`;
  return buildWhatsAppLink(digits, text);
}
