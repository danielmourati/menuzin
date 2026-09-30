import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webPush from "https://esm.sh/web-push@3.6.7";

// Configure Web Push with VAPID keys
// These should be set in Supabase Edge Function Secrets
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const vapidSubject = "mailto:suporte@menuzin.com.br";

webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

serve(async (req) => {
  try {
    const payload = await req.json();

    // Verify it's an insert on the 'orders' table
    if (payload.type === "INSERT" && payload.table === "orders") {
      const order = payload.record;
      const tenantId = order.tenant_id;

      // Initialize Supabase Client
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Fetch all admin push subscriptions for this tenant
      const { data: subscriptions, error } = await supabaseAdmin
        .from("push_subscriptions")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_admin_device", true);

      if (error) {
        throw error;
      }

      if (subscriptions && subscriptions.length > 0) {
        const notificationPayload = JSON.stringify({
          title: "Novo Pedido no Menuzin!",
          body: `Pedido #${order.short_id || "Novo"} chegou. Clique para visualizar.`,
          url: "/admin/pedidos",
        });

        const promises = subscriptions.map((sub) => {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          return webPush.sendNotification(pushSubscription, notificationPayload).catch((err) => {
            console.error(`Erro ao enviar para endpoint ${sub.endpoint}:`, err);
            // Optionally remove invalid subscriptions here
          });
        });

        await Promise.all(promises);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro na Edge Function send-admin-push:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
