// Webhook do Mercado Pago para os pagamentos de PEDIDOS dos lojistas.
// Cada pagamento é criado com `notification_url` apontando para cá com o
// tenant na query (?tenant=<uuid>). O corpo da notificação NUNCA é fonte da
// verdade: reconsultamos o pagamento na API do MP com o token do próprio
// lojista antes de atualizar qualquer registro.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/mp-order-webhook")({
  server: {
    handlers: {
      GET: async () => new Response("ok", { status: 200 }),
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const tenantId = url.searchParams.get("tenant");

        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          /* MP às vezes envia notificações vazias com tudo na query */
        }

        const { extractPaymentId, mapMpStatus, verifyMpSignature } = await import(
          "@/lib/mp-webhook.server"
        );
        const paymentId = extractPaymentId(body, url);

        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!tenantId || !uuidRe.test(tenantId) || !paymentId) {
          return new Response("ok", { status: 200 });
        }

        const sig = verifyMpSignature({ request, dataId: paymentId });
        if (!sig.ok) {
          console.warn("[mp-order-webhook] assinatura rejeitada:", sig.reason);
          return new Response("invalid signature", { status: 401 });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { getFreshAccessToken } = await import("@/lib/mp-oauth.server");

          const accessToken = await getFreshAccessToken(tenantId);
          const res = await fetch(
            `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
          if (!res.ok) {
            console.warn("[mp-order-webhook] MP respondeu", res.status, "para", paymentId);
            return new Response("ok", { status: 200 });
          }
          const json = (await res.json()) as {
            id?: number | string;
            status?: string;
            status_detail?: string | null;
            external_reference?: string | null;
          };

          const orderId = json.external_reference ?? null;
          if (!orderId || !uuidRe.test(orderId)) {
            return new Response("ok", { status: 200 });
          }

          // O pedido precisa pertencer ao tenant informado na URL.
          const { data: order } = await supabaseAdmin
            .from("orders")
            .select("id")
            .eq("id", orderId)
            .eq("tenant_id", tenantId)
            .maybeSingle();
          if (!order) return new Response("ok", { status: 200 });

          const mapped = mapMpStatus(json.status);
          const mpPaymentId = String(json.id ?? paymentId);

          await supabaseAdmin
            .from("orders")
            .update({
              payment_status: mapped,
              mp_payment_id: mpPaymentId,
              mp_status: json.status ?? null,
              mp_status_detail: json.status_detail ?? null,
            })
            .eq("id", orderId)
            .eq("tenant_id", tenantId);

          await supabaseAdmin
            .from("payments")
            .update({
              status: mapped,
              status_detail: json.status_detail ?? null,
              provider_payment_id: mpPaymentId,
              raw_response: JSON.parse(JSON.stringify(json)),
            })
            .eq("order_id", orderId)
            .eq("tenant_id", tenantId);
        } catch (err) {
          console.error("[mp-order-webhook]", err);
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
