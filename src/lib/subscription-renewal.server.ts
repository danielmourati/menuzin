// Lógica server-only de aprovar pagamento e renovar assinatura.
// Reutilizado pelo webhook e por registerManualPayment.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { nextDueDate } from "@/lib/subscription-status";

export async function approveAndRenew(opts: {
  paymentId: string;
  mpPaymentId?: string | null;
  paidAt?: string;
  rawResponse?: unknown;
  source: "webhook" | "manual";
  actorUserId?: string | null;
}): Promise<void> {
  const { data: pay } = await supabaseAdmin
    .from("subscription_payments")
    .select("id, tenant_id, subscription_id, billing_period, payment_status")
    .eq("id", opts.paymentId)
    .maybeSingle();
  if (!pay) return;

  if (pay.payment_status === "approved") return; // idempotente

  const paidAt = opts.paidAt ?? new Date().toISOString();
  await supabaseAdmin
    .from("subscription_payments")
    .update({
      payment_status: opts.source === "manual" ? "manual" : "approved",
      paid_at: paidAt,
      mercado_pago_payment_id: opts.mpPaymentId ?? undefined,
      raw_response: opts.rawResponse as never,
    })
    .eq("id", pay.id);

  const { data: sub } = await supabaseAdmin
    .from("tenant_subscriptions")
    .select("id, due_date, billing_period, status")
    .eq("id", pay.subscription_id)
    .maybeSingle();

  if (sub) {
    const base = sub.due_date ? new Date(`${sub.due_date}T00:00:00Z`) : new Date();
    const now = new Date();
    const start = base.getTime() > now.getTime() ? base : now;
    const newDue = nextDueDate(start, (pay.billing_period as never) ?? sub.billing_period);
    await supabaseAdmin
      .from("tenant_subscriptions")
      .update({
        status: "ativa",
        due_date: newDue.toISOString().slice(0, 10),
        blocked_at: null,
        unblocked_at: sub.status === "bloqueada" ? new Date().toISOString() : undefined,
      })
      .eq("id", sub.id);
  }

  await supabaseAdmin.from("subscription_events").insert({
    tenant_id: pay.tenant_id,
    subscription_id: pay.subscription_id,
    event_type: opts.source === "manual" ? "payment_manual" : "payment_approved",
    description:
      opts.source === "manual"
        ? "Pagamento manual registrado pelo super-admin"
        : "Pagamento confirmado via Mercado Pago",
    metadata: { payment_id: pay.id, mp_id: opts.mpPaymentId ?? null },
    created_by: opts.actorUserId ?? null,
  });
}
