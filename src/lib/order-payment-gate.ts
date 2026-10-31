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

/** Valida CPF pelos dígitos verificadores. */
export function isValidCpf(input: string): boolean {
  const d = (input || "").replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (len: number) => {
    let s = 0;
    for (let i = 0; i < len; i++) s += Number(d[i]) * (len + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}
