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
      // Total de assinantes ativos no tenant
      const { count: subscriberCount, error: subErr } = await (supabase as any)
        .from("push_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", resolved.tenantId);

      if (subErr) throw subErr;

      // Histórico de campanhas
      const { data: campaigns, error: campErr } = await (supabase as any)
        .from("push_campaigns")
        .select("*")
        .eq("tenant_id", resolved.tenantId)
        .order("created_at", { ascending: false });

      if (campErr) throw campErr;

      const campList = campaigns ?? [];
      const totalSentMessages = campList.reduce((acc: number, c: any) => acc + (c.sent_count || 0), 0);
      const totalSuccessMessages = campList.reduce((acc: number, c: any) => acc + (c.success_count || 0), 0);

      return {
        subscriberCount: subscriberCount ?? 0,
        totalSentMessages,
        totalSuccessMessages,
        campaigns: campList,
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
        };
      }
      throw err;
    }
  });

const CreateCampaignInput = z.object({
  title: z.string().min(3, "Título muito curto"),
  body: z.string().min(5, "Mensagem muito curta"),
  iconUrl: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  couponId: z.string().optional().nullable(),
  targetType: z.enum(["all", "customers_with_orders"]).default("all"),
});

// Endpoint Admin: Criar nova campanha de push
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
    return { success: true, ...result };
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
