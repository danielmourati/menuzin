import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tryResolveEffectiveTenantId } from "@/lib/active-tenant.server";
import { isCashLabel, changeDue } from "@/lib/cash-change";

type Ctx = { supabase: Parameters<typeof tryResolveEffectiveTenantId>[0]; userId: string };

async function tenantOf(ctx: Ctx) {
  const r = await tryResolveEffectiveTenantId(ctx.supabase, ctx.userId);
  if (!r?.tenantId) throw new Error("Acesso negado: nenhuma loja selecionada.");
  const { requireProPlan } = await import("@/lib/plan-server");
  await requireProPlan(r.tenantId);
  return r.tenantId;
}

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export type CashDriverDelivery = {
  id: string; number: number; neighborhood: string | null; fee: number; payment_label: string; is_cash: boolean;
};

export type CashDriverSummary = {
  driver_id: string | null;
  driver_name: string;
  orders: number;
  to_collect: number;
  change_out: number;
  must_return: number;
  settled_at: string | null;
  deliveries: CashDriverDelivery[];
  fees_total: number;
  fees_paid_at: string | null;
  fees_paid_method: string | null;
};

async function computeSession(tenantId: string, session: { id: string; opened_at: string; closed_at: string | null; opening_float: number }) {
  const sb = await admin();
  const until = session.closed_at ?? new Date().toISOString();
  const from = session.opened_at;
  const inWin = (t: string | null | undefined) => !!t && t >= from && t <= until;
  const cols = "id, number, status, total, change_for, no_change, payment_label, driver_id, driver_name, mode, customer_name, created_at, completed_at, delivery_fee, delivery_neighborhood_snapshot, address";
  const { data: dispatched } = await sb.from("order_status_history").select("order_id, created_at, orders!inner(tenant_id)")
    .eq("new_status", "saiu_entrega").eq("orders.tenant_id", tenantId).gte("created_at", from).lte("created_at", until);
  const dispatchedIds = [...new Set((dispatched ?? []).map((h) => h.order_id as string))];
  const [{ data: baseOrders }, { data: extraOrders }, { data: moves }, { data: settlements }] = await Promise.all([
    sb.from("orders").select(cols).eq("tenant_id", tenantId)
      .or(`and(created_at.gte.${from},created_at.lte.${until}),and(completed_at.gte.${from},completed_at.lte.${until})`)
      .order("created_at", { ascending: true }),
    dispatchedIds.length
      ? sb.from("orders").select(cols).eq("tenant_id", tenantId).in("id", dispatchedIds)
      : Promise.resolve({ data: [] as never[] }),
    sb.from("cash_movements").select("*").eq("session_id", session.id).order("created_at", { ascending: true }),
    sb.from("cash_driver_settlements").select("*").eq("session_id", session.id),
  ]);
  const seen = new Set<string>();
  const orders = [...(baseOrders ?? []), ...((extraOrders ?? []) as typeof baseOrders & object)].filter((o) => {
    if (!o || seen.has(o.id)) return false; seen.add(o.id); return true;
  });
  const cashOrders = orders.filter((o) => isCashLabel(o.payment_label) && o.status !== "cancelado");
  // Venda conta no turno em que foi finalizada (pedidos antigos sem completed_at: pelo created_at).
  const finished = cashOrders.filter((o) => o.status === "finalizado" && (o.completed_at ? inWin(o.completed_at) : inWin(o.created_at)));
  const pending = cashOrders.filter((o) => o.status !== "finalizado" && inWin(o.created_at));
  const cashSales = r2(finished.reduce((s, o) => s + Number(o.total), 0));
  const withdrawals = r2((moves ?? []).reduce((s, m) => s + Number(m.amount), 0));
  const expected = r2(Number(session.opening_float) + cashSales - withdrawals);

  const byDriver = new Map<string, CashDriverSummary>();
  const ensure = (id: string, name: string | null) => {
    let cur = byDriver.get(id);
    if (!cur) {
      cur = {
        driver_id: id, driver_name: name || "Entregador", orders: 0,
        to_collect: 0, change_out: 0, must_return: 0, settled_at: null,
        deliveries: [], fees_total: 0, fees_paid_at: null, fees_paid_method: null,
      };
      byDriver.set(id, cur);
    }
    return cur;
  };
  for (const o of (orders ?? []).filter((o) => o.mode === "entrega" && o.driver_id && o.status !== "cancelado")) {
    const cur = ensure(o.driver_id as string, o.driver_name);
    const isCash = isCashLabel(o.payment_label);
    const addr = (o.address ?? null) as { neighborhood?: string } | null;
    cur.deliveries.push({
      id: o.id, number: o.number, fee: Number(o.delivery_fee ?? 0), payment_label: o.payment_label, is_cash: isCash,
      neighborhood: o.delivery_neighborhood_snapshot || addr?.neighborhood || null,
    });
    cur.fees_total = r2(cur.fees_total + Number(o.delivery_fee ?? 0));
    if (!isCash) continue;
    const paid = o.no_change ? Number(o.total) : Number(o.change_for ?? o.total);
    cur.orders += 1;
    cur.to_collect = r2(cur.to_collect + Number(o.total));
    cur.change_out = r2(cur.change_out + changeDue(Number(o.total), o.change_for));
    cur.must_return = r2(cur.must_return + Math.max(paid, Number(o.total)));
  }
  for (const s of settlements ?? []) {
    const d = s.driver_id ? byDriver.get(s.driver_id) : null;
    if (!d) continue;
    if (s.kind === "delivery_fees") { d.fees_paid_at = s.settled_at; d.fees_paid_method = s.payment_method; }
    else d.settled_at = s.settled_at;
  }
  return {
    cashSales, withdrawals, expected,
    finishedCount: finished.length,
    pending: pending.map((o) => ({ id: o.id, number: o.number, total: Number(o.total), status: o.status })),
    movements: moves ?? [],
    drivers: [...byDriver.values()],
  };
}

export const getCashShiftStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const r = await tryResolveEffectiveTenantId((context as Ctx).supabase, context.userId);
    if (!r?.tenantId) return { enabled: false, open: false, opened_at: null as string | null };
    try {
      const { requireProPlan } = await import("@/lib/plan-server");
      await requireProPlan(r.tenantId);
    } catch {
      return { enabled: false, open: false, opened_at: null as string | null };
    }
    const sb = await admin();
    const { data } = await sb.from("cash_sessions").select("opened_at")
      .eq("tenant_id", r.tenantId).eq("status", "open").maybeSingle();
    return { enabled: true, open: !!data, opened_at: (data?.opened_at as string | undefined) ?? null };
  });

export const payDriverFees = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ driver_id: z.string().uuid(), method: z.enum(["cash", "pix"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantOf(context as Ctx);
    const sb = await admin();
    const { data: open } = await sb.from("cash_sessions").select("*")
      .eq("tenant_id", tenantId).eq("status", "open").maybeSingle();
    if (!open) throw new Error("Nenhum turno aberto.");
    const calc = await computeSession(tenantId, open);
    const d = calc.drivers.find((x) => x.driver_id === data.driver_id);
    if (!d || d.fees_total <= 0) throw new Error("Nenhuma taxa a pagar para este entregador.");
    if (d.fees_paid_at) throw new Error("Taxas já pagas neste turno.");
    let movementId: string | null = null;
    if (data.method === "cash") {
      const { data: mv, error } = await sb.from("cash_movements").insert({
        session_id: open.id, tenant_id: tenantId, kind: "sangria", amount: d.fees_total,
        reason: `Taxas de entrega — ${d.driver_name}`, created_by: context.userId,
      }).select("id").single();
      if (error) throw new Error(error.message);
      movementId = mv.id;
    }
    const { error } = await sb.from("cash_driver_settlements").insert({
      session_id: open.id, tenant_id: tenantId, driver_id: data.driver_id, driver_name: d.driver_name,
      amount: d.fees_total, settled_by: context.userId, kind: "delivery_fees",
      payment_method: data.method, movement_id: movementId,
    });
    if (error) {
      if (movementId) await sb.from("cash_movements").delete().eq("id", movementId);
      throw new Error(error.message);
    }
    return { ok: true, amount: d.fees_total };
  });

export const undoDriverFees = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ driver_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantOf(context as Ctx);
    const sessionId = await openSessionId(tenantId);
    const sb = await admin();
    const { data: s } = await sb.from("cash_driver_settlements").select("id, movement_id")
      .eq("session_id", sessionId).eq("driver_id", data.driver_id).eq("kind", "delivery_fees").maybeSingle();
    if (!s) return { ok: true };
    await sb.from("cash_driver_settlements").delete().eq("id", s.id);
    if (s.movement_id) await sb.from("cash_movements").delete().eq("id", s.movement_id).eq("session_id", sessionId);
    return { ok: true };
  });

export const getCashOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantOf(context as Ctx);
    const sb = await admin();
    const { data: open } = await sb.from("cash_sessions").select("*")
      .eq("tenant_id", tenantId).eq("status", "open").maybeSingle();
    const { data: history } = await sb.from("cash_sessions")
      .select("id, opened_at, closed_at, opening_float, counted_amount, expected_amount, difference, opened_by_name")
      .eq("tenant_id", tenantId).eq("status", "closed").order("closed_at", { ascending: false }).limit(15);
    if (!open) return { open: null, history: history ?? [] };
    const calc = await computeSession(tenantId, open);
    // Blind close: never expose expected value while the session is open.
    return {
      open: {
        id: open.id, opened_at: open.opened_at, opening_float: Number(open.opening_float),
        opened_by_name: open.opened_by_name,
        movements: calc.movements, drivers: calc.drivers, pending: calc.pending,
        finishedCount: calc.finishedCount,
      },
      history: history ?? [],
    };
  });

export const openCashSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ opening_float: z.number().min(0).max(100000) }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantOf(context as Ctx);
    const sb = await admin();
    const { data: prof } = await sb.from("profiles").select("full_name, email").eq("id", context.userId).maybeSingle();
    const { error } = await sb.from("cash_sessions").insert({
      tenant_id: tenantId, opened_by: context.userId,
      opened_by_name: prof?.full_name || prof?.email || null,
      opening_float: data.opening_float,
    });
    if (error) throw new Error(error.code === "23505" ? "Já existe um turno aberto." : error.message);
    return { ok: true };
  });

async function openSessionId(tenantId: string) {
  const sb = await admin();
  const { data } = await sb.from("cash_sessions").select("id").eq("tenant_id", tenantId).eq("status", "open").maybeSingle();
  if (!data) throw new Error("Nenhum turno aberto.");
  return data.id as string;
}

export const addCashWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ amount: z.number().positive().max(100000), reason: z.string().max(200).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantOf(context as Ctx);
    const sessionId = await openSessionId(tenantId);
    const sb = await admin();
    const { error } = await sb.from("cash_movements").insert({
      session_id: sessionId, tenant_id: tenantId, kind: "sangria",
      amount: data.amount, reason: data.reason || null, created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCashWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantOf(context as Ctx);
    const sessionId = await openSessionId(tenantId);
    const sb = await admin();
    await sb.from("cash_movements").delete().eq("id", data.id).eq("session_id", sessionId);
    return { ok: true };
  });

export const settleDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ driver_id: z.string().uuid(), driver_name: z.string().max(120), amount: z.number().min(0) }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantOf(context as Ctx);
    const sessionId = await openSessionId(tenantId);
    const sb = await admin();
    const { error } = await sb.from("cash_driver_settlements").upsert({
      session_id: sessionId, tenant_id: tenantId, driver_id: data.driver_id,
      driver_name: data.driver_name, amount: data.amount, settled_by: context.userId,
      settled_at: new Date().toISOString(),
    }, { onConflict: "session_id,driver_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const closeCashSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ counted_amount: z.number().min(0).max(1000000) }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantOf(context as Ctx);
    const sb = await admin();
    const { data: open } = await sb.from("cash_sessions").select("*")
      .eq("tenant_id", tenantId).eq("status", "open").maybeSingle();
    if (!open) throw new Error("Nenhum turno aberto.");
    const closedAt = new Date().toISOString();
    const calc = await computeSession(tenantId, { ...open, closed_at: closedAt });
    const difference = r2(data.counted_amount - calc.expected);
    const { error } = await sb.from("cash_sessions").update({
      status: "closed", closed_at: closedAt, closed_by: context.userId,
      counted_amount: data.counted_amount, expected_amount: calc.expected,
      cash_sales: calc.cashSales, withdrawals_total: calc.withdrawals, difference,
    }).eq("id", open.id);
    if (error) throw new Error(error.message);
    return {
      opening_float: Number(open.opening_float), cash_sales: calc.cashSales,
      withdrawals: calc.withdrawals, expected: calc.expected,
      counted: data.counted_amount, difference, pendingCount: calc.pending.length,
    };
  });
