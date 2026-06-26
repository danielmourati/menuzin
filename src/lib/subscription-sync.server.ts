// Server-only: consulta o Mercado Pago da plataforma e reconcilia
// subscription_payments + tenant_subscriptions. Usado como fallback do webhook.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchPayment, mapMpStatus } from "@/lib/menuzin-mp.server";
import { approveAndRenew } from "@/lib/subscription-renewal.server";

export type SyncResult = {
  payment_id: string;
  previous_status: string;
  new_status: string;
  mp_status: string;
  approved: boolean;
  renewed: boolean;
  message: string;
};

/**
 * Reconcilia 1 pagamento com o Mercado Pago.
 * Idempotente: se já estiver `approved`/`manual`, não duplica renovação.
 */
export async function syncPaymentFromMP(opts: {
  paymentId: string;
  actorUserId?: string | null;
  source?: "manual" | "auto";
}): Promise<SyncResult> {
  const { data: pay } = await supabaseAdmin
    .from("subscription_payments")
    .select("id, tenant_id, subscription_id, mercado_pago_payment_id, payment_status")
    .eq("id", opts.paymentId)
    .maybeSingle();
  if (!pay) throw new Error("Cobrança não encontrada");

  const p = pay as {
    id: string;
    tenant_id: string;
    subscription_id: string;
    mercado_pago_payment_id: string | null;
    payment_status: string;
  };

  if (p.payment_status === "approved" || p.payment_status === "manual") {
    return {
      payment_id: p.id,
      previous_status: p.payment_status,
      new_status: p.payment_status,
      mp_status: "already_processed",
      approved: true,
      renewed: false,
      message: "Pagamento já estava aprovado.",
    };
  }

  if (!p.mercado_pago_payment_id) {
    return {
      payment_id: p.id,
      previous_status: p.payment_status,
      new_status: p.payment_status,
      mp_status: "no_mp_id",
      approved: false,
      renewed: false,
      message: "Cobrança sem ID do Mercado Pago para consultar.",
    };
  }

  let mp: Record<string, unknown>;
  try {
    mp = await fetchPayment(p.mercado_pago_payment_id);
  } catch (err) {
    console.error("[sync-payment] fetchPayment falhou", p.mercado_pago_payment_id, err);
    throw new Error("Falha ao consultar Mercado Pago");
  }

  const mpStatus = String(mp.status ?? "pending");
  const mapped = mapMpStatus(mpStatus);

  if (mapped === "approved") {
    await approveAndRenew({
      paymentId: p.id,
      mpPaymentId: p.mercado_pago_payment_id,
      paidAt: (mp.date_approved as string) ?? new Date().toISOString(),
      rawResponse: mp,
      source: "webhook", // mantém payment_status = "approved" (não "manual")
      actorUserId: opts.actorUserId ?? null,
    });
    await supabaseAdmin.from("subscription_events").insert({
      tenant_id: p.tenant_id,
      subscription_id: p.subscription_id,
      event_type: "payment_synced",
      description:
        opts.source === "manual"
          ? "Pagamento sincronizado manualmente pelo super-admin"
          : "Pagamento sincronizado automaticamente (fallback)",
      metadata: { payment_id: p.id, mp_id: p.mercado_pago_payment_id, mp_status: mpStatus },
      created_by: opts.actorUserId ?? null,
    });
    return {
      payment_id: p.id,
      previous_status: p.payment_status,
      new_status: "approved",
      mp_status: mpStatus,
      approved: true,
      renewed: true,
      message: "Pagamento aprovado e assinatura renovada.",
    };
  }

  // Não aprovado: apenas atualiza status interno e raw.
  await supabaseAdmin
    .from("subscription_payments")
    .update({ payment_status: mapped, raw_response: mp as never })
    .eq("id", p.id);

  return {
    payment_id: p.id,
    previous_status: p.payment_status,
    new_status: mapped,
    mp_status: mpStatus,
    approved: false,
    renewed: false,
    message: `Mercado Pago retornou status: ${mpStatus}`,
  };
}
