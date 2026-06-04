import { brl, modeLabel } from "./format";
import type { CartItem } from "./cart-context";

type Input = {
  number: number;
  customerName: string;
  whatsapp: string;
  mode: "entrega" | "retirada" | "consumo_local";
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  payment: string;
  changeFor?: number;
  address?: {
    street?: string; number?: string; neighborhood?: string;
    complement?: string; reference?: string; cep?: string;
  };
  table?: string;
  note?: string;
};

export function buildWhatsAppMessage(i: Input) {
  const lines: string[] = [];
  lines.push("Olá! Gostaria de fazer o seguinte pedido:");
  lines.push("");
  lines.push(`*Pedido nº ${i.number}*`);
  lines.push(`Cliente: ${i.customerName}`);
  lines.push(`WhatsApp: ${i.whatsapp}`);
  lines.push(`Modalidade: ${modeLabel[i.mode]}`);
  lines.push("");
  lines.push("*Itens:*");
  i.items.forEach((it) => {
    lines.push(`• ${it.qty}x ${it.product.name}`);
    if (it.addons.length)
      lines.push(`   Adicionais: ${it.addons.map((a) => a.name).join(", ")}`);
    if (it.note) lines.push(`   Obs: ${it.note}`);
  });
  if (i.mode === "entrega" && i.address) {
    lines.push("");
    lines.push("*Endereço:*");
    lines.push(`${i.address.street ?? ""}, ${i.address.number ?? ""}`);
    if (i.address.neighborhood) lines.push(`Bairro: ${i.address.neighborhood}`);
    if (i.address.complement) lines.push(`Compl.: ${i.address.complement}`);
    if (i.address.reference) lines.push(`Ref.: ${i.address.reference}`);
    if (i.address.cep) lines.push(`CEP: ${i.address.cep}`);
  }
  if (i.mode === "consumo_local" && i.table)
    lines.push(`Mesa/Comanda: ${i.table}`);
  lines.push("");
  lines.push(`Pagamento: ${i.payment}`);
  if (i.changeFor) lines.push(`Troco para: ${brl(i.changeFor)}`);
  lines.push("");
  lines.push(`Subtotal: ${brl(i.subtotal)}`);
  if (i.deliveryFee > 0) lines.push(`Taxa de entrega: ${brl(i.deliveryFee)}`);
  lines.push(`*Total: ${brl(i.total)}*`);
  if (i.note) {
    lines.push("");
    lines.push(`Observação: ${i.note}`);
  }
  lines.push("");
  lines.push("Aguardo confirmação. Obrigado!");
  return lines.join("\n");
}

export const whatsappLink = (phone: string, message: string) =>
  `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
