/** Regra: pedido com pagamento online só sai de "novo" depois que o Mercado Pago aprovar. */
export function isOnlinePaymentLabel(label?: string | null): boolean {
  if (!label) return false;
  const l = label.toLowerCase();
  return ["online", "mercado pago", "mercadopago", "pix_online", "credit_card"].some((k) => l.includes(k));
}

export function canAdvanceOrder(
  newStatus: string,
  paymentLabel: string | null | undefined,
  paymentStatus: string | null | undefined,
): boolean {
  if (newStatus === "cancelado" || newStatus === "novo") return true;
  if (!isOnlinePaymentLabel(paymentLabel)) return true;
  return paymentStatus === "approved";
}

export const PIX_WAITING_MESSAGE = "Aguardando confirmação do Pix pelo Mercado Pago.";
