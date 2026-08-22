// ============================================================
// Menuzin — helpers compartilhados dos webhooks do Mercado Pago.
// SERVER ONLY.
// ============================================================
import { createHmac, timingSafeEqual } from "crypto";

/** URL pública usada para montar `notification_url` nos pagamentos. */
export function publicAppUrl(): string {
  return (process.env["PUBLIC_APP_URL"] || "https://menuzin.app").replace(/\/+$/, "");
}

export type SignatureResult =
  | { ok: true; reason: "valid" | "not_configured" }
  | { ok: false; reason: string };

/**
 * Valida o header `x-signature` do Mercado Pago.
 * Formato: `ts=1700000000,v1=<hex hmac>`
 * Manifesto: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 *
 * Enquanto `MP_WEBHOOK_SECRET` não estiver configurado, devolvemos
 * `not_configured` (fail-open com log) para não interromper cobranças
 * em produção — o processamento sempre reconsulta o pagamento na API do MP.
 */
export function verifyMpSignature(params: {
  request: Request;
  dataId: string | null;
  secret?: string | undefined;
}): SignatureResult {
  const secret = params.secret ?? process.env["MP_WEBHOOK_SECRET"];
  if (!secret) return { ok: true, reason: "not_configured" };

  const header = params.request.headers.get("x-signature");
  if (!header) return { ok: false, reason: "x-signature ausente" };

  let ts = "";
  let v1 = "";
  for (const part of header.split(",")) {
    const [rawK, ...rest] = part.split("=");
    const k = rawK?.trim();
    const v = rest.join("=").trim();
    if (k === "ts") ts = v;
    else if (k === "v1") v1 = v;
  }
  if (!ts || !v1) return { ok: false, reason: "x-signature malformado" };

  // Rejeita notificações muito antigas (replay) — 10 minutos de tolerância.
  const tsMs = Number(ts) * (ts.length > 12 ? 1 : 1000);
  if (Number.isFinite(tsMs) && Math.abs(Date.now() - tsMs) > 10 * 60 * 1000) {
    return { ok: false, reason: "timestamp fora da janela" };
  }

  const requestId = params.request.headers.get("x-request-id") ?? "";
  const id = (params.dataId ?? "").toLowerCase();
  const manifest = `id:${id};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  const a = Buffer.from(v1, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "assinatura inválida" };
  }
  return { ok: true, reason: "valid" };
}

/** Extrai o id do pagamento do corpo e/ou da query string da notificação. */
export function extractPaymentId(body: Record<string, unknown>, url: URL): string | null {
  const data = body["data"] as { id?: string | number } | undefined;
  if (data?.id) return String(data.id);
  const fromQuery = url.searchParams.get("data.id") || url.searchParams.get("id");
  return fromQuery ? String(fromQuery) : null;
}

export function mapMpStatus(
  s: string | undefined,
): "pending" | "approved" | "rejected" | "cancelled" | "refunded" {
  switch (s) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    case "refunded":
    case "charged_back":
      return "refunded";
    default:
      return "pending";
  }
}
