// ============================================================
// Edge Function: create-transparent-payment
// Generates transparent payments (Pix/Credit Card) via Deno
// Decrypts tenant access tokens, calls MP APIs directly, and updates tables
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Basic AES-GCM decryption helper
async function decryptToken(cipherBase64: string, secretKeyHex: string): Promise<string> {
  const rawKey = new Uint8Array(
    secretKeyHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const combined = new Uint8Array(
    atob(cipherBase64)
      .split("")
      .map((char) => char.charCodeAt(0))
  );

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

serve(async (req) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { store_slug, order_id, payment_method, payer, card_token, installments } = await req.json();

    if (!store_slug || !order_id || !payment_method || !payer) {
      return new Response(JSON.stringify({ error: "Missing required params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Resolve store_id from slug
    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("slug", store_slug)
      .single();

    if (storeError || !store) {
      return new Response(JSON.stringify({ error: "Store not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const storeId = store.id;

    // 2. Resolve order & validate ownership (Isolamento Multi-tenant!)
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .eq("store_id", storeId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found or access denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Retrieve payment settings for tenant
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("store_payment_settings")
      .select("*")
      .eq("store_id", storeId)
      .single();

    if (settingsError || !settings || !settings.mp_connected) {
      return new Response(JSON.stringify({ error: "Mercado Pago online payments not configured for this store" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Decrypt access token
    const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
    if (!encryptionKey) {
      throw new Error("Server decrypt key not configured");
    }

    let accessToken = "";
    try {
      accessToken = await decryptToken(settings.mp_access_token_encrypted, encryptionKey);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to authenticate store payment credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Construct Mercado Pago payment body
    // External reference connects back to order_id
    const body: Record<string, any> = {
      transaction_amount: Number(order.total),
      description: `Pedido #${order.order_number} - ${store_slug.toUpperCase()}`,
      payment_method_id: payment_method === "pix_online" ? "pix" : undefined, // Will be parsed automatically if token provided
      token: card_token || undefined,
      installments: installments ? Number(installments) : 1,
      external_reference: order.id, // tracks order_id + store_id via the order record
      payer: {
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name,
      },
    };

    // 6. Request Mercado Pago transparent API (No Marketplace fees applied!)
    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `idemp_${order.id}`,
      },
      body: JSON.stringify(body),
    });

    const paymentResponse = await mpRes.json();

    if (!mpRes.ok) {
      console.error("MP Payment API Error:", paymentResponse);
      return new Response(JSON.stringify({ error: "Gateway error processing payment", details: paymentResponse }), {
        status: mpRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { id: mpPaymentId, status: mpStatus, status_detail: mpStatusDetail } = paymentResponse;

    // Map MP status to standard PaymentStatus
    let standardStatus = "pending";
    if (mpStatus === "approved") standardStatus = "approved";
    else if (mpStatus === "in_process") standardStatus = "processing";
    else if (mpStatus === "rejected") standardStatus = "rejected";
    else if (mpStatus === "cancelled") standardStatus = "cancelled";

    // 7. Save raw log inside payments table
    await supabaseAdmin.from("payments").insert({
      store_id: storeId,
      order_id: order.id,
      provider: "mercadopago",
      provider_payment_id: String(mpPaymentId),
      amount: order.total,
      payment_method,
      status: standardStatus,
      status_detail: mpStatusDetail,
      raw_response: paymentResponse,
    });

    // 8. Update main order reference
    await supabaseAdmin
      .from("orders")
      .update({
        payment_status: standardStatus,
        mp_payment_id: String(mpPaymentId),
        mp_status: mpStatus,
        mp_status_detail: mpStatusDetail,
        status: standardStatus === "approved" ? "new" : order.status,
      })
      .eq("id", order.id);

    // 9. Format response for frontend client
    if (payment_method === "pix_online") {
      const pixObj = paymentResponse.point_of_interaction?.transaction_data;
      return new Response(
        JSON.stringify({
          type: "pix",
          data: {
            qr_code: pixObj?.qr_code,
            qr_code_base64: pixObj?.qr_code_base64,
            ticket_url: pixObj?.ticket_url,
            expires_at: paymentResponse.date_of_expiration,
            payment_id: String(mpPaymentId),
            payment_status: standardStatus,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          type: "card",
          data: {
            payment_id: String(mpPaymentId),
            payment_status: standardStatus,
            status_detail: mpStatusDetail,
            order_id: order.id,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error: any) {
    console.error("Payment transparent flow crash:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
