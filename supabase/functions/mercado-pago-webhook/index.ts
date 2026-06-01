// ============================================================
// Edge Function: mercado-pago-webhook
// Unique endpoint handling real-time payment notifications for all tenants
// Tracks, decrypts access tokens dynamically, reconciles and updates orders
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Decryption Helper
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
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = await req.json();
    console.log("MP Webhook notification received:", payload);

    const eventId = payload.id || payload.data?.id;
    const type = payload.type || payload.action;

    // 1. Log event in webhook_events table for auditing
    const { data: dbEvent, error: logError } = await supabaseAdmin
      .from("webhook_events")
      .insert({
        provider: "mercadopago",
        event_type: type || "unknown",
        provider_event_id: eventId ? String(eventId) : null,
        payload,
        processed: false,
      })
      .select()
      .single();

    if (logError) {
      console.error("Failed to log webhook event:", logError);
    }

    // Only process "payment" notifications
    if (type !== "payment" && payload.action !== "payment.created" && payload.action !== "payment.updated") {
      return new Response(JSON.stringify({ received: true, info: "Ignored non-payment action" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const providerPaymentId = String(eventId);

    // 2. Identify store_id and order_id by querying the local payments table
    const { data: localPayment, error: paymentLookupError } = await supabaseAdmin
      .from("payments")
      .select("store_id, order_id")
      .eq("provider_payment_id", providerPaymentId)
      .single();

    if (paymentLookupError || !localPayment) {
      console.warn(`Payment reference not found locally for provider_payment_id: ${providerPaymentId}. Wait for front-end creation.`);
      return new Response(JSON.stringify({ received: true, info: "Payment reference not synced yet" }), {
        status: 200,
      });
    }

    const { store_id: storeId, order_id: orderId } = localPayment;

    // Associate identifiers with logged webhook event
    if (dbEvent) {
      await supabaseAdmin
        .from("webhook_events")
        .update({ store_id: storeId, order_id: orderId })
        .eq("id", dbEvent.id);
    }

    // 3. Resolve payment settings of the tenant
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("store_payment_settings")
      .select("*")
      .eq("store_id", storeId)
      .single();

    if (settingsError || !settings || !settings.mp_connected) {
      throw new Error(`Payment configurations not found or active for store ${storeId}`);
    }

    // 4. Decrypt access token to call MP securely
    const encryptionKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
    if (!encryptionKey) {
      throw new Error("Encryption key not configured on webhook env");
    }

    const accessToken = await decryptToken(settings.mp_access_token_encrypted, encryptionKey);

    // 5. Query full payment status from Mercado Pago API using tenant credentials
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${providerPaymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!mpRes.ok) {
      throw new Error(`Failed to fetch payment ${providerPaymentId} status from Mercado Pago API`);
    }

    const paymentDetails = await mpRes.json();
    const { status: mpStatus, status_detail: mpStatusDetail } = paymentDetails;

    // Validate that order matches external reference metadata (Isolamento!)
    const mpOrderId = paymentDetails.external_reference;
    if (mpOrderId !== orderId) {
      throw new Error(`Security Violation: Payload payment ID points to order ${mpOrderId} but matched ${orderId}`);
    }

    // Map status
    let standardStatus = "pending";
    if (mpStatus === "approved") standardStatus = "approved";
    else if (mpStatus === "in_process") standardStatus = "processing";
    else if (mpStatus === "rejected") standardStatus = "rejected";
    else if (mpStatus === "cancelled") standardStatus = "cancelled";
    else if (mpStatus === "refunded") standardStatus = "refunded";
    else if (mpStatus === "charged_back") standardStatus = "charged_back";

    // 6. Reconcile and update payments table
    await supabaseAdmin
      .from("payments")
      .update({
        status: standardStatus,
        status_detail: mpStatusDetail,
        raw_response: paymentDetails,
        updated_at: new Date().toISOString(),
      })
      .eq("provider_payment_id", providerPaymentId);

    // 7. Update orders table
    // If approved, update status to "new" (Novo Pedido) automatically
    await supabaseAdmin
      .from("orders")
      .update({
        payment_status: standardStatus,
        mp_status: mpStatus,
        mp_status_detail: mpStatusDetail,
        status: standardStatus === "approved" ? "new" : undefined, // Keep existing if not approved
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("store_id", storeId); // Double check multi-tenant isolation!

    // 8. Mark webhook event as processed
    if (dbEvent) {
      await supabaseAdmin
        .from("webhook_events")
        .update({ processed: true })
        .eq("id", dbEvent.id);
    }

    return new Response(JSON.stringify({ received: true, reconciled: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Webhook processing error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
