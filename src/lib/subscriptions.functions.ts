import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tryResolveEffectiveTenantId } from "@/lib/active-tenant.server";

// Tipos compartilhados (client-safe)
export type SubscriptionPeriod = "mensal" | "trimestral" | "semestral" | "anual" | "personalizado";
export type SubscriptionStatusValue =
  | "ativa" | "pendente" | "vencida" | "tolerancia" | "bloqueada" | "cancelada" | "teste" | "cortesia";

export interface PlanRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  monthly_price: number;
  annual_price: number | null;
  billing_periods: SubscriptionPeriod[];
  features: string[];
  active: boolean;
  sort_order: number;
}

export interface SubscriptionRow {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: SubscriptionStatusValue;
  billing_period: SubscriptionPeriod;
  amount: number;
  start_date: string;
  due_date: string | null;
  grace_days: number;
  auto_block_enabled: boolean;
  blocked_at: string | null;
  unblocked_at: string | null;
  notes: string | null;
  plan?: PlanRow | null;
}

export interface PaymentRow {
  id: string;
  amount: number;
  billing_period: SubscriptionPeriod;
  due_date: string | null;
  paid_at: string | null;
  payment_status: string;
  mercado_pago_payment_id: string | null;
  pix_qr_code: string | null;
  pix_qr_code_base64: string | null;
  pix_ticket_url: string | null;
  created_at: string;
}

// ============= TENANT (self-service) =============

export const listPlans = createServerFn({ method: "POST" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("plans").select("*").eq("active", true).order("sort_order");
    return { plans: (data ?? []) as unknown as PlanRow[] };
  });

export const getMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const resolved = await tryResolveEffectiveTenantId(context.supabase, context.userId);
    if (!resolved?.tenantId) return { subscription: null, payments: [] as PaymentRow[] };

    const { data: sub } = await supabaseAdmin
      .from("tenant_subscriptions")
      .select("*, plan:plans(*)")
      .eq("tenant_id", resolved.tenantId)
      .maybeSingle();

    const { data: pays } = await supabaseAdmin
      .from("subscription_payments")
      .select("id, amount, billing_period, due_date, paid_at, payment_status, mercado_pago_payment_id, pix_qr_code, pix_qr_code_base64, pix_ticket_url, created_at")
      .eq("tenant_id", resolved.tenantId)
      .order("created_at", { ascending: false })
      .limit(20);

    return {
      subscription: (sub ?? null) as unknown as SubscriptionRow | null,
      payments: (pays ?? []) as unknown as PaymentRow[],
    };
  });

function publishedUrl(): string {
  return process.env.PUBLIC_APP_URL || "https://menuzin.lovable.app";
}

export const createSubscriptionCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ plan_id: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createPixCharge } = await import("@/lib/menuzin-mp.server");

    const resolved = await tryResolveEffectiveTenantId(context.supabase, context.userId);
    if (!resolved?.tenantId) throw new Error("Loja não identificada");
    const tenantId = resolved.tenantId;

    const { data: sub } = await supabaseAdmin
      .from("tenant_subscriptions")
      .select("*, plan:plans(*)")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!sub) throw new Error("Assinatura não configurada. Contate o suporte.");

    const planId = data.plan_id ?? (sub as { plan_id: string }).plan_id;
    const { data: plan } = await supabaseAdmin
      .from("plans").select("*").eq("id", planId).maybeSingle();
    if (!plan) throw new Error("Plano não encontrado");

    const amount = Number((sub as { amount: number }).amount) || Number(plan.monthly_price) || 0;
    if (amount <= 0) throw new Error("Plano gratuito não exige pagamento");

    const { data: tenant } = await supabaseAdmin
      .from("tenants").select("name, slug").eq("id", tenantId).maybeSingle();

    // Cria row de pagamento pending
    const { data: pay, error: payErr } = await supabaseAdmin
      .from("subscription_payments")
      .insert({
        tenant_id: tenantId,
        subscription_id: (sub as { id: string }).id,
        plan_id: planId,
        amount,
        billing_period: (sub as { billing_period: SubscriptionPeriod }).billing_period,
        due_date: (sub as { due_date: string | null }).due_date,
        payment_status: "pending",
      })
      .select("id").single();
    if (payErr || !pay) throw new Error(payErr?.message ?? "Falha ao criar cobrança");

    const url = publishedUrl();
    const charge = await createPixCharge({
      amount,
      description: `Menuzin — ${plan.name} — ${tenant?.name ?? tenantId}`,
      externalReference: pay.id,
      notificationUrl: `${url}/api/public/menuzin-mp-webhook`,
      payer: { email: (context.claims as { email?: string } | undefined)?.email ?? "tenant@menuzin.app" },
    });

    await supabaseAdmin
      .from("subscription_payments")
      .update({
        mercado_pago_payment_id: charge.id,
        mercado_pago_external_reference: pay.id,
        pix_qr_code: charge.qr_code,
        pix_qr_code_base64: charge.qr_code_base64,
        pix_ticket_url: charge.ticket_url,
        raw_response: charge.raw as never,
      })
      .eq("id", pay.id);

    await supabaseAdmin.from("subscription_events").insert({
      tenant_id: tenantId,
      subscription_id: (sub as { id: string }).id,
      event_type: "charge_created",
      description: `Cobrança PIX gerada (R$ ${amount.toFixed(2)})`,
      metadata: { payment_id: pay.id, mp_id: charge.id },
      created_by: context.userId,
    });

    return {
      payment_id: pay.id,
      mp_payment_id: charge.id,
      qr_code: charge.qr_code,
      qr_code_base64: charge.qr_code_base64,
      ticket_url: charge.ticket_url,
      amount,
    };
  });

export const getChargeStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ payment_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const resolved = await tryResolveEffectiveTenantId(context.supabase, context.userId);
    if (!resolved?.tenantId) throw new Error("Loja não identificada");
    const { data: pay } = await supabaseAdmin
      .from("subscription_payments")
      .select("id, payment_status, paid_at")
      .eq("id", data.payment_id)
      .eq("tenant_id", resolved.tenantId)
      .maybeSingle();
    if (!pay) throw new Error("Cobrança não encontrada");
    return pay;
  });

// ============= SUPER-ADMIN =============

async function assertPlatformAdmin(supabase: unknown, userId: string) {
  const { data } = await (supabase as { rpc: (n: string, p: Record<string, unknown>) => Promise<{ data: unknown }> })
    .rpc("has_role", { _user_id: userId, _role: "platform_admin" });
  if (!data) throw new Error("Acesso restrito ao super-admin");
}

export const adminListPlans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("plans").select("*").order("sort_order");
    return { plans: (data ?? []) as unknown as PlanRow[] };
  });

const PlanInput = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(80),
  description: z.string().max(500).nullable().optional(),
  monthly_price: z.number().min(0).max(99999),
  annual_price: z.number().min(0).max(999999).nullable().optional(),
  billing_periods: z.array(z.enum(["mensal","trimestral","semestral","anual","personalizado"])).min(1),
  features: z.array(z.string().max(200)).max(40),
  active: z.boolean(),
  sort_order: z.number().int().min(0).max(999).optional(),
});

export const adminUpsertPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => PlanInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { error } = await supabaseAdmin.from("plans").update({
        slug: data.slug, name: data.name, description: data.description ?? null,
        monthly_price: data.monthly_price, annual_price: data.annual_price ?? null,
        billing_periods: data.billing_periods, features: data.features,
        active: data.active, sort_order: data.sort_order ?? 0,
      }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin.from("plans").insert({
      slug: data.slug, name: data.name, description: data.description ?? null,
      monthly_price: data.monthly_price, annual_price: data.annual_price ?? null,
      billing_periods: data.billing_periods, features: data.features,
      active: data.active, sort_order: data.sort_order ?? 0,
    }).select("id").single();
    if (error || !row) throw new Error(error?.message ?? "Falha ao criar plano");
    return { id: row.id as string };
  });

export const adminListSubscriptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    filter: z.enum(["all","expiring","overdue","blocked"]).optional(),
    plan_slug: z.string().optional(),
  }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("tenant_subscriptions")
      .select("*, plan:plans(*), tenant:tenants(id,name,slug)")
      .order("due_date", { ascending: true, nullsFirst: false });
    let list = (rows ?? []) as Array<SubscriptionRow & { tenant: { id: string; name: string; slug: string } | null }>;

    if (data.plan_slug) list = list.filter((s) => s.plan?.slug === data.plan_slug);
    const now = new Date();
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    if (data.filter === "expiring") {
      list = list.filter((s) => {
        if (!s.due_date) return false;
        const d = new Date(`${s.due_date}T00:00:00Z`).getTime();
        const days = Math.ceil((d - today) / 86400000);
        return days >= 0 && days <= 5;
      });
    } else if (data.filter === "overdue") {
      list = list.filter((s) => s.due_date && new Date(`${s.due_date}T00:00:00Z`).getTime() < today);
    } else if (data.filter === "blocked") {
      list = list.filter((s) => s.status === "bloqueada");
    }

    // Último pagamento aprovado por tenant
    const tenantIds = list.map((s) => s.tenant_id);
    let lastPaid = new Map<string, string>();
    if (tenantIds.length) {
      const { data: pays } = await supabaseAdmin
        .from("subscription_payments")
        .select("tenant_id, paid_at")
        .in("tenant_id", tenantIds)
        .eq("payment_status", "approved")
        .order("paid_at", { ascending: false });
      for (const p of pays ?? []) {
        if (!lastPaid.has((p as { tenant_id: string }).tenant_id)) {
          lastPaid.set((p as { tenant_id: string }).tenant_id, (p as { paid_at: string }).paid_at);
        }
      }
    }
    return {
      subscriptions: list.map((s) => ({ ...s, last_paid_at: lastPaid.get(s.tenant_id) ?? null })),
    };
  });

const UpdateSubInput = z.object({
  subscription_id: z.string().uuid(),
  plan_id: z.string().uuid().optional(),
  status: z.enum(["ativa","pendente","vencida","tolerancia","bloqueada","cancelada","teste","cortesia"]).optional(),
  billing_period: z.enum(["mensal","trimestral","semestral","anual","personalizado"]).optional(),
  amount: z.number().min(0).max(999999).optional(),
  due_date: z.string().nullable().optional(),
  grace_days: z.number().int().min(0).max(60).optional(),
  auto_block_enabled: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const adminUpdateSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpdateSubInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { subscription_id, ...patch } = data;
    const { data: existing } = await supabaseAdmin
      .from("tenant_subscriptions").select("tenant_id").eq("id", subscription_id).maybeSingle();
    if (!existing) throw new Error("Assinatura não encontrada");
    const { error } = await supabaseAdmin.from("tenant_subscriptions").update(patch).eq("id", subscription_id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("subscription_events").insert({
      tenant_id: (existing as { tenant_id: string }).tenant_id,
      subscription_id,
      event_type: "subscription_updated",
      description: "Assinatura atualizada pelo super-admin",
      metadata: patch as never,
      created_by: context.userId,
    });
    return { ok: true };
  });

export const adminExtendDueDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ subscription_id: z.string().uuid(), days: z.number().int().min(1).max(365) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sub } = await supabaseAdmin
      .from("tenant_subscriptions").select("id, tenant_id, due_date").eq("id", data.subscription_id).maybeSingle();
    if (!sub) throw new Error("Assinatura não encontrada");
    const base = (sub as { due_date: string | null }).due_date
      ? new Date(`${(sub as { due_date: string }).due_date}T00:00:00Z`) : new Date();
    base.setUTCDate(base.getUTCDate() + data.days);
    const newDue = base.toISOString().slice(0,10);
    await supabaseAdmin.from("tenant_subscriptions").update({ due_date: newDue, status: "ativa" }).eq("id", data.subscription_id);
    await supabaseAdmin.from("subscription_events").insert({
      tenant_id: (sub as { tenant_id: string }).tenant_id,
      subscription_id: data.subscription_id,
      event_type: "due_date_extended",
      description: `Vencimento prorrogado em ${data.days} dia(s)`,
      metadata: { days: data.days, new_due_date: newDue },
      created_by: context.userId,
    });
    return { ok: true, due_date: newDue };
  });

export const adminToggleBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ subscription_id: z.string().uuid(), block: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sub } = await supabaseAdmin
      .from("tenant_subscriptions").select("id, tenant_id").eq("id", data.subscription_id).maybeSingle();
    if (!sub) throw new Error("Assinatura não encontrada");
    const now = new Date().toISOString();
    await supabaseAdmin.from("tenant_subscriptions").update(
      data.block
        ? { status: "bloqueada", blocked_at: now }
        : { status: "ativa", unblocked_at: now, blocked_at: null },
    ).eq("id", data.subscription_id);
    await supabaseAdmin.from("subscription_events").insert({
      tenant_id: (sub as { tenant_id: string }).tenant_id,
      subscription_id: data.subscription_id,
      event_type: data.block ? "manually_blocked" : "manually_unblocked",
      description: data.block ? "Bloqueado manualmente" : "Desbloqueado manualmente",
      created_by: context.userId,
    });
    return { ok: true };
  });

export const adminRegisterManualPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    subscription_id: z.string().uuid(),
    amount: z.number().min(0).max(999999),
    note: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { approveAndRenew } = await import("@/lib/subscription-renewal.server");
    const { data: sub } = await supabaseAdmin
      .from("tenant_subscriptions").select("id, tenant_id, plan_id, billing_period, due_date").eq("id", data.subscription_id).maybeSingle();
    if (!sub) throw new Error("Assinatura não encontrada");
    const s = sub as { id: string; tenant_id: string; plan_id: string; billing_period: SubscriptionPeriod; due_date: string | null };
    const { data: pay } = await supabaseAdmin.from("subscription_payments").insert({
      tenant_id: s.tenant_id, subscription_id: s.id, plan_id: s.plan_id,
      amount: data.amount, billing_period: s.billing_period, due_date: s.due_date,
      payment_status: "pending",
    }).select("id").single();
    if (!pay) throw new Error("Falha ao registrar pagamento");
    await approveAndRenew({
      paymentId: (pay as { id: string }).id,
      source: "manual",
      actorUserId: context.userId,
      rawResponse: { note: data.note ?? null },
    });
    return { ok: true };
  });

export const adminListEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tenant_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: events } = await supabaseAdmin
      .from("subscription_events").select("*").eq("tenant_id", data.tenant_id)
      .order("created_at", { ascending: false }).limit(50);
    const { data: pays } = await supabaseAdmin
      .from("subscription_payments").select("*").eq("tenant_id", data.tenant_id)
      .order("created_at", { ascending: false }).limit(50);
    return { events: events ?? [], payments: pays ?? [] };
  });
