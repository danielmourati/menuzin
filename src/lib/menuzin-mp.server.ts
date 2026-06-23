// Mercado Pago da plataforma (Menuzin) — usado para cobrar mensalidades dos tenants.
// NÃO confundir com store_payment_settings (MP por tenant para pedidos online).

const MP_API = "https://api.mercadopago.com";

export interface CreatePixChargeParams {
  amount: number;
  description: string;
  externalReference: string;
  notificationUrl: string;
  payer: { email: string; first_name?: string; last_name?: string };
  /** Expira em X minutos (default 30) */
  expiresInMinutes?: number;
}

export interface PixChargeResult {
  id: string;
  status: string;
  qr_code: string;
  qr_code_base64: string;
  ticket_url: string;
  raw: unknown;
}

function token() {
  const t = process.env.MENUZIN_MP_ACCESS_TOKEN;
  if (!t) throw new Error("MENUZIN_MP_ACCESS_TOKEN não configurado");
  return t;
}

export async function createPixCharge(params: CreatePixChargeParams): Promise<PixChargeResult> {
  const expires = new Date(Date.now() + (params.expiresInMinutes ?? 30) * 60 * 1000);
  const body = {
    transaction_amount: Number(params.amount.toFixed(2)),
    description: params.description,
    payment_method_id: "pix",
    external_reference: params.externalReference,
    notification_url: params.notificationUrl,
    date_of_expiration: expires.toISOString().replace("Z", "-00:00"),
    payer: {
      email: params.payer.email,
      first_name: params.payer.first_name ?? "Cliente",
      last_name: params.payer.last_name ?? "Menuzin",
    },
  };

  const res = await fetch(`${MP_API}/v1/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
      "X-Idempotency-Key": params.externalReference,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      `Mercado Pago: ${res.status} ${typeof json?.message === "string" ? json.message : "falha ao gerar PIX"}`,
    );
  }
  const poi = (json.point_of_interaction as { transaction_data?: Record<string, string> } | undefined)?.transaction_data;
  return {
    id: String(json.id),
    status: String(json.status ?? "pending"),
    qr_code: poi?.qr_code ?? "",
    qr_code_base64: poi?.qr_code_base64 ?? "",
    ticket_url: poi?.ticket_url ?? "",
    raw: json,
  };
}

export async function fetchPayment(paymentId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) throw new Error(`Mercado Pago: ${res.status} ao consultar pagamento`);
  return (await res.json()) as Record<string, unknown>;
}

export function mapMpStatus(status: string): "pending" | "approved" | "rejected" | "cancelled" | "refunded" | "expired" {
  switch (status) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    case "refunded":
    case "charged_back":
      return "refunded";
    case "in_process":
    case "in_mediation":
    case "pending":
    case "authorized":
      return "pending";
    default:
      return "pending";
  }
}
