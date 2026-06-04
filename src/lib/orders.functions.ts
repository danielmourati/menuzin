import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tryResolveEffectiveTenantId } from "@/lib/active-tenant.server";
import type { DbOrder, DbOrderItem, DbHistoryRow } from "@/lib/db-types";

const AddonSchema = z.object({ name: z.string().max(120), price: z.number().min(0) });
const ItemSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  name_snapshot: z.string().min(1).max(200),
  qty: z.number().int().min(1).max(99),
  unit_price: z.number().min(0).max(99999),
  addons: z.array(AddonSchema).max(20).default([]),
  note: z.string().max(500).optional().nullable(),
});

const CreateOrderInput = z.object({
  tenant_slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  customer_name: z.string().min(1).max(120),
  whatsapp: z.string().min(8).max(20),
  mode: z.enum(["entrega", "retirada", "consumo_local"]),
  payment_label: z.string().max(120).default(""),
  change_for: z.number().min(0).max(99999).nullable().optional(),
  delivery_fee: z.number().min(0).max(9999).default(0),
  address: z.record(z.string(), z.string()).nullable().optional(),
  table_label: z.string().max(50).nullable().optional(),
  pickup_time: z.string().max(50).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  coupon_code: z.string().min(2).max(40).regex(/^[A-Z0-9_-]+$/i).nullable().optional(),
  items: z.array(ItemSchema).min(1).max(50),
});


export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => CreateOrderInput.parse(d))
  .handler(async ({ data }) => {
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from("tenants").select("id").eq("slug", data.tenant_slug).eq("active", true).maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!tenant) throw new Error("Loja não encontrada");

    const subtotal = data.items.reduce((s, it) => {
      const addonsSum = it.addons.reduce((a, x) => a + x.price, 0);
      return s + it.qty * (it.unit_price + addonsSum);
    }, 0);
    const total = subtotal + (data.delivery_fee ?? 0);

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        tenant_id: tenant.id,
        number: 0, // trigger preenche
        customer_name: data.customer_name,
        whatsapp: data.whatsapp,
        mode: data.mode,
        payment_label: data.payment_label,
        change_for: data.change_for ?? null,
        subtotal,
        delivery_fee: data.delivery_fee ?? 0,
        total,
        address: data.address ?? null,
        table_label: data.table_label ?? null,
        pickup_time: data.pickup_time ?? null,
        note: data.note ?? null,
      })
      .select("*")
      .single();
    if (oErr || !order) throw new Error(oErr?.message || "Falha ao criar pedido");

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

    return { order: order as unknown as DbOrder };
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
