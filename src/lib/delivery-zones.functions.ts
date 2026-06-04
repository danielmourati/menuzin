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
  cep_start: string | null;
  cep_end: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const cepDigits = (v?: string | null) => (v ?? "").replace(/\D/g, "");
const normalizeName = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

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

const CepSchema = z
  .string()
  .transform((v) => cepDigits(v))
  .refine((v) => v === "" || v.length === 8, { message: "CEP deve ter 8 dígitos" })
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const UpsertInput = z.object({
  id: z.string().uuid().nullable().optional(),
  neighborhood: z.string().min(1).max(120),
  fee: z.number().min(0).max(9999),
  min_order_total: z.number().min(0).max(999999).default(0),
  estimated_minutes: z.number().int().min(1).max(600).nullable().optional(),
  cep_start: CepSchema,
  cep_end: CepSchema,
  active: z.boolean().default(true),
}).refine(
  (d) => !d.cep_start || !d.cep_end || d.cep_start <= d.cep_end,
  { message: "CEP inicial deve ser menor ou igual ao CEP final", path: ["cep_end"] },
);

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
      cep_start: data.cep_start ?? null,
      cep_end: data.cep_end ?? null,
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
  cep_start: string | null;
  cep_end: string | null;
};

export const listPublicDeliveryZones = createServerFn({ method: "POST" })
  .inputValidator((d) => PublicInput.parse(d))
  .handler(async ({ data }): Promise<{ zones: PublicDeliveryZone[] }> => {
    const { data: tenant } = await supabaseAdmin
      .from("tenants").select("id").eq("slug", data.tenant_slug).eq("active", true).maybeSingle();
    if (!tenant) return { zones: [] };
    const { data: zones } = await supabaseAdmin
      .from("delivery_zones")
      .select("id, neighborhood, fee, min_order_total, estimated_minutes, cep_start, cep_end")
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
        cep_start: z.cep_start ?? null,
        cep_end: z.cep_end ?? null,
      })),
    };
  });

// ---- Public delivery-fee resolver ----

export type DeliveryFeeResolution = {
  mode: "none" | "single" | "neighborhood";
  available: boolean;
  fee: number;
  source: "none" | "single_fee" | "neighborhood_by_cep" | "neighborhood_by_name" | null;
  neighborhood: string | null;
  min_order_total: number;
  estimated_minutes: number | null;
  message: string | null;
};

const ResolveInput = z.object({
  tenant_slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  cep: z.string().max(20).optional().nullable(),
  neighborhood: z.string().max(120).optional().nullable(),
});

export const resolveDeliveryFee = createServerFn({ method: "POST" })
  .inputValidator((d) => ResolveInput.parse(d))
  .handler(async ({ data }): Promise<DeliveryFeeResolution> => {
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, delivery_mode, delivery_fee")
      .eq("slug", data.tenant_slug)
      .eq("active", true)
      .maybeSingle();

    if (!tenant) {
      return {
        mode: "single", available: false, fee: 0, source: null,
        neighborhood: null, min_order_total: 0, estimated_minutes: null,
        message: "Loja não encontrada",
      };
    }

    const mode = (tenant.delivery_mode ?? "single") as "none" | "single" | "neighborhood";

    if (mode === "none") {
      return {
        mode, available: true, fee: 0, source: "none",
        neighborhood: null, min_order_total: 0, estimated_minutes: null, message: null,
      };
    }

    if (mode === "single") {
      return {
        mode, available: true, fee: Number(tenant.delivery_fee ?? 0), source: "single_fee",
        neighborhood: null, min_order_total: 0, estimated_minutes: null, message: null,
      };
    }

    // mode === 'neighborhood'
    const { data: zones } = await supabaseAdmin
      .from("delivery_zones")
      .select("neighborhood, fee, min_order_total, estimated_minutes, cep_start, cep_end")
      .eq("tenant_id", tenant.id)
      .eq("active", true);

    const list = zones ?? [];
    const cep = cepDigits(data.cep);

    // 1) CEP range match
    if (cep.length === 8) {
      const byCep = list.find((z) => z.cep_start && z.cep_end && cep >= z.cep_start && cep <= z.cep_end);
      if (byCep) {
        return {
          mode, available: true, fee: Number(byCep.fee),
          source: "neighborhood_by_cep",
          neighborhood: byCep.neighborhood,
          min_order_total: Number(byCep.min_order_total),
          estimated_minutes: byCep.estimated_minutes,
          message: null,
        };
      }
    }

    // 2) neighborhood name match
    const name = normalizeName(data.neighborhood ?? "");
    if (name) {
      const byName = list.find((z) => normalizeName(z.neighborhood) === name);
      if (byName) {
        return {
          mode, available: true, fee: Number(byName.fee),
          source: "neighborhood_by_name",
          neighborhood: byName.neighborhood,
          min_order_total: Number(byName.min_order_total),
          estimated_minutes: byName.estimated_minutes,
          message: null,
        };
      }
    }

    return {
      mode, available: false, fee: 0, source: null,
      neighborhood: null, min_order_total: 0, estimated_minutes: null,
      message: "Ainda não entregamos neste bairro. Verifique o endereço ou entre em contato com a loja.",
    };
  });
