// Webhook do Mercado Pago da plataforma (Menuzin) para confirmar mensalidades.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/menuzin-mp-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          /* ignore */
        }

        // Mercado Pago envia: { action, type, data: { id } }
        const data = body.data as { id?: string | number } | undefined;
        const paymentId = data?.id ? String(data.id) : null;
        if (!paymentId) {
          return new Response("ok", { status: 200 });
        }

        try {
          const { fetchPayment, mapMpStatus } = await import("@/lib/menuzin-mp.server");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { approveAndRenew } = await import("@/lib/subscription-renewal.server");

          const mpPayment = await fetchPayment(paymentId);
          const externalRef = (mpPayment.external_reference as string | null) ?? null;
          const status = mapMpStatus(String(mpPayment.status ?? "pending"));

          // Localiza por mp_payment_id ou external_reference (= subscription_payments.id)
          let payRow: { id: string; tenant_id: string; subscription_id: string; payment_status: string } | null = null;
          const { data: byMp } = await supabaseAdmin
            .from("subscription_payments")
            .select("id, tenant_id, subscription_id, payment_status")
            .eq("mercado_pago_payment_id", paymentId)
            .maybeSingle();
          if (byMp) payRow = byMp as never;
          else if (externalRef) {
            const { data: byRef } = await supabaseAdmin
              .from("subscription_payments")
              .select("id, tenant_id, subscription_id, payment_status")
              .eq("id", externalRef)
              .maybeSingle();
            if (byRef) payRow = byRef as never;
          }
          if (!payRow) return new Response("ok", { status: 200 });

          if (status === "approved") {
            await approveAndRenew({
              paymentId: payRow.id,
              mpPaymentId: paymentId,
              paidAt: (mpPayment.date_approved as string) ?? new Date().toISOString(),
              rawResponse: mpPayment,
              source: "webhook",
            });
          } else {
            await supabaseAdmin
              .from("subscription_payments")
              .update({
                payment_status: status,
                mercado_pago_payment_id: paymentId,
                raw_response: mpPayment as never,
              })
              .eq("id", payRow.id);
            await supabaseAdmin.from("subscription_events").insert({
              tenant_id: payRow.tenant_id,
              subscription_id: payRow.subscription_id,
              event_type: `payment_${status}`,
              description: `Webhook MP: status ${status}`,
              metadata: { payment_id: payRow.id, mp_id: paymentId },
            });
          }
        } catch (err) {
          console.error("[menuzin-mp-webhook]", err);
        }
        return new Response("ok", { status: 200 });
      },
      GET: async () => new Response("ok", { status: 200 }),
    },
  },
});
