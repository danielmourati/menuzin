import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveEffectiveTenantId } from "@/lib/active-tenant.server";
import type { Database } from "@/integrations/supabase/types";

const TZ = "America/Sao_Paulo";

function nowInSP(): { weekday: number; hhmm: string; iso: string } {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekday = wdMap[fmt.find((p) => p.type === "weekday")?.value ?? "Sun"] ?? 0;
  const hh = fmt.find((p) => p.type === "hour")?.value ?? "00";
  const mm = fmt.find((p) => p.type === "minute")?.value ?? "00";
  return { weekday, hhmm: `${hh}:${mm}`, iso: now.toISOString() };
}

export type ActivePromoModal = {
  id: string;
  imageUrl: string;
  ctaLabel: string;
  product: { id: string; name: string } | null;
} | null;

export const getActivePromoModal = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<ActivePromoModal> => {
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: row } = await sb
      .from("promo_modals")
      .select("id,image_url,cta_label,product_id,schedule_mode,starts_at,ends_at,weekdays,time_start,time_end,enabled")
      .eq("tenant_id", data.tenantId)
      .maybeSingle();
    if (!row || !row.enabled || !row.image_url) return null;

    const { weekday, hhmm, iso } = nowInSP();
    const active = (() => {
      if (row.schedule_mode === "window") {
        if (!row.starts_at || !row.ends_at) return false;
        return row.starts_at <= iso && iso <= row.ends_at;
      }
      if (row.schedule_mode === "recurring") {
        const wds = (row.weekdays ?? []) as number[];
        if (!wds.includes(weekday)) return false;
        const ts = (row.time_start ?? "").slice(0, 5);
        const te = (row.time_end ?? "").slice(0, 5);
        if (!ts || !te) return false;
        if (ts <= te) return hhmm >= ts && hhmm <= te;
        return hhmm >= ts || hhmm <= te;
      }
      return false;
    })();
    if (!active) return null;

    let product: { id: string; name: string } | null = null;
    if (row.product_id) {
      const { data: p } = await sb
        .from("products")
        .select("id,name,available")
        .eq("id", row.product_id)
        .maybeSingle();
      if (p && p.available !== false) product = { id: p.id, name: p.name };
    }

    return {
      id: row.id,
      imageUrl: row.image_url,
      ctaLabel: row.cta_label ?? "EU QUERO!",
      product,
    };
  });

export const getPromoModalAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => d)
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { tenantId } = await resolveEffectiveTenantId(supabase, userId);
    const { data, error } = await supabase
      .from("promo_modals")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { row: data, tenantId };
  });

const UpsertInput = z.object({
  enabled: z.boolean(),
  image_url: z.string().url().or(z.literal("")),
  cta_label: z.string().min(1).max(40),
  product_id: z.string().uuid().nullable(),
  schedule_mode: z.enum(["window", "recurring"]),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  weekdays: z.array(z.number().int().min(0).max(6)).nullable().optional(),
  time_start: z.string().nullable().optional(),
  time_end: z.string().nullable().optional(),
});

export const upsertPromoModal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpsertInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { tenantId } = await resolveEffectiveTenantId(supabase, userId);

    if (data.enabled && !data.image_url) {
      throw new Error("Envie uma imagem antes de ativar o modal.");
    }

    const payload = {
      tenant_id: tenantId,
      enabled: data.enabled,
      image_url: data.image_url,
      cta_label: data.cta_label,
      product_id: data.product_id,
      schedule_mode: data.schedule_mode,
      starts_at: data.schedule_mode === "window" ? data.starts_at ?? null : null,
      ends_at: data.schedule_mode === "window" ? data.ends_at ?? null : null,
      weekdays: data.schedule_mode === "recurring" ? data.weekdays ?? null : null,
      time_start: data.schedule_mode === "recurring" ? data.time_start ?? null : null,
      time_end: data.schedule_mode === "recurring" ? data.time_end ?? null : null,
    };

    const { error } = await supabase
      .from("promo_modals")
      .upsert(payload, { onConflict: "tenant_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePromoModal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => d)
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { tenantId } = await resolveEffectiveTenantId(supabase, userId);
    const { error } = await supabase.from("promo_modals").delete().eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
