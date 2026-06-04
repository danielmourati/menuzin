import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { tryResolveEffectiveTenantId } from "@/lib/active-tenant.server";
import { computeStoreOpen } from "@/lib/store-hours";


const Input = z.object({ days: z.number().int().min(1).max(90).default(7) });

export type SalesPoint = { day: string; vendas: number; pedidos: number };
export type ModeSlice = { name: string; value: number };
export type TopProduct = { name: string; vendas: number };

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MODE_LABELS: Record<string, string> = {
  entrega: "Entrega",
  retirada: "Retirada",
  consumo_local: "Consumo local",
};

export const getMyTenantAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    const tenantId = resolved?.tenantId;
    if (!tenantId) {
      return {
        salesByDay: [] as SalesPoint[],
        ordersByMode: [] as ModeSlice[],
        topProducts: [] as TopProduct[],
        pendingCount: 0,
        todayOrdersCount: 0,
        todayRevenue: 0,
        avgTicket: 0,
        monthOrdersCount: 0,
        productsActive: 0,
        monthRevenue: 0,
        storeOpen: false,
      };
    }

    const sinceDate = new Date();
    sinceDate.setHours(0, 0, 0, 0);
    sinceDate.setDate(sinceDate.getDate() - (data.days - 1));
    const sinceISO = sinceDate.toISOString();

    const monthStart = new Date();
    monthStart.setHours(0, 0, 0, 0);
    monthStart.setDate(monthStart.getDate() - 30);

    // 1) Pedidos do tenant (use admin client porque a query inclui agregações)
    const { data: orders, error: oErr } = await supabaseAdmin
      .from("orders").select("id, mode, status, total, created_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", monthStart.toISOString());
    if (oErr) throw new Error(oErr.message);

    const list = orders ?? [];
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    // Salas por dia (últimos N dias)
    const buckets = new Map<string, SalesPoint>();
    for (let i = 0; i < data.days; i++) {
      const d = new Date(sinceDate); d.setDate(d.getDate() + i);
      buckets.set(dayKey(d), { day: DAY_LABELS[d.getDay()], vendas: 0, pedidos: 0 });
    }
    for (const o of list) {
      const d = new Date(o.created_at as string);
      const k = dayKey(d);
      const slot = buckets.get(k);
      if (slot) {
        slot.pedidos += 1;
        slot.vendas += Number(o.total ?? 0);
      }
    }
    const salesByDay = Array.from(buckets.values());

    // Por modalidade
    const modeCounts = new Map<string, number>();
    for (const o of list) {
      modeCounts.set(o.mode as string, (modeCounts.get(o.mode as string) ?? 0) + 1);
    }
    const ordersByMode: ModeSlice[] = Array.from(modeCounts.entries())
      .map(([k, v]) => ({ name: MODE_LABELS[k] ?? k, value: v }));

    // Top produtos (últimos 30d)
    const orderIds = list.map((o) => o.id as string);
    let topProducts: TopProduct[] = [];
    if (orderIds.length) {
      const { data: items } = await supabaseAdmin
        .from("order_items").select("name_snapshot, qty").in("order_id", orderIds);
      const byName = new Map<string, number>();
      for (const it of items ?? []) {
        byName.set(it.name_snapshot as string, (byName.get(it.name_snapshot as string) ?? 0) + Number(it.qty ?? 0));
      }
      topProducts = Array.from(byName.entries())
        .map(([name, vendas]) => ({ name, vendas }))
        .sort((a, b) => b.vendas - a.vendas)
        .slice(0, 5);
    }

    const pendingCount = list.filter((o) => ["novo", "aceito", "preparo"].includes(o.status as string)).length;
    const todayOrders = list.filter((o) => new Date(o.created_at as string) >= todayStart);
    const todayOrdersCount = todayOrders.length;
    const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);
    const monthRevenue = list.filter((o) => o.status === "finalizado").reduce((s, o) => s + Number(o.total ?? 0), 0);
    const monthOrdersCount = list.length;
    const avgTicket = monthOrdersCount > 0 ? monthRevenue / Math.max(1, list.filter((o) => o.status === "finalizado").length) : 0;

    // Produtos ativos
    const { count: productsActive } = await supabaseAdmin
      .from("products").select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId).eq("available", true);

    const { data: tenant } = await supabaseAdmin
      .from("tenants").select("open, open_mode, hours_schedule").eq("id", tenantId).maybeSingle();


    return {
      salesByDay,
      ordersByMode,
      topProducts,
      pendingCount,
      todayOrdersCount,
      todayRevenue,
      avgTicket,
      monthOrdersCount,
      productsActive: productsActive ?? 0,
      monthRevenue,
      storeOpen: computeStoreOpen({
        openMode: (tenant as { open_mode?: "auto" | "open" | "closed" } | null)?.open_mode,
        hoursSchedule: (tenant as { hours_schedule?: unknown } | null)?.hours_schedule,
        legacyOpen: tenant?.open,
      }).open,

    };
  });

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
