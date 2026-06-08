import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { tryResolveEffectiveTenantId } from "@/lib/active-tenant.server";

const Input = z.object({
  from: z.string().min(8).max(40), // ISO date
  to: z.string().min(8).max(40),
});

export type BasicReports = {
  totalSales: number;
  ordersCount: number;
  averageTicket: number;
  topProducts: { name: string; qty: number; revenue: number }[];
  ordersByStatus: { status: string; count: number }[];
  paymentMethods: { method: string; count: number; total: number }[];
  ordersByType: { mode: string; count: number; total: number }[];
};

export const getBasicReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }): Promise<BasicReports> => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    const tenantId = resolved?.tenantId;
    const empty: BasicReports = {
      totalSales: 0,
      ordersCount: 0,
      averageTicket: 0,
      topProducts: [],
      ordersByStatus: [],
      paymentMethods: [],
      ordersByType: [],
    };
    if (!tenantId) return empty;

    const fromISO = new Date(data.from).toISOString();
    // inclusive end of day
    const toDate = new Date(data.to);
    toDate.setHours(23, 59, 59, 999);
    const toISO = toDate.toISOString();

    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("id, mode, status, total, payment_label, created_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", fromISO)
      .lte("created_at", toISO);
    if (error) throw new Error(error.message);

    const list = orders ?? [];
    const finalized = list.filter((o) => o.status !== "cancelado");

    const totalSales = finalized.reduce((s, o) => s + Number(o.total ?? 0), 0);
    const ordersCount = list.length;
    const averageTicket = finalized.length > 0 ? totalSales / finalized.length : 0;

    const byStatus = new Map<string, number>();
    for (const o of list) {
      byStatus.set(o.status as string, (byStatus.get(o.status as string) ?? 0) + 1);
    }

    const byMode = new Map<string, { count: number; total: number }>();
    for (const o of list) {
      const k = o.mode as string;
      const cur = byMode.get(k) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += Number(o.total ?? 0);
      byMode.set(k, cur);
    }

    const byPay = new Map<string, { count: number; total: number }>();
    for (const o of list) {
      const k = ((o.payment_label as string) || "Não informado").trim() || "Não informado";
      const cur = byPay.get(k) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += Number(o.total ?? 0);
      byPay.set(k, cur);
    }

    let topProducts: BasicReports["topProducts"] = [];
    const ids = list.map((o) => o.id as string);
    if (ids.length) {
      const { data: items } = await supabaseAdmin
        .from("order_items")
        .select("name_snapshot, qty, unit_price")
        .in("order_id", ids);
      const acc = new Map<string, { qty: number; revenue: number }>();
      for (const it of items ?? []) {
        const name = it.name_snapshot as string;
        const qty = Number(it.qty ?? 0);
        const rev = qty * Number(it.unit_price ?? 0);
        const cur = acc.get(name) ?? { qty: 0, revenue: 0 };
        cur.qty += qty;
        cur.revenue += rev;
        acc.set(name, cur);
      }
      topProducts = Array.from(acc.entries())
        .map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 10);
    }

    return {
      totalSales,
      ordersCount,
      averageTicket,
      topProducts,
      ordersByStatus: Array.from(byStatus.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count),
      paymentMethods: Array.from(byPay.entries())
        .map(([method, v]) => ({ method, count: v.count, total: v.total }))
        .sort((a, b) => b.count - a.count),
      ordersByType: Array.from(byMode.entries())
        .map(([mode, v]) => ({ mode, count: v.count, total: v.total }))
        .sort((a, b) => b.count - a.count),
    };
  });
