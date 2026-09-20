import webpush from "web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Fallback VAPID keys so push functionality works out of the box
// In production, set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in environment variables
const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgD8R6_N8_b4eJ2w4vR-Z9cE8wN2dK3vV-n3_E-s-S0vw";
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  "n6x0D_tK8b_6m4tN-c40-n3-s-S0vwBEl62iUYgUivxI";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:suporte@menuzin.app";

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (e) {
  console.warn("[web-push] Configuração VAPID inicial:", e);
}

export function getVapidPublicKeyServer() {
  return VAPID_PUBLIC_KEY;
}

export type SavePushSubInput = {
  tenantId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  customerPhone?: string | null;
  customerId?: string | null;
  userAgent?: string | null;
};

/** Salva ou atualiza a assinatura Web Push de um navegador na loja */
export async function savePushSubscriptionServer(input: SavePushSubInput) {
  if (!input.tenantId || !input.endpoint || !input.p256dh || !input.auth) {
    throw new Error("Dados de assinatura push incompletos.");
  }

  const payload = {
    tenant_id: input.tenantId,
    customer_id: input.customerId || null,
    customer_phone: input.customerPhone || null,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    user_agent: input.userAgent || null,
    last_active_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await (supabaseAdmin as any)
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", input.endpoint)
    .maybeSingle();

  if (existing) {
    const { data, error } = await (supabaseAdmin as any)
      .from("push_subscriptions")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  } else {
    const { data, error } = await (supabaseAdmin as any)
      .from("push_subscriptions")
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}

export type PushMessagePayload = {
  title: string;
  body: string;
  icon?: string | null;
  image?: string | null;
  url?: string | null;
  coupon?: string | null;
};

/** Executa o disparo de uma campanha de push notification para os clientes da loja */
export async function sendPushCampaignServer(campaignId: string, tenantId: string) {
  // 1. Busca os dados da campanha
  const { data: campaign, error: campErr } = await (supabaseAdmin as any)
    .from("push_campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("tenant_id", tenantId)
    .single();

  if (campErr || !campaign) {
    throw new Error("Campanha não encontrada.");
  }

  // Atualiza status para sending
  await (supabaseAdmin as any)
    .from("push_campaigns")
    .update({ status: "sending" })
    .eq("id", campaignId);

  // 2. Busca os assinantes do tenant
  let query = (supabaseAdmin as any)
    .from("push_subscriptions")
    .select("*")
    .eq("tenant_id", tenantId);

  // Se o filtro for apenas para quem já comprou
  if (campaign.target_type === "customers_with_orders") {
    // Busca telefones de clientes que possuem pedidos no tenant
    const { data: ordersData } = await (supabaseAdmin as any)
      .from("orders")
      .select("whatsapp")
      .eq("tenant_id", tenantId);

    const buyerPhones = (ordersData ?? [])
      .map((o: any) => o.whatsapp)
      .filter(Boolean);

    if (buyerPhones.length > 0) {
      query = query.in("customer_phone", buyerPhones);
    } else {
      // Nenhum comprador encontrado com esse filtro
      await (supabaseAdmin as any)
        .from("push_campaigns")
        .update({
          status: "sent",
          sent_count: 0,
          success_count: 0,
          failed_count: 0,
          sent_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      return { total: 0, success: 0, failed: 0 };
    }
  }

  const { data: subscriptions, error: subErr } = await query;
  if (subErr) {
    throw new Error(`Erro ao buscar inscritos: ${subErr.message}`);
  }

  const subsList = subscriptions ?? [];
  const total = subsList.length;
  let successCount = 0;
  let failedCount = 0;
  const expiredIds: string[] = [];

  const pushPayload: PushMessagePayload = {
    title: campaign.title,
    body: campaign.body,
    icon: campaign.icon_url,
    image: campaign.image_url,
    url: campaign.url,
  };

  const payloadStr = JSON.stringify(pushPayload);

  // Dispara as notificações concorrentemente em lotes
  await Promise.all(
    subsList.map(async (sub: any) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payloadStr);
        successCount++;
      } catch (err: any) {
        failedCount++;
        // Se a assinatura expirou ou o navegador desinstalou o app (404/410), marca para remover
        if (err.statusCode === 404 || err.statusCode === 410) {
          expiredIds.push(sub.id);
        }
        console.warn(`[PushSend] Falha para endpoint ${sub.endpoint.slice(0, 30)}:`, err.message);
      }
    })
  );

  // Remove assinaturas expiradas do banco
  if (expiredIds.length > 0) {
    await (supabaseAdmin as any)
      .from("push_subscriptions")
      .delete()
      .in("id", expiredIds);
  }

  // Atualiza relatório final da campanha
  await (supabaseAdmin as any)
    .from("push_campaigns")
    .update({
      status: "sent",
      sent_count: total,
      success_count: successCount,
      failed_count: failedCount,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  return { total, success: successCount, failed: failedCount };
}
