import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tryResolveEffectiveTenantId } from "@/lib/active-tenant.server";
import type { DbOrder, DbOrderItem, DbHistoryRow } from "@/lib/db-types";

const AddonSchema = z.object({ name: z.string().max(200), price: z.number().min(0) });
const ItemSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  name_snapshot: z.string().min(1).max(200),
  qty: z.number().int().min(1).max(99),
  unit_price: z.number().min(0).max(99999),
  addons: z.array(AddonSchema).max(100).default([]),
  note: z.string().max(500).optional().nullable(),
});

const CreateOrderInput = z.object({
  tenant_slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  customer_name: z.string().min(1).max(120),
  whatsapp: z.string().min(8).max(20),
  mode: z.enum(["entrega", "retirada", "consumo_local"]),
  payment_label: z.string().max(120).default(""),
  change_for: z.number().min(0).max(99999).nullable().optional(),
  no_change: z.boolean().optional(),
  delivery_fee: z.number().min(0).max(9999).default(0),
  delivery_fee_source: z.enum(["none", "single_fee", "neighborhood_by_cep", "neighborhood_by_name", "distance_km"]).nullable().optional(),
  delivery_neighborhood_snapshot: z.string().max(120).nullable().optional(),
  address: z.record(z.string(), z.string()).nullable().optional(),
  table_label: z.string().max(50).nullable().optional(),
  pickup_time: z.string().max(50).nullable().optional(),
  scheduled_for: z.string().datetime().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  coupon_code: z.string().min(2).max(40).regex(/^[A-Z0-9_-]+$/i).nullable().optional(),
  items: z.array(ItemSchema).min(1).max(50),
  idempotency_key: z.string().min(8).max(80).nullable().optional(),
});


export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => CreateOrderInput.parse(d))
  .handler(async ({ data }) => {
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from("tenants").select("id, plan, hours_schedule, scheduling_enabled, scheduling_slot_minutes, scheduling_days_ahead").eq("slug", data.tenant_slug).eq("active", true).maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!tenant) throw new Error("Loja não encontrada");

    const { isTenantBlocked } = await import("@/lib/tenant-access.server");
    if (await isTenantBlocked(tenant.id as string)) {
      throw new Error("Esta loja está temporariamente indisponível.");
    }

    // Plan gating: Presença não aceita pedidos pelo painel; Start tem teto mensal.
    const { getTenantPlanLimits } = await import("@/lib/plan-server");
    const limits = await getTenantPlanLimits(tenant.id as string);
    if (limits.max_orders_per_month === 0) {
      return {
        order: null,
        whatsappOnly: true,
        reason: "Esta loja recebe pedidos apenas pelo WhatsApp. Finalize por lá.",
        customer: null as { id: string; phone: string; token: string } | null,
      };
    }
    if (limits.max_orders_per_month != null) {
      const startOfMonth = new Date();
      startOfMonth.setUTCDate(1);
      startOfMonth.setUTCHours(0, 0, 0, 0);
      const { count } = await supabaseAdmin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .gte("created_at", startOfMonth.toISOString());
      if ((count ?? 0) >= limits.max_orders_per_month) {
        throw new Error(
          `Limite mensal de ${limits.max_orders_per_month} pedidos atingido para o plano atual. Faça upgrade para continuar.`,
        );
      }
    }


    if (data.scheduled_for) {
      if (!tenant.scheduling_enabled) throw new Error("Esta loja não aceita pedidos agendados.");
      const { isValidSlot } = await import("@/lib/scheduling");
      const ok = isValidSlot({
        hoursSchedule: tenant.hours_schedule,
        slotMinutes: tenant.scheduling_slot_minutes,
        daysAhead: tenant.scheduling_days_ahead,
      }, data.scheduled_for);
      if (!ok) throw new Error("Horário de agendamento indisponível. Escolha outro horário.");
    }

    // unit_price já inclui tamanho, sabores e adicionais (computeUnitPrice no carrinho).
    // Os "addons" gravados são apenas o detalhamento do item — não somar de novo.
    const subtotal = data.items.reduce((s, it) => s + it.qty * it.unit_price, 0);


    // Re-validate coupon server-side if provided.
    let discountAmount = 0;
    let appliedCode: string | null = null;
    if (data.coupon_code) {
      const codeUpper = data.coupon_code.toUpperCase();
      const { data: coupon } = await supabaseAdmin
        .from("coupons").select("*").eq("tenant_id", tenant.id).eq("code", codeUpper).maybeSingle();
      if (!coupon) throw new Error("Cupom inválido");
      if (!coupon.active) throw new Error("Cupom desativado");
      const now = new Date();
      if (coupon.valid_from && new Date(coupon.valid_from) > now) throw new Error("Cupom ainda não está válido");
      if (coupon.valid_until && new Date(coupon.valid_until) < now) throw new Error("Cupom expirado");
      if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) throw new Error("Cupom esgotado");
      if (Number(coupon.min_order_total) > subtotal) {
        throw new Error(`Pedido mínimo de R$ ${Number(coupon.min_order_total).toFixed(2)} para este cupom`);
      }
      const value = Number(coupon.discount_value);
      discountAmount = coupon.discount_type === "percent" ? (subtotal * value) / 100 : value;
      discountAmount = Math.min(discountAmount, subtotal);
      discountAmount = Math.round(discountAmount * 100) / 100;
      appliedCode = coupon.code;
    }

    const total = Math.max(0, subtotal - discountAmount) + (data.delivery_fee ?? 0);

    if (data.change_for != null && data.change_for > 0 && !data.no_change) {
      const { isPaymentAllowed, bigBillProblem } = await import("@/lib/cash-change");
      const { data: ps } = await supabaseAdmin.from("store_payment_settings")
        .select("cash_accepts_100, cash_accepts_200").eq("tenant_id", tenant.id).maybeSingle();
      const rules = { accepts100: ps?.cash_accepts_100 ?? true, accepts200: ps?.cash_accepts_200 ?? true };
      if (data.change_for + 0.001 < total) throw new Error("O valor para troco é menor que o total do pedido.");
      if (!isPaymentAllowed(total, data.change_for, rules)) {
        throw new Error(`Esta loja não aceita notas de R$ ${bigBillProblem(total, data.change_for, rules)} para troco.`);
      }
    }

    const reuseExisting = async (existing: Record<string, unknown>) => {
      let customer: { id: string; phone: string; token: string } | null = null;
      const cid = existing.customer_id as string | null;
      if (cid) {
        const { data: c } = await supabaseAdmin.from("customers").select("id, phone, device_token").eq("id", cid).maybeSingle();
        if (c) customer = { id: c.id, phone: c.phone, token: c.device_token };
      }
      return { order: existing as unknown as DbOrder, whatsappOnly: false, reason: null, customer };
    };

    // 1) Idempotência forte: mesmo código de checkout => mesmo pedido.
    if (data.idempotency_key) {
      const { data: byKey } = await supabaseAdmin
        .from("orders").select("*")
        .eq("tenant_id", tenant.id).eq("idempotency_key", data.idempotency_key)
        .maybeSingle();
      if (byKey) return reuseExisting(byKey);
    }

    // 2) Rede de segurança: pedido idêntico ainda não pago nos últimos 2 minutos.
    const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: recentOrder } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("whatsapp", data.whatsapp)
      .eq("total", total)
      .neq("status", "cancelado")
      .neq("payment_status", "approved")
      .gte("created_at", twoMinsAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentOrder) return reuseExisting(recentOrder);

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        tenant_id: tenant.id,
        number: 0, // trigger preenche
        idempotency_key: data.idempotency_key ?? null,
        customer_name: data.customer_name,
        whatsapp: data.whatsapp,
        mode: data.mode,
        payment_label: data.payment_label,
        change_for: data.no_change ? null : (data.change_for ?? null),
        no_change: data.no_change ?? false,
        subtotal,
        delivery_fee: data.delivery_fee ?? 0,
        discount_amount: discountAmount,
        coupon_code: appliedCode,
        total,
        address: data.address ?? null,
        table_label: data.table_label ?? null,
        pickup_time: data.pickup_time ?? null,
        scheduled_for: data.scheduled_for ?? null,
        note: data.note ?? null,
        delivery_fee_source: data.delivery_fee_source ?? null,
        delivery_neighborhood_snapshot: data.delivery_neighborhood_snapshot ?? null,
      })
      .select("*")
      .single();
    if (oErr?.code === "23505" && data.idempotency_key) {
      const { data: byKey } = await supabaseAdmin
        .from("orders").select("*")
        .eq("tenant_id", tenant.id).eq("idempotency_key", data.idempotency_key)
        .maybeSingle();
      if (byKey) return reuseExisting(byKey);
    }
    if (oErr || !order) throw new Error(oErr?.message || "Falha ao criar pedido");

    if (appliedCode) {
      const { data: row } = await supabaseAdmin.from("coupons").select("id,used_count")
        .eq("tenant_id", tenant.id).eq("code", appliedCode).maybeSingle();
      if (row) {
        await supabaseAdmin.from("coupons").update({ used_count: (row.used_count ?? 0) + 1 }).eq("id", row.id);
      }
    }



    const { error: iErr } = await supabaseAdmin
      .from("order_items")
      .insert(data.items.map((it) => ({
        order_id: order.id,
        product_id: it.product_id ?? null,
        name_snapshot: it.name_snapshot,
        qty: it.qty,
        unit_price: it.unit_price,
        addons: it.addons,
        note: it.note ?? null,
      })));
    if (iErr) throw new Error(iErr.message);

    await supabaseAdmin.from("order_status_history").insert({
      order_id: order.id,
      new_status: "novo",
      note: "Pedido criado pelo cliente.",
      changed_by_name: "Sistema",
    });
    {
      const { signalNewOrder } = await import("@/lib/order-signal.server");
      await signalNewOrder(tenant.id, order.id);
    }

    // Universal customer profile (no account): store name/phone/last address.
    let customer: { id: string; phone: string; token: string } | null = null;
    try {
      const { upsertCustomer, saveDefaultAddress } = await import("@/lib/customers.server");
      const addr = (data.address ?? null) as Record<string, string> | null;
      const row = await upsertCustomer({
        phone: data.whatsapp,
        name: data.customer_name,
        cep: addr?.cep ?? null,
        neighborhood: data.delivery_neighborhood_snapshot ?? addr?.neighborhood ?? null,
        address: addr
          ? {
              cep: addr.cep ?? null,
              street: addr.street ?? null,
              number: addr.number ?? null,
              neighborhood: addr.neighborhood ?? null,
              complement: addr.complement ?? null,
              reference: addr.reference ?? null,
            }
          : null,
        countOrder: true,
      });
      if (row) {
        customer = { id: row.id, phone: row.phone, token: row.device_token };
        await supabaseAdmin.from("orders").update({ customer_id: row.id } as never).eq("id", order.id);
        if (addr) {
          // GPS é específico do pedido: não vira endereço padrão do cliente.
          const { lat: _lat, lng: _lng, gps_url: _gps, ...plainAddr } = addr;
          await saveDefaultAddress(row.id, plainAddr as never);
        }
      }
    } catch {
      /* profile persistence must never block the order */
    }

    return { order: order as unknown as DbOrder, whatsappOnly: false, reason: null, customer };
  });

async function loadOrderBundle(orderId: string) {
  const [{ data: order }, { data: items }, { data: history }] = await Promise.all([
    supabaseAdmin.from("orders").select("*").eq("id", orderId).maybeSingle(),
    supabaseAdmin.from("order_items").select("*").eq("order_id", orderId),
    supabaseAdmin.from("order_status_history").select("*")
      .eq("order_id", orderId).order("created_at", { ascending: true }),
  ]);
  if (!order) return null;
  return {
    order: { ...(order as unknown as DbOrder), items: (items ?? []) as unknown as DbOrderItem[] },
    history: (history ?? []) as unknown as DbHistoryRow[],
  };
}

const GetOrderInput = z.object({ id: z.string().uuid() });

export const getOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => GetOrderInput.parse(d))
  .handler(async ({ data }) => {
    const bundle = await loadOrderBundle(data.id);
    return bundle ?? { order: null, history: [] as DbHistoryRow[] };
  });

const GetByNumberInput = z.object({
  tenant_slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  number: z.number().int().positive(),
});

export const getOrderByNumber = createServerFn({ method: "POST" })
  .inputValidator((d) => GetByNumberInput.parse(d))
  .handler(async ({ data }) => {
    const { data: tenant } = await supabaseAdmin
      .from("tenants").select("id").eq("slug", data.tenant_slug).maybeSingle();
    if (!tenant) return { order: null, history: [] as DbHistoryRow[] };
    const { data: order } = await supabaseAdmin
      .from("orders").select("id")
      .eq("tenant_id", tenant.id).eq("number", data.number).maybeSingle();
    if (!order) return { order: null, history: [] as DbHistoryRow[] };
    const bundle = await loadOrderBundle(order.id);
    return bundle ?? { order: null, history: [] as DbHistoryRow[] };
  });

// ========= Admin =========

export const listOrdersForMyTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) return { orders: [] };

    const { data: orders, error } = await supabase
      .from("orders").select("*")
      .eq("tenant_id", resolved.tenantId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const ids = (orders ?? []).map((o) => o.id);
    const { data: items } = ids.length
      ? await supabase.from("order_items").select("*").in("order_id", ids)
      : { data: [] as DbOrderItem[] };

    const itemsByOrder = new Map<string, DbOrderItem[]>();
    for (const it of (items ?? []) as unknown as DbOrderItem[]) {
      const arr = itemsByOrder.get(it.order_id) ?? [];
      arr.push(it);
      itemsByOrder.set(it.order_id, arr);
    }
    const full: DbOrder[] = ((orders ?? []) as unknown as DbOrder[]).map((o) => ({
      ...o, items: itemsByOrder.get(o.id) ?? [],
    }));
    return { orders: full };
  });

const UpdateStatusInput = z.object({
  order_id: z.string().uuid(),
  new_status: z.enum(["novo","aceito","preparo","saiu_entrega","pronto_retirada","servido","finalizado","cancelado"]),
  note: z.string().max(500).optional(),
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpdateStatusInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prev } = await supabase.from("orders").select("status").eq("id", data.order_id).maybeSingle();
    const patch: Record<string, string | null> = { status: data.new_status };
    if (data.new_status === "aceito") patch.accepted_at = new Date().toISOString();
    if (data.new_status === "finalizado") patch.completed_at = new Date().toISOString();
    if (data.new_status === "cancelado") {
      patch.cancelled_at = new Date().toISOString();
      patch.cancel_reason = data.note ?? null;
    }
    const { error } = await supabase.from("orders").update(patch as never).eq("id", data.order_id);
    if (error) throw new Error(error.message);

    await supabase.from("order_status_history").insert({
      order_id: data.order_id,
      previous_status: prev?.status ?? null,
      new_status: data.new_status,
      note: data.note ?? null,
      changed_by: userId,
    });
    return { ok: true };
  });

export const OFFLINE_PAYMENT_LABELS = {
  dinheiro: "Pagar na entrega · Dinheiro em Espécie",
  credito: "Pagar na entrega · Maquininha (Crédito)",
  debito: "Pagar na entrega · Maquininha (Débito)",
  pix_manual: "Pix manual (chave da loja)",
} as const;

export const updateOrderPaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      order_id: z.string().uuid(),
      method: z.enum(["dinheiro", "credito", "debito", "pix_manual"]),
      change_for: z.number().min(0).max(99999).nullable().optional(),
      no_change: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // RLS restricts to tenant staff
    const { data: o } = await supabase.from("orders")
      .select("id, tenant_id, status, total, payment_label, payment_status, mp_payment_id")
      .eq("id", data.order_id).maybeSingle();
    if (!o) throw new Error("Pedido não encontrado.");
    if (o.status === "cancelado") throw new Error("Pedido cancelado não pode ter o pagamento alterado.");
    if (o.mp_payment_id && o.payment_status === "approved") throw new Error("Pedido já pago online pelo Mercado Pago — não é possível alterar.");
    const { data: allowed } = await supabase.rpc("has_tenant_role", {
      _user_id: userId, _tenant_id: o.tenant_id, _roles: ["owner", "admin", "staff"],
    });
    if (!allowed) throw new Error("Acesso negado.");

    const total = Number(o.total);
    let change_for: number | null = null;
    let no_change = false;
    if (data.method === "dinheiro") {
      const { isPaymentAllowed } = await import("@/lib/cash-change");
      const { data: ps } = await supabase.from("store_payment_settings")
        .select("cash_accepts_100, cash_accepts_200").eq("tenant_id", o.tenant_id).maybeSingle();
      const rules = { accepts100: ps?.cash_accepts_100 ?? true, accepts200: ps?.cash_accepts_200 ?? true };
      if (data.no_change || !data.change_for) { no_change = true; change_for = total; }
      else {
        if (!isPaymentAllowed(total, data.change_for, rules)) throw new Error("Valor de troco inválido para esta loja.");
        change_for = data.change_for;
      }
    }
    const label = OFFLINE_PAYMENT_LABELS[data.method];
    const { error } = await supabase.from("orders").update({
      payment_label: label, change_for, no_change,
      payment_status: o.payment_status === "approved" ? "approved" : "manual",
    } as never).eq("id", o.id);
    if (error) throw new Error(error.message);
    const { data: prof } = await supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
    await supabase.from("order_status_history").insert({
      order_id: o.id, previous_status: o.status, new_status: o.status, changed_by: userId,
      changed_by_name: prof?.full_name || prof?.email || null,
      note: `Pagamento alterado de "${o.payment_label || "—"}" para "${label}"`,
    });
    return { ok: true, payment_label: label };
  });

const ManualOrderInput = z.object({
  customer_name: z.string().min(1).max(120),
  whatsapp: z.string().max(20).optional().nullable(),
  mode: z.enum(["entrega", "retirada", "consumo_local"]),
  payment_label: z.string().max(120).default(""),
  payment_status: z.enum(["pending", "approved", "manual"]).default("manual"),
  initial_status: z.enum(["novo", "preparo"]).default("preparo"),
  change_for: z.number().min(0).max(99999).nullable().optional(),
  no_change: z.boolean().optional(),
  delivery_fee: z.number().min(0).max(9999).default(0),
  address: z.record(z.string(), z.string()).nullable().optional(),
  table_label: z.string().max(50).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  items: z.array(ItemSchema).min(1).max(50),
});

export const createManualOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ManualOrderInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { tenantId } = await tryResolveEffectiveTenantId(supabase, userId) ?? {};
    if (!tenantId) throw new Error("Acesso negado: você não tem uma loja selecionada.");

    const subtotal = data.items.reduce((s, it) => s + it.qty * it.unit_price, 0);
    const total = subtotal + data.delivery_fee;

    // A chamada usa o cliente administrativo para gravar pedido
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        tenant_id: tenantId,
        number: 0, // trigger preenche
        customer_id: null,
        status: "preparo",
        accepted_at: new Date().toISOString(),
        source: "pdv",
        payment_status: data.payment_status,
        customer_name: data.customer_name,
        whatsapp: data.whatsapp || "",
        mode: data.mode,
        payment_label: data.payment_label,
        change_for: data.no_change ? null : (data.change_for ?? null),
        no_change: data.no_change ?? false,
        subtotal,
        delivery_fee: data.delivery_fee,
        discount_amount: 0,
        total,
        address: data.address ?? null,
        table_label: data.table_label ?? null,
        note: data.note ?? null,
      })
      .select("*")
      .single();

    if (oErr || !order) throw new Error(oErr?.message || "Falha ao criar pedido no PDV");

    const { data: insertedItems, error: iErr } = await supabaseAdmin
      .from("order_items")
      .insert(data.items.map((it) => ({
        order_id: order.id,
        product_id: it.product_id ?? null,
        name_snapshot: it.name_snapshot,
        qty: it.qty,
        unit_price: it.unit_price,
        addons: it.addons,
        note: it.note ?? null,
      })))
      .select("*");
    if (iErr) throw new Error(iErr.message);

    // Timeline entry
    await supabaseAdmin.from("order_status_history").insert({
      order_id: order.id,
      previous_status: null,
      new_status: "preparo",
      note: "Pedido lançado via PDV",
      changed_by: userId,
    });

    return {
      orderId: order.id,
      displayId: order.number,
      order: { ...(order as unknown as DbOrder), items: (insertedItems ?? []) as unknown as DbOrderItem[] },
    };
  });

