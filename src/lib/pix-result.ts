export function pixFailureMessage(
  status: string | null | undefined,
  detail: string | null | undefined,
  qrCode: string | null | undefined,
): string | null {
  const s = (status ?? "").toLowerCase();
  if (s === "rejected" || s === "cancelled") {
    if (detail === "rejected_high_risk" || detail === "cc_rejected_high_risk") {
      return "O Mercado Pago recusou este Pix por segurança. Tente novamente ou escolha outra forma de pagamento.";
    }
    return "O Mercado Pago recusou este Pix. Tente novamente ou escolha outra forma de pagamento.";
  }
  if (!qrCode) return "Não foi possível gerar o QR Code do Pix. Tente novamente ou escolha outra forma de pagamento.";
  return null;
}
