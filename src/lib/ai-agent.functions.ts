import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tryResolveEffectiveTenantId } from "@/lib/active-tenant.server";

const Slug = z.string().min(1).max(80).regex(/^[a-z0-9-]+$/);
const ConvInput = z.object({ id: z.string().uuid(), accessKey: z.string().min(20).max(100) });

/** Público: diz se a loja tem o atendente ligado. */
export const getAgentPublicInfo = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data }) => {
    const { data: t } = await supabaseAdmin.from("tenants").select("id").eq("slug", data.slug).eq("active", true).maybeSingle();
    if (!t) return { enabled: false, name: "", greeting: "" };
    const { getTenantPlan } = await import("@/lib/plan-server");
    const { loadAgentSettings } = await import("@/lib/ai-agent.server");
    const [plan, s] = await Promise.all([getTenantPlan(t.id), loadAgentSettings(t.id)]);
    return { enabled: plan === "pro" && s.enabled, name: s.agent_name, greeting: s.greeting };
  });

export const startAgentConversation = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ slug: Slug, customer_name: z.string().max(120).nullable(), whatsapp: z.string().max(20).nullable() }).parse(d),
  )
  .handler(async ({ data }) => {
    const srv = await import("@/lib/ai-agent.server");
    const ctx = await srv.loadAgentContext(data.slug);
    if (!ctx) throw new Error("Atendente indisponível nesta loja.");
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const accessKey = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const draft = { ...srv.emptyDraft(), customer_name: data.customer_name, whatsapp: data.whatsapp };
    const { data: row, error } = await supabaseAdmin
      .from("ai_conversations")
      .insert({ tenant_id: ctx.tenant.id, access_key: accessKey, customer_name: data.customer_name, customer_phone: data.whatsapp, draft: { draft } as never })
      .select("id").single();
    if (error || !row) throw new Error("Não foi possível iniciar a conversa.");
    return { id: row.id, accessKey };
  });

export const getAgentConversation = createServerFn({ method: "POST" })
  .inputValidator((d) => ConvInput.parse(d))
  .handler(async ({ data }) => {
    const { getConversation } = await import("@/lib/ai-agent.server");
    const conv = await getConversation(data.id, data.accessKey);
    if (!conv) return null;
    const { data: rows } = await supabaseAdmin
      .from("ai_messages").select("ai_message_id, role, parts").eq("conversation_id", conv.id).order("created_at");
    return {
      status: conv.status as string,
      order_id: conv.order_id as string | null,
      priced: (conv.draft as any)?.lines ? (conv.draft as any) : null,
      messages: (rows ?? []).map((r) => ({ id: r.ai_message_id ?? crypto.randomUUID(), role: r.role, parts: r.parts as any[] })),
    };
  });

/** Cliente tocou em "Confirmar pedido": recalcula tudo e cria o pedido. */
export const confirmAgentOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => ConvInput.extend({ slug: Slug }).parse(d))
  .handler(async ({ data }) => {
    const srv = await import("@/lib/ai-agent.server");
    const conv = await srv.getConversation(data.id, data.accessKey);
    if (!conv) throw new Error("Conversa não encontrada.");
    if (conv.status === "ordered" && conv.order_id) return { orderId: conv.order_id as string };
    const ctx = await srv.loadAgentContext(data.slug);
    if (!ctx || ctx.tenant.id !== conv.tenant_id) throw new Error("Atendente indisponível nesta loja.");
    const draft = srv.DraftSchema.parse((conv.draft as any)?.draft);
    const p = await srv.priceDraft(ctx, data.slug, draft);
    if (!p.ready) throw new Error([...p.missing.map((m) => `Falta: ${m}`), ...p.errors].join(" · "));

    const prefix = draft.mode === "retirada" ? "Pagar na retirada" : draft.mode === "consumo_local" ? "Pagar no local" : "Pagar na entrega";
    const { createOrder } = await import("@/lib/orders.functions");
    const a = draft.address;
    const res = await createOrder({
      data: {
        tenant_slug: data.slug,
        customer_name: draft.customer_name!,
        whatsapp: draft.whatsapp!.replace(/\D/g, ""),
        mode: draft.mode!,
        payment_label: `${prefix} · ${srv.PAYMENT_LABELS[draft.payment!]}`,
        change_for: draft.payment === "dinheiro" && !draft.no_change ? draft.change_for : null,
        no_change: draft.payment === "dinheiro" ? !!draft.no_change : false,
        delivery_fee: p.delivery_fee,
        delivery_fee_source: (p.delivery_fee_source as any) ?? null,
        delivery_neighborhood_snapshot: p.delivery_neighborhood,
        address: draft.mode === "entrega" && a
          ? Object.fromEntries(Object.entries(a).filter(([, v]) => v != null && v !== "").map(([k, v]) => [k, String(v)]))
          : null,
        table_label: draft.mode === "consumo_local" ? draft.table_label : null,
        note: draft.note,
        coupon_code: p.coupon_code,
        idempotency_key: `ai-${conv.id}`,
        items: p.lines.map((l) => ({
          product_id: l.product_id, name_snapshot: l.name, qty: l.qty, unit_price: l.unit_price, addons: l.addons, note: l.note,
        })),
      },
    });
    if (!res.order) throw new Error(res.reason || "Não foi possível criar o pedido.");
    await supabaseAdmin.from("orders").update({ source: "ai_agent" }).eq("id", res.order.id);
    await supabaseAdmin.from("ai_conversations")
      .update({ status: "ordered", order_id: res.order.id, updated_at: new Date().toISOString() }).eq("id", conv.id);
    return { orderId: res.order.id as string, customer: res.customer };
  });

// ---------- Painel do lojista ----------
async function tenantFor(ctx: { supabase: any; userId: string }) {
  const r = await tryResolveEffectiveTenantId(ctx.supabase, ctx.userId);
  if (!r) throw new Error("Loja não encontrada");
  return r.tenantId;
}

export const getMyAgentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantFor(context);
    const { loadAgentSettings } = await import("@/lib/ai-agent.server");
    const { getTenantPlan } = await import("@/lib/plan-server");
    const [s, plan] = await Promise.all([loadAgentSettings(tenantId), getTenantPlan(tenantId)]);
    return { ...s, isPro: plan === "pro" };
  });

export const saveMyAgentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      enabled: z.boolean(),
      agent_name: z.string().trim().min(1).max(40),
      tone: z.enum(["descontraido", "formal"]),
      greeting: z.string().max(300),
      extra_instructions: z.string().max(1500),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantFor(context);
    const { getTenantPlan } = await import("@/lib/plan-server");
    if (data.enabled && (await getTenantPlan(tenantId)) !== "pro") throw new Error("O atendente IA é exclusivo do plano Pro.");
    const { error } = await context.supabase.from("ai_agent_settings")
      .upsert({ tenant_id: tenantId, ...data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyAgentConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantFor(context);
    const { data } = await supabaseAdmin
      .from("ai_conversations")
      .select("id, customer_name, customer_phone, status, order_id, message_count, created_at, updated_at, orders(number)")
      .eq("tenant_id", tenantId).gt("message_count", 0).order("updated_at", { ascending: false }).limit(100);
    return (data ?? []).map((c: any) => ({ ...c, order_number: c.orders?.number ?? null }));
  });

export const getMyAgentConversationMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantFor(context);
    const { data: conv } = await supabaseAdmin.from("ai_conversations").select("id").eq("id", data.id).eq("tenant_id", tenantId).maybeSingle();
    if (!conv) throw new Error("Conversa não encontrada");
    const { data: rows } = await supabaseAdmin
      .from("ai_messages").select("id, role, parts, created_at").eq("conversation_id", data.id).order("created_at");
    return (rows ?? []).map((r) => ({
      id: r.id, role: r.role, created_at: r.created_at,
      text: ((r.parts as any[]) ?? []).filter((p) => p?.type === "text").map((p) => p.text).join("\n"),
    }));
  });
