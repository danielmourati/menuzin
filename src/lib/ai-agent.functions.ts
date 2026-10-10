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
    const { data: t } = await supabaseAdmin.from("tenants")
      .select("id, whatsapp, accepts_delivery, accepts_takeout, accepts_dinein")
      .eq("slug", data.slug).eq("active", true).maybeSingle();
    if (!t) return {
      enabled: false, name: "", greeting: "", whatsapp: "",
      quickReplies: [] as { label: string; message: string }[],
      receiveModes: [] as string[], paymentMethods: [] as string[],
    };
    const { getTenantPlan } = await import("@/lib/plan-server");
    const { loadAgentSettings } = await import("@/lib/ai-agent.server");
    const [plan, s, qr, paymentResult] = await Promise.all([
      getTenantPlan(t.id), loadAgentSettings(t.id),
      supabaseAdmin.from("ai_quick_replies").select("label, message").eq("tenant_id", t.id).eq("active", true).order("sort_order").limit(8),
      supabaseAdmin.from("store_payment_settings")
        .select("cash_enabled, pix_manual_enabled, card_on_delivery_enabled")
        .eq("tenant_id", t.id).maybeSingle(),
    ]);
    const quickReplies = (qr.data ?? []).length
      ? (qr.data ?? []).map((r) => ({ label: r.label, message: r.message || r.label }))
      : ["O que vocês têm hoje?", "Quais os mais pedidos?", "Tem cupom?"].map((l) => ({ label: l, message: l }));
    const receiveModes = [
      t.accepts_delivery ? "entrega" : null,
      t.accepts_takeout ? "retirada" : null,
      t.accepts_dinein ? "consumo_local" : null,
    ].filter((mode): mode is string => mode !== null);
    const payment = paymentResult.data;
    const paymentMethods = [
      payment?.cash_enabled ? "dinheiro" : null,
      payment?.pix_manual_enabled ? "pix_manual" : null,
      payment?.card_on_delivery_enabled ? "credito" : null,
      payment?.card_on_delivery_enabled ? "debito" : null,
    ].filter((method): method is string => method !== null);
    return {
      enabled: plan === "pro" && s.enabled,
      name: s.agent_name,
      greeting: s.greeting,
      quickReplies,
      whatsapp: (t.whatsapp ?? "").replace(/\D/g, ""),
      receiveModes,
      paymentMethods,
    };
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
      handoff_status: ((conv as any).handoff_status ?? "none") as string,
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
    const p = await srv.priceDraft(ctx, data.slug, draft, (conv as any).customer_location ?? null);
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
          ? {
              ...Object.fromEntries(Object.entries(a).filter(([, v]) => v != null && v !== "").map(([k, v]) => [k, String(v)])),
              ...(p.gps ? { lat: String(p.gps.lat), lng: String(p.gps.lng), gps_url: `https://www.google.com/maps?q=${p.gps.lat},${p.gps.lng}` } : {}),
            }
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
      .select("id, customer_name, customer_phone, status, order_id, message_count, handoff_status, handoff_requested_at, handoff_staff_name, created_at, updated_at, orders(number)")
      .eq("tenant_id", tenantId).or("message_count.gt.0,handoff_status.in.(requested,human)").order("updated_at", { ascending: false }).limit(100);
    const rank = (c: any) => (c.status === "open" && c.handoff_status === "requested" ? 0 : c.status === "open" && c.handoff_status === "human" ? 1 : 2);
    return (data ?? []).map((c: any) => ({ ...c, order_number: c.orders?.number ?? null }))
      .sort((a: any, b: any) => rank(a) - rank(b) || String(b.updated_at).localeCompare(String(a.updated_at)));
  });

export const getMyAgentConversationMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantFor(context);
    const { data: conv } = await supabaseAdmin.from("ai_conversations").select("id, draft, customer_location").eq("id", data.id).eq("tenant_id", tenantId).maybeSingle();
    if (!conv) throw new Error("Conversa não encontrada");
    const { data: rows } = await supabaseAdmin
      .from("ai_messages").select("id, role, parts, created_at").eq("conversation_id", data.id).order("created_at");
    const messages = (rows ?? []).map((r) => ({
      id: r.id, role: r.role, created_at: r.created_at,
      staff: ((r.parts as any[]) ?? []).some((p) => p?.type === "data-staff"),
      text: ((r.parts as any[]) ?? []).filter((p) => p?.type === "text").map((p) => p.text).join("\n"),
      audioPath: (((r.parts as any[]) ?? []).find((p) => p?.type === "data-audio")?.data?.path as string | undefined) ?? null,
    }));
    const d: any = conv.draft ?? null;
    return {
      messages,
      location: (conv as any).customer_location as { lat: number; lng: number } | null,
      cart: d?.lines ? {
        lines: (d.lines as any[]).map((l) => ({ name: l.name, qty: l.qty, details: l.details ?? "", line_total: l.line_total })),
        subtotal: d.subtotal ?? 0, delivery_fee: d.delivery_fee ?? 0, discount: d.discount ?? 0, total: d.total ?? 0,
        mode: d.draft?.mode ?? null, payment: d.draft?.payment ?? null, address: d.draft?.address ?? null,
      } : null,
    };
  });

/** Link temporário (5 min) para o atendente ouvir o áudio original do cliente. */
export const getMyAgentAudioUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), path: z.string().min(10).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantFor(context);
    if (!data.path.startsWith(`${tenantId}/${data.id}/`) || data.path.includes("..")) throw new Error("Áudio não encontrado.");
    const { data: conv } = await supabaseAdmin.from("ai_conversations").select("id").eq("id", data.id).eq("tenant_id", tenantId).maybeSingle();
    if (!conv) throw new Error("Conversa não encontrada");
    const { data: signed, error } = await supabaseAdmin.storage.from("chat-audio").createSignedUrl(data.path, 300);
    if (error || !signed?.signedUrl) throw new Error("Não foi possível carregar o áudio.");
    return { url: signed.signedUrl };
  });

// ---------- Atalhos (mensagens rápidas) ----------
export const DEFAULT_QUICK_REPLIES = ["O que vocês têm hoje?", "Quais os mais pedidos?", "Tem cupom?"];

async function seedDefaults(supabase: any, tenantId: string) {
  const { error } = await supabase.from("ai_quick_replies").insert(
    DEFAULT_QUICK_REPLIES.map((label, i) => ({ tenant_id: tenantId, label, message: "", active: true, sort_order: i })),
  );
  if (error) throw new Error(error.message);
}

export const listMyQuickReplies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantFor(context);
    const q = () => context.supabase.from("ai_quick_replies")
      .select("id, label, message, active, sort_order").eq("tenant_id", tenantId).order("sort_order");
    let { data, error } = await q();
    if (error) throw new Error(error.message);
    if (!data?.length) {
      await seedDefaults(context.supabase, tenantId);
      ({ data, error } = await q());
      if (error) throw new Error(error.message);
    }
    return (data ?? []) as { id: string; label: string; message: string; active: boolean; sort_order: number }[];
  });

export const restoreDefaultQuickReplies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantFor(context);
    const { error } = await context.supabase.from("ai_quick_replies").delete().eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    await seedDefaults(context.supabase, tenantId);
    return { ok: true };
  });

export const saveMyQuickReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid().nullable(),
    label: z.string().trim().min(1).max(80),
    message: z.string().trim().max(80),
    active: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantFor(context);
    const { data: all } = await context.supabase.from("ai_quick_replies").select("id, active, sort_order").eq("tenant_id", tenantId);
    const activeOthers = (all ?? []).filter((r: any) => r.active && r.id !== data.id).length;
    if (data.active && activeOthers >= 8) throw new Error("Máximo de 8 atalhos ativos.");
    if (data.id) {
      const { error } = await context.supabase.from("ai_quick_replies")
        .update({ label: data.label, message: data.message, active: data.active }).eq("id", data.id).eq("tenant_id", tenantId);
      if (error) throw new Error(error.message);
    } else {
      const max = Math.max(-1, ...(all ?? []).map((r: any) => r.sort_order));
      const { error } = await context.supabase.from("ai_quick_replies")
        .insert({ tenant_id: tenantId, label: data.label, message: data.message, active: data.active, sort_order: max + 1 });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteMyQuickReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantFor(context);
    const { error } = await context.supabase.from("ai_quick_replies").delete().eq("id", data.id).eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderMyQuickReplies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ids: z.array(z.string().uuid()).max(50) }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantFor(context);
    for (let i = 0; i < data.ids.length; i++) {
      const { error } = await context.supabase.from("ai_quick_replies").update({ sort_order: i }).eq("id", data.ids[i]).eq("tenant_id", tenantId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ---------- Atendente humano ----------
export const requestHumanHandoff = createServerFn({ method: "POST" })
  .inputValidator((d) => ConvInput.parse(d))
  .handler(async ({ data }) => {
    const { getConversation, notifyHandoff } = await import("@/lib/ai-agent.server");
    const conv = await getConversation(data.id, data.accessKey);
    if (!conv || conv.status !== "open") throw new Error("Conversa indisponível.");
    if ((conv as any).handoff_status === "requested" || (conv as any).handoff_status === "human") return { ok: true };
    await notifyHandoff(conv.id, conv.tenant_id);
    return { ok: true };
  });

export const listMyHandoffCount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantFor(context);
    const { data } = await supabaseAdmin.from("ai_conversations")
      .select("id, customer_name, handoff_requested_at").eq("tenant_id", tenantId).eq("status", "open")
      .eq("handoff_status", "requested").order("handoff_requested_at", { ascending: false }).limit(20);
    return data ?? [];
  });

export const sendStaffReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), text: z.string().trim().min(1).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantFor(context);
    const { data: conv } = await supabaseAdmin.from("ai_conversations").select("id, status").eq("id", data.id).eq("tenant_id", tenantId).maybeSingle();
    if (!conv) throw new Error("Conversa não encontrada");
    const { error } = await supabaseAdmin.from("ai_messages").insert({
      conversation_id: conv.id, ai_message_id: `staff-${crypto.randomUUID()}`, role: "assistant",
      parts: [{ type: "text", text: data.text }, { type: "data-staff", data: { by: "loja" } }] as never,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("ai_conversations").update({ handoff_status: "human", updated_at: new Date().toISOString() }).eq("id", conv.id);
    return { ok: true };
  });

export const acceptHandoff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantFor(context);
    const { data: conv } = await supabaseAdmin.from("ai_conversations").select("id, status").eq("id", data.id).eq("tenant_id", tenantId).maybeSingle();
    if (!conv || conv.status !== "open") throw new Error("Conversa indisponível");
    const { data: prof } = await supabaseAdmin.from("profiles").select("full_name").eq("id", context.userId).maybeSingle();
    const name = (prof?.full_name || "").split(" ")[0] || "Alguém";
    await supabaseAdmin.from("ai_messages").insert({
      conversation_id: conv.id, ai_message_id: `staff-${crypto.randomUUID()}`, role: "assistant",
      parts: [{ type: "text", text: `${name} da loja entrou na conversa 👋 Como posso ajudar?` }, { type: "data-staff", data: { by: "loja" } }] as never,
    });
    const { error } = await supabaseAdmin.from("ai_conversations").update({
      handoff_status: "human", handoff_staff_name: name, handoff_accepted_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    } as never).eq("id", conv.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setHandoffStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), status: z.enum(["none", "human", "closed"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantFor(context);
    const { error } = await supabaseAdmin.from("ai_conversations")
      .update({ handoff_status: data.status, updated_at: new Date().toISOString() }).eq("id", data.id).eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
