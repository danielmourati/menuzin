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
  const narrow = cols <= 32;
  const sepStrong = narrow ? sep : lineOf("=", cols);
  const addonIndent = narrow ? " " : "  ";

  /* 1. Cabeçalho da loja */
  if (s.show_store_name && opts.storeName) {
    out.push(center(stripAccents(opts.storeName.toUpperCase()), cols));
  }
  if (s.show_address && opts.storeAddress) {
    wrap(stripAccents(opts.storeAddress), cols).forEach((l) => out.push(center(l, cols)));
  }
  // CNPJ + Telefone na mesma linha quando couber
  const docPart = s.show_document && opts.storeCnpj ? `CNPJ ${opts.storeCnpj}` : "";
  const telPart = s.show_whatsapp && opts.storePhone ? `Tel ${opts.storePhone}` : "";
  if (docPart && telPart) {
    const joined = `${docPart}  ${telPart}`;
    if (joined.length <= cols) out.push(center(joined, cols));
    else { out.push(center(docPart, cols)); out.push(center(telPart, cols)); }
  } else if (docPart) out.push(center(docPart, cols));
  else if (telPart) out.push(center(telPart, cols));
  if (s.show_store_name || s.show_address || s.show_document || s.show_whatsapp) {
    out.push(sep);
  }

  /* 2. Aviso fiscal — uma única linha condensada */
  out.push(center("*** NAO E DOCUMENTO FISCAL ***", cols));
  out.push(sepStrong);

  /* 3. Identificação do pedido + número (mesma linha) */
  const shortId = order.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  const idFmt = `${shortId.slice(0, 4)}.${shortId.slice(4, 8)}`;
  const numFmt = String(order.number).padStart(4, "0");
  out.push(center(`PEDIDO #${numFmt} - ${idFmt}`, cols));
  out.push(sep);

  /* 4. Cliente — nome + telefone juntos quando couber */
  const cliName = stripAccents(order.customerName) || "Consumidor";
  const cliLine = `Cliente: ${cliName}`;
  if (order.whatsapp && cliLine.length + 2 + order.whatsapp.length <= cols) {
    out.push(`${cliLine}  ${order.whatsapp}`);
  } else {
    out.push(cliLine);
    if (order.whatsapp) out.push(`Fone: ${order.whatsapp}`);
  }
  out.push(sep);

  /* 5. Tabela */
  out.push(narrow ? "Qtd  Vl Unit    Vl Tot" : "Qtd Un  Vl Unit   Vl Tot");
  out.push(sep);

  /* 6. Itens (sem linha em branco entre itens) */
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
        const indentSaved = addonIndent;
        const addon = addonLine(1, label, Number(a.price) || 0, cols);
        out.push(narrow ? addon.replace(/^  /gm, indentSaved) : addon);
      }
    }
    if (it.note) {
      wrap(`* ${stripAccents(it.note)}`, cols - addonIndent.length).forEach((l) => out.push(addonIndent + l));
    }
  }

  /* 7. Total */
  out.push(sep);
  if (order.deliveryFee > 0) {
    out.push(row("Subtotal", money(order.subtotal), cols));
    out.push(row("Taxa entrega", money(order.deliveryFee), cols));
  }
  out.push(row("TOTAL", money(order.total), cols));

  /* 8. Pagamento — linha única quando couber */
  const payLabel = stripAccents(order.payment || "-");
  out.push(row(`Pgto: ${payLabel}`, money(order.total), cols));
  if (order.changeFor && order.changeFor > 0) {
    out.push(row("Troco para", money(order.changeFor), cols));
  }
  out.push(sep);

  /* 9. Info adicionais */
  if (order.mode === "retirada") {
    const pick = order.pickupTime ? `Retirada: ${order.pickupTime}` : "Retirada no local";
    out.push(pick);
  } else if (order.mode === "consumo_local") {
    if (order.table) out.push(`Mesa: ${order.table}`);
  } else if (order.mode === "entrega" && order.address) {
    out.push("Entrega:");
    const a = order.address;
    const linhaEnd = [
      [a.street, a.number].filter(Boolean).join(", "),
      a.complement,
    ].filter(Boolean).join(" - ");
    if (linhaEnd) wrap(stripAccents(linhaEnd), cols - addonIndent.length).forEach((l) => out.push(addonIndent + l));
    if (a.neighborhood) wrap(stripAccents(a.neighborhood), cols - addonIndent.length).forEach((l) => out.push(addonIndent + l));
    if (a.reference) wrap(`Ref: ${stripAccents(a.reference)}`, cols - addonIndent.length).forEach((l) => out.push(addonIndent + l));
  }
  if (order.paymentStatus === "approved") out.push("Cobranca antecipada");
  else if (order.paymentStatus === "manual") out.push("Pagamento na entrega");
  else if (order.paymentStatus === "pending") out.push("Aguardando pagamento");

  if (order.note) {
    out.push("Obs: " + stripAccents(order.note).slice(0, 200));
  }

  /* 10. Rodapé */
  out.push(sep);
  out.push(`Data/Hora: ${formatDateTime(order.createdAt)}`);
  if (s.show_thank_message && s.thank_message) {
    out.push(center(stripAccents(s.thank_message), cols));
  }
  if (s.show_instagram && opts.storeInstagram) {
    out.push(center(`Instagram: @${opts.storeInstagram.replace(/^@/, "")}`, cols));
  }
  if (s.show_pix && opts.storePixKey) {
    wrap(`PIX: ${opts.storePixKey}`, cols).forEach((l) => out.push(center(l, cols)));
  }
  const feed = Math.min(4, Math.max(1, s.feed_lines));
  for (let i = 0; i < feed; i++) out.push("");

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
