// Builder único do cupom térmico (texto monoespaçado, mesma lógica para
// preview e impressão real ESC/POS). Toda formatação visual passa por aqui.

import { formatDateTime } from "@/lib/format";
import type { Order } from "@/lib/domain-types";
import { parseAddonLabel } from "@/lib/product-selection";
import type { PrinterSettings } from "@/lib/printer-types";
import { columnsFor } from "@/lib/printer-types";

export const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const money = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const lineOf = (ch: string, cols: number) => ch.repeat(cols);

export function center(text: string, cols: number) {
  const t = text.length > cols ? text.slice(0, cols) : text;
  const pad = Math.max(0, Math.floor((cols - t.length) / 2));
  return " ".repeat(pad) + t;
}

export function wrap(text: string, cols: number): string[] {
  if (cols <= 0) return [text];
  const words = text.split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!w) continue;
    if (w.length > cols) {
      if (cur) { out.push(cur); cur = ""; }
      for (let i = 0; i < w.length; i += cols) out.push(w.slice(i, i + cols));
      continue;
    }
    if (!cur) { cur = w; continue; }
    if (cur.length + 1 + w.length <= cols) cur += " " + w;
    else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  return out.length ? out : [""];
}

export function row(label: string, value: string, cols: number): string {
  const l = label ?? "";
  const v = value ?? "";
  if (l.length + v.length + 1 > cols) {
    const labelLines = wrap(l, cols);
    const last = labelLines.pop()!;
    const remaining = cols - last.length - v.length;
    if (remaining >= 1) {
      labelLines.push(last + " ".repeat(remaining) + v);
    } else {
      labelLines.push(last);
      labelLines.push(" ".repeat(Math.max(0, cols - v.length)) + v);
    }
    return labelLines.join("\n");
  }
  const gap = cols - l.length - v.length;
  return l + " ".repeat(gap) + v;
}

export function itemBlock(name: string, qty: number, unit: number, total: number, cols: number) {
  const lines = wrap(stripAccents(name), cols);
  const right = `${qty}UN x ${money(unit)}  ${money(total)}`;
  const padded =
    right.length >= cols ? right : " ".repeat(cols - right.length) + right;
  return [...lines, padded].join("\n");
}

export function addonLine(qty: number, name: string, price: number | undefined, cols: number) {
  const indent = "  ";
  const labelRaw = `+ ${qty}x ${stripAccents(name)}`;
  const value = price && price > 0 ? money(price) : "";
  const inner = cols - indent.length;
  if (!value) {
    return wrap(labelRaw, inner).map((l) => indent + l).join("\n");
  }
  const lines = wrap(labelRaw, inner - value.length - 1);
  const last = lines.pop()!;
  const gap = inner - last.length - value.length;
  lines.push(last + " ".repeat(Math.max(1, gap)) + value);
  return lines.map((l) => indent + l).join("\n");
}

export type ReceiptStoreInfo = {
  storeName?: string;
  storePhone?: string;
  storeAddress?: string;
  storeCnpj?: string;
  storeInstagram?: string;
  storePixKey?: string;
};

/**
 * Builder único do cupom — usado tanto pelo componente <PrintableOrder/>
 * quanto pela prévia em texto puro. Toda formatação (cabeçalho, itens,
 * totais, pagamento, rodapé) é gerada aqui.
 */
export function buildReceipt(
  order: Order,
  cols: number,
  s: PrinterSettings,
  opts: ReceiptStoreInfo,
): string {
  const out: string[] = [];
  const sepChar = s.separator_char || "-";
  const sep = lineOf(sepChar, cols);
  const sepDouble = lineOf("=", cols);

  /* 1. Cabeçalho da loja */
  if (s.show_store_name && opts.storeName) {
    out.push(center(stripAccents(opts.storeName.toUpperCase()), cols));
  }
  if (s.show_address && opts.storeAddress) {
    wrap(stripAccents(opts.storeAddress), cols).forEach((l) => out.push(center(l, cols)));
  }
  if (s.show_document && opts.storeCnpj) out.push(center(`CNPJ: ${opts.storeCnpj}`, cols));
  if (s.show_whatsapp && opts.storePhone) out.push(center(`WhatsApp: ${opts.storePhone}`, cols));
  if (s.show_store_name || s.show_address || s.show_document || s.show_whatsapp) {
    out.push(sep);
  }

  /* 2. Aviso fiscal */
  out.push("");
  out.push(center("NAO E DOCUMENTO FISCAL", cols));
  wrap("AGUARDE A EMISSAO DO DOCUMENTO FISCAL", cols).forEach((l) =>
    out.push(center(l, cols)),
  );
  out.push(sepDouble);

  /* 3. Identificação do pedido */
  const shortId = order.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  const idFmt = `${shortId.slice(0, 4)}.${shortId.slice(4, 8)}`;
  out.push("");
  out.push(center(`CONFERENCIA - VENDA ${idFmt}`, cols));
  out.push(sep);

  /* 4. Cliente */
  out.push("");
  out.push(`Cliente: ${stripAccents(order.customerName) || "Consumidor"}`);
  if (order.whatsapp) out.push(`Fone: ${order.whatsapp}`);
  out.push(sep);

  /* 5. Tabela */
  out.push("");
  out.push("Descricao");
  out.push("Qtd Un  Vl Unit   Vl Tot");
  out.push(sepDouble);

  /* 6. Itens */
  for (const it of order.items) {
    out.push(itemBlock(it.name, it.qty, it.unitPrice, it.unitPrice * it.qty, cols));
    if (it.addons?.length) {
      for (const a of it.addons) {
        const parsed = parseAddonLabel(a.name);
        const label =
          parsed.kind === "size" ? `Tamanho: ${parsed.label}` :
          parsed.kind === "flavor" ? `Sabor: ${parsed.label}` :
          parsed.kind === "group" ? `${parsed.groupName}: ${parsed.label}` :
          parsed.label;
        out.push(addonLine(1, label, Number(a.price) || 0, cols));
      }
    }
    if (it.note) {
      wrap(`* ${stripAccents(it.note)}`, cols - 2).forEach((l) => out.push("  " + l));
    }
    out.push("");
  }

  /* 7. Total */
  out.push(sep);
  if (order.deliveryFee > 0) {
    out.push(row("Subtotal", money(order.subtotal), cols));
    out.push(row("Taxa de entrega", money(order.deliveryFee), cols));
  }
  out.push(row("TOTAL", money(order.total), cols));
  out.push("");

  /* 8. Pagamento */
  out.push(row("Forma de Pagamento", "Valor Pago", cols));
  out.push(row(stripAccents(order.payment || "-"), money(order.total), cols));
  if (order.changeFor && order.changeFor > 0) {
    out.push(row("Troco para", money(order.changeFor), cols));
  }
  out.push(sep);

  /* 9. Info adicionais */
  out.push("");
  out.push(`Catalogo Online - Pedido ${String(order.number).padStart(6, "0")}`);
  if (order.mode === "retirada") {
    out.push("Retirada no local");
    if (order.pickupTime) out.push(`Horario: ${order.pickupTime}`);
  } else if (order.mode === "consumo_local") {
    if (order.table) out.push(`Mesa: ${order.table}`);
  } else if (order.mode === "entrega" && order.address) {
    out.push("Entrega:");
    const a = order.address;
    const linhaEnd = [
      [a.street, a.number].filter(Boolean).join(", "),
      a.complement,
    ].filter(Boolean).join(" - ");
    if (linhaEnd) wrap(stripAccents(linhaEnd), cols).forEach((l) => out.push("  " + l));
    if (a.neighborhood) wrap(stripAccents(a.neighborhood), cols - 2).forEach((l) => out.push("  " + l));
    if (a.reference) wrap(`Ref: ${stripAccents(a.reference)}`, cols - 2).forEach((l) => out.push("  " + l));
  }
  if (order.paymentStatus === "approved") out.push("Cobranca antecipada");
  else if (order.paymentStatus === "manual") out.push("Pagamento na entrega");
  else if (order.paymentStatus === "pending") out.push("Aguardando pagamento");

  if (order.note) {
    out.push("");
    out.push("Observacao:");
    wrap(stripAccents(order.note), cols).forEach((l) => out.push(l));
  }

  /* 10. Rodapé */
  out.push(sepDouble);
  out.push(center("NAO E DOCUMENTO FISCAL", cols));
  out.push(`Data/Hora: ${formatDateTime(order.createdAt)}`);
  out.push("");
  if (s.show_thank_message && s.thank_message) {
    out.push(center(stripAccents(s.thank_message), cols));
  }
  if (s.show_instagram && opts.storeInstagram) {
    out.push(center(`Instagram: @${opts.storeInstagram.replace(/^@/, "")}`, cols));
  }
  if (s.show_pix && opts.storePixKey) {
    wrap(`PIX: ${opts.storePixKey}`, cols).forEach((l) => out.push(center(l, cols)));
  }
  for (let i = 0; i < Math.max(0, s.feed_lines); i++) out.push("");

  return out.join("\n");
}

/** Pedido fictício usado pela prévia para demonstrar a formatação real. */
export function sampleOrderForPreview(): Order {
  const now = new Date().toISOString();
  return {
    id: "a1b2c3d4-0000-0000-0000-000000000000",
    number: 1234,
    storeId: "preview",
    customerName: "Consumidor",
    whatsapp: "(86) 99999-9999",
    mode: "consumo_local",
    status: "novo",
    paymentStatus: "manual",
    payment: "Pix",
    table: "15",
    items: [
      { productId: "p1", name: "Gado", qty: 2, unitPrice: 9, addons: [] },
      { productId: "p2", name: "Coca 350ml Lata", qty: 2, unitPrice: 6, addons: [] },
      { productId: "p3", name: "Taxa de Servico", qty: 1, unitPrice: 3, addons: [] },
    ],
    subtotal: 33,
    deliveryFee: 0,
    total: 33,
    createdAt: now,
    statusHistory: [],
  };
}

/**
 * Reaproveita 100% o builder do cupom real, apenas alimentando-o com um
 * pedido de exemplo e a largura derivada das configurações. Saída é uma
 * string que bate byte a byte com o que a impressora receberá.
 */
export function buildReceiptPreviewText(
  settings: PrinterSettings,
  opts: ReceiptStoreInfo = {},
): string {
  const cols = columnsFor(settings.paper_width);
  return buildReceipt(sampleOrderForPreview(), cols, settings, opts);
}
