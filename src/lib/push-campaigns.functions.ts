import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tryResolveEffectiveTenantId } from "@/lib/active-tenant.server";
import { getVapidPublicKeyServer, savePushSubscriptionServer, sendPushCampaignServer } from "./push-notifications.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Public endpoint to get VAPID Key for web push subscription in storefront
export const getVapidPublicKey = createServerFn({ method: "GET" })
  .handler(async () => {
    return { publicKey: getVapidPublicKeyServer() };
  });

const SubscribePushInput = z.object({
  tenantSlug: z.string(),
  endpoint: z.string(),
  p256dh: z.string(),
  auth: z.string(),
  customerPhone: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
});

// Endpoint público/cliente para inscrever o navegador na loja
export const subscribeCustomerPush = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SubscribePushInput.parse(d))
  .handler(async ({ data }) => {
    // Resolve tenantId a partir do slug
    const { data: tenant } = await (supabaseAdmin as any)
      .from("tenants")
      .select("id")
      .eq("slug", data.tenantSlug)
      .maybeSingle();

    if (!tenant) throw new Error("Loja não encontrada.");

    const row = await savePushSubscriptionServer({
      tenantId: tenant.id,
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
      customerPhone: data.customerPhone,
      customerId: data.customerId,
      userAgent: data.userAgent,
    });

    return { success: true, subscription: row };
  });

// Endpoint Admin: Métricas e estatísticas de notificações push
export const getPushStatsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) throw new Error("Loja não configurada");

    try {
      // Histórico de campanhas
      const { data: campaigns, error: campErr } = await (supabase as any)
        .from("push_campaigns")
        .select("*")
        .eq("tenant_id", resolved.tenantId)
        .order("created_at", { ascending: false });

      if (campErr) throw campErr;

      // Lista de todos os assinantes inscritos
      const { data: rawSubscribers } = await (supabase as any)
        .from("push_subscriptions")
        .select("id, endpoint, customer_phone, user_agent, created_at, last_active_at")
        .eq("tenant_id", resolved.tenantId)
        .order("created_at", { ascending: false });

      const allSubs = rawSubscribers ?? [];

      // Identifica e deduplica assinantes (por endpoint e por customer_phone + user_agent)
      const seenEndpoints = new Set<string>();
      const seenPhoneAgents = new Set<string>();
      const uniqueSubscribers: typeof allSubs = [];
      const duplicateIdsToDelete: string[] = [];

      for (const sub of allSubs) {
        const deviceType = sub.user_agent
          ? sub.user_agent.includes("iPhone") || sub.user_agent.includes("iPad") ? "ios" :
            sub.user_agent.includes("Android") ? "android" : "desktop"
          : "web";

        const phoneAgentKey = sub.customer_phone ? `${sub.customer_phone}_${deviceType}` : null;

        if (seenEndpoints.has(sub.endpoint)) {
          duplicateIdsToDelete.push(sub.id);
        } else if (phoneAgentKey && seenPhoneAgents.has(phoneAgentKey)) {
          duplicateIdsToDelete.push(sub.id);
        } else {
          seenEndpoints.add(sub.endpoint);
          if (phoneAgentKey) seenPhoneAgents.add(phoneAgentKey);
          uniqueSubscribers.push(sub);
        }
      }

      // Limpeza automática em background de assinaturas duplicadas
      if (duplicateIdsToDelete.length > 0) {
        (supabaseAdmin as any)
          .from("push_subscriptions")
          .delete()
          .in("id", duplicateIdsToDelete)
          .then(({ error }: any) => {
            if (error) console.error("[DeduplicatePush] Erro ao deletar duplicados:", error);
          });
      }

      // Busca os nomes dos clientes na tabela de pedidos (orders)
      const phones = uniqueSubscribers
        .map((s: any) => s.customer_phone)
        .filter((p: string | null): p is string => Boolean(p));

      const phoneToNameMap: Record<string, string> = {};

      if (phones.length > 0) {
        const { data: ordersData } = await (supabase as any)
          .from("orders")
          .select("whatsapp, customer_name, created_at")
          .eq("tenant_id", resolved.tenantId)
          .in("whatsapp", phones)
          .order("created_at", { ascending: false });

        if (ordersData) {
          for (const order of ordersData) {
            if (order.whatsapp && order.customer_name && order.customer_name.trim() && !phoneToNameMap[order.whatsapp]) {
              phoneToNameMap[order.whatsapp] = order.customer_name.trim();
            }
          }
        }
      }

      const subscribers = uniqueSubscribers.map((sub: any) => ({
        ...sub,
        customer_name: sub.customer_phone ? phoneToNameMap[sub.customer_phone] || null : null,
      }));

      const campList = campaigns ?? [];
      const totalSentMessages = campList.reduce((acc: number, c: any) => acc + (c.sent_count || 0), 0);
      const totalSuccessMessages = campList.reduce((acc: number, c: any) => acc + (c.success_count || 0), 0);

      return {
        subscriberCount: subscribers.length,
        totalSentMessages,
        totalSuccessMessages,
        campaigns: campList,
        subscribers,
      };
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("push_subscriptions") || msg.includes("schema cache") || err.code === "PGRST205") {
        return {
          tableMissing: true,
          subscriberCount: 0,
          totalSentMessages: 0,
          totalSuccessMessages: 0,
          campaigns: [],
          subscribers: [],
        };
      }
      throw err;
    }
  });

const CreateCampaignInput = z.object({
  id: z.string().uuid().optional().nullable(),
  title: z.string().min(3, "Título muito curto"),
  body: z.string().min(5, "Mensagem muito curta"),
  iconUrl: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  couponId: z.string().optional().nullable(),
  targetType: z.enum(["all", "customers_with_orders"]).default("all"),
});

// Endpoint Admin: Criar ou atualizar campanha de push
export const createPushCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateCampaignInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) throw new Error("Loja não configurada");

    const payload = {
      tenant_id: resolved.tenantId,
      title: data.title,
      body: data.body,
      icon_url: data.iconUrl || null,
      image_url: data.imageUrl || null,
      url: data.url || null,
      coupon_id: data.couponId || null,
      target_type: data.targetType,
      status: "draft",
    };

    if (data.id) {
      const { data: updated, error } = await (supabase as any)
        .from("push_campaigns")
        .update(payload)
        .eq("id", data.id)
        .eq("tenant_id", resolved.tenantId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { campaign: updated };
    }

    const { data: inserted, error } = await (supabase as any)
      .from("push_campaigns")
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { campaign: inserted };
  });

const DispatchCampaignInput = z.object({
  campaignId: z.string().uuid(),
});

// Endpoint Admin: Disparar uma campanha imediatamente
export const dispatchPushCampaignNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DispatchCampaignInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) throw new Error("Loja não configurada");

    const result = await sendPushCampaignServer(data.campaignId, resolved.tenantId);
    return { ok: true, ...result };
  });

const DeleteCampaignInput = z.object({
  campaignId: z.string().uuid(),
});

// Endpoint Admin: Excluir uma campanha
export const deletePushCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteCampaignInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) throw new Error("Loja não configurada");

    const { error } = await (supabase as any)
      .from("push_campaigns")
      .delete()
      .eq("id", data.campaignId)
      .eq("tenant_id", resolved.tenantId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

const DeleteSubInput = z.object({
  subscriptionId: z.string().uuid(),
});

// Endpoint Admin: Excluir uma assinatura de dispositivo
export const deletePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteSubInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) throw new Error("Loja não configurada");

    const { error } = await (supabase as any)
      .from("push_subscriptions")
      .delete()
      .eq("id", data.subscriptionId)
      .eq("tenant_id", resolved.tenantId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

