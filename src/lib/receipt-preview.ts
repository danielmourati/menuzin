import type { PrinterSettings } from "@/lib/printer-types";
import { columnsFor } from "@/lib/printer-types";

const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const lineOf = (ch: string, cols: number) => (ch || "-").repeat(cols);

export function center(text: string, cols: number) {
  const t = stripAccents(text);
  const s = t.length > cols ? t.slice(0, cols) : t;
  const pad = Math.max(0, Math.floor((cols - s.length) / 2));
  return " ".repeat(pad) + s;
}

export function row(label: string, value: string, cols: number) {
  const l = stripAccents(label);
  const v = stripAccents(value);
  if (l.length + v.length + 1 > cols) {
    return l + "\n" + " ".repeat(Math.max(0, cols - v.length)) + v;
  }
  return l + " ".repeat(cols - l.length - v.length) + v;
}

const money = (v: number) =>
  "R$" + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type PreviewContext = {
  storeName?: string;
  storeAddress?: string;
  storeWhatsapp?: string;
  storeInstagram?: string;
  storePixKey?: string;
  storeCnpj?: string;
};

/**
 * Gera o texto puro do cupom para prévia em fonte monoespaçada.
 * Reflete largura (58mm = 32 cols, 80mm = 48 cols) e toggles de layout.
 */
export function buildReceiptPreviewText(
  settings: PrinterSettings,
  ctx: PreviewContext = {},
): string {
  const cols = columnsFor(settings.paper_width);
  const sep = lineOf(settings.separator_char || "-", cols);
  const out: string[] = [];

  if (settings.show_store_name) {
    out.push(center((ctx.storeName || "NOME DA LOJA").toUpperCase(), cols));
  }
  if (settings.show_address && ctx.storeAddress) {
    out.push(center(ctx.storeAddress, cols));
  }
  if (settings.show_document && ctx.storeCnpj) {
    out.push(center(`CNPJ: ${ctx.storeCnpj}`, cols));
  }
  if (settings.show_whatsapp && ctx.storeWhatsapp) {
    out.push(center(`WhatsApp: ${ctx.storeWhatsapp}`, cols));
  }
  out.push(sep);

  out.push(center("CONTA", cols));
  out.push(sep);

  const now = new Date();
  const dt =
    now.toLocaleDateString("pt-BR") +
    " " +
    now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  out.push(row("Tipo:", "Mesa", cols));
  out.push(row("Mesa:", "15", cols));
  out.push(row("Cliente:", "Consumidor", cols));
  out.push(row("Data:", dt, cols));
  out.push(sep);

  out.push(row("2x Gado", money(18), cols));
  out.push(row("2x Coca 350ml Lata", money(12), cols));
  out.push(sep);

  out.push(row("Taxa de Servico:", money(3), cols));
  out.push(sep);
  out.push(row("TOTAL", money(33), cols));
  out.push(sep);

  if (settings.show_pix && ctx.storePixKey) {
    out.push(center(`PIX: ${ctx.storePixKey}`, cols));
  }
  if (settings.show_instagram && ctx.storeInstagram) {
    out.push(center(`Instagram: @${ctx.storeInstagram.replace(/^@/, "")}`, cols));
  }
  if (settings.show_thank_message && settings.thank_message) {
    out.push(center(settings.thank_message, cols));
  }
  for (let i = 0; i < Math.max(0, settings.feed_lines); i++) out.push("");

  return out.join("\n");
}
