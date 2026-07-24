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
    .select("id, tenant_id, subscription_id, billing_period, payment_status, plan_id, amount")
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
    .select("id, due_date, billing_period, status, plan_id")
    .eq("id", pay.subscription_id)
    .maybeSingle();

  if (sub) {
    const base = sub.due_date ? new Date(`${sub.due_date}T00:00:00Z`) : new Date();
    const now = new Date();
    const start = base.getTime() > now.getTime() ? base : now;
    const newDue = nextDueDate(start, (pay.billing_period as never) ?? sub.billing_period);

    // Se o pagamento foi de um plano diferente, promove a assinatura para esse plano
    // (upgrade/downgrade imediato via API MP ou pagamento manual).
    const payPlanId = (pay as { plan_id?: string | null }).plan_id ?? null;
    const subPlanId = (sub as { plan_id?: string | null }).plan_id ?? null;
    const planChanged = !!payPlanId && payPlanId !== subPlanId;

    await supabaseAdmin
      .from("tenant_subscriptions")
      .update({
        status: "ativa",
        due_date: newDue.toISOString().slice(0, 10),
        blocked_at: null,
        unblocked_at: sub.status === "bloqueada" ? new Date().toISOString() : undefined,
        ...(planChanged
          ? {
              plan_id: payPlanId!,
              amount: Number((pay as { amount?: number }).amount ?? 0) || undefined,
            }
          : {}),
      })
      .eq("id", sub.id);

    if (planChanged) {
      const { syncTenantPlanFromSubscription } = await import("@/lib/plan-server");
      const newSlug = await syncTenantPlanFromSubscription(pay.tenant_id, payPlanId!);
      await supabaseAdmin.from("subscription_events").insert({
        tenant_id: pay.tenant_id,
        subscription_id: pay.subscription_id,
        event_type: "plan_changed",
        description: `Plano atualizado via pagamento (${opts.source}) → ${newSlug}`,
        metadata: { from_plan_id: subPlanId, to_plan_id: payPlanId, to_slug: newSlug, payment_id: pay.id },
        created_by: opts.actorUserId ?? null,
      });
    }
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
