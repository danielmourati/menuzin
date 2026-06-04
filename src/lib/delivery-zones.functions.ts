import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tryResolveEffectiveTenantId } from "@/lib/active-tenant.server";

export type DeliveryZoneRow = {
  id: string;
  tenant_id: string;
  neighborhood: string;
  fee: number;
  min_order_total: number;
  estimated_minutes: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export const listMyDeliveryZones = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) return { zones: [] as DeliveryZoneRow[] };
    const { data, error } = await supabase
      .from("delivery_zones")
      .select("*")
      .eq("tenant_id", resolved.tenantId)
      .order("neighborhood", { ascending: true });
    if (error) throw new Error(error.message);
    return { zones: (data ?? []) as unknown as DeliveryZoneRow[] };
  });

const UpsertInput = z.object({
  id: z.string().uuid().nullable().optional(),
  neighborhood: z.string().min(1).max(120),
  fee: z.number().min(0).max(9999),
  min_order_total: z.number().min(0).max(999999).default(0),
  estimated_minutes: z.number().int().min(1).max(600).nullable().optional(),
  active: z.boolean().default(true),
});

export const upsertDeliveryZone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpsertInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) throw new Error("Loja não encontrada");
    const payload = {
      tenant_id: resolved.tenantId,
      neighborhood: data.neighborhood.trim(),
      fee: data.fee,
      min_order_total: data.min_order_total,
      estimated_minutes: data.estimated_minutes ?? null,
      active: data.active,
    };
    if (data.id) {
      const { error } = await supabase.from("delivery_zones").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await supabase.from("delivery_zones").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DeleteInput = z.object({ id: z.string().uuid() });
export const deleteDeliveryZone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => DeleteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("delivery_zones").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Public: list active zones for a store slug — used by the cart.
const PublicInput = z.object({
  tenant_slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
});

export type PublicDeliveryZone = {
  id: string;
  neighborhood: string;
  fee: number;
  min_order_total: number;
  estimated_minutes: number | null;
};

export const listPublicDeliveryZones = createServerFn({ method: "POST" })
  .inputValidator((d) => PublicInput.parse(d))
  .handler(async ({ data }): Promise<{ zones: PublicDeliveryZone[] }> => {
    const { data: tenant } = await supabaseAdmin
      .from("tenants").select("id").eq("slug", data.tenant_slug).eq("active", true).maybeSingle();
    if (!tenant) return { zones: [] };
    const { data: zones } = await supabaseAdmin
      .from("delivery_zones")
      .select("id, neighborhood, fee, min_order_total, estimated_minutes")
      .eq("tenant_id", tenant.id)
      .eq("active", true)
      .order("neighborhood", { ascending: true });
    return {
      zones: (zones ?? []).map((z) => ({
        id: z.id,
        neighborhood: z.neighborhood,
        fee: Number(z.fee),
        min_order_total: Number(z.min_order_total),
        estimated_minutes: z.estimated_minutes,
      })),
    };
  });
