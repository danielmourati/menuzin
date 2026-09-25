import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tryResolveEffectiveTenantId } from "@/lib/active-tenant.server";

// Cache em memória das distâncias (evita cobranças repetidas no Google)
const distanceCache = new Map<string, { meters: number; expires: number }>();

export type DeliveryZoneRow = {
  id: string;
  tenant_id: string;
  neighborhood: string;
  fee: number;
  min_order_total: number;
  estimated_minutes: number | null;
  cep_start: string | null;
  cep_end: string | null;
  city: string | null;
  uf: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const cepDigits = (v?: string | null) => (v ?? "").replace(/\D/g, "");

export const cleanNeighborhoodName = (v?: string | null) =>
  (v ?? "").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();

const normalizeName = (v: string) =>
  cleanNeighborhoodName(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

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
    const zones = ((data ?? []) as unknown as DeliveryZoneRow[]).map((z) => ({
      ...z,
      neighborhood: cleanNeighborhoodName(z.neighborhood),
    }));
    return { zones };
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
  city: z.string().max(80).nullable().optional(),
  uf: z.string().max(2).nullable().optional(),
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
    const { requirePlanAtLeast } = await import("@/lib/plan-server");
    await requirePlanAtLeast(resolved.tenantId, "pro");

    const baseName = cleanNeighborhoodName(data.neighborhood);
    const targetNormalized = normalizeName(baseName);

    // Consulta bairros existentes para desambiguar e garantir compatibilidade com a constraint UNIQUE do banco
    const { data: existingZones } = await supabase
      .from("delivery_zones")
      .select("id, neighborhood")
      .eq("tenant_id", resolved.tenantId);

    const otherZones = (existingZones ?? []).filter((z) => z.id !== data.id);
    const matchingCount = otherZones.filter(
      (z) => normalizeName(z.neighborhood) === targetNormalized,
    ).length;

    // Aplica sufixo invisível (Zero-Width Space) para contornar a constraint UNIQUE (tenant_id, neighborhood) legada
    const disambiguatedName = baseName + "\u200B".repeat(matchingCount);

    const payload = {
      tenant_id: resolved.tenantId,
      neighborhood: disambiguatedName,
      fee: data.fee,
      min_order_total: data.min_order_total,
      estimated_minutes: data.estimated_minutes ?? null,
      cep_start: data.cep_start ?? null,
      cep_end: data.cep_end ?? null,
      city: data.city?.trim() || null,
      uf: data.uf?.trim().toUpperCase() || null,
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
        neighborhood: cleanNeighborhoodName(z.neighborhood),
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
  mode: "none" | "single" | "neighborhood" | "km";
  available: boolean;
  fee: number;
  source: "none" | "single_fee" | "neighborhood_by_cep" | "neighborhood_by_name" | "distance_km" | null;
  neighborhood: string | null;
  min_order_total: number;
  estimated_minutes: number | null;
  message: string | null;
};

const ResolveInput = z.object({
  tenant_slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  cep: z.string().max(20).optional().nullable(),
  neighborhood: z.string().max(120).optional().nullable(),
  zone_id: z.string().uuid().optional().nullable(),
  street: z.string().max(200).optional().nullable(),
  number: z.string().max(50).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  state: z.string().max(40).optional().nullable(),
});

export const resolveDeliveryFee = createServerFn({ method: "POST" })
  .inputValidator((d) => ResolveInput.parse(d))
  .handler(async ({ data }): Promise<DeliveryFeeResolution> => {
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, delivery_mode, delivery_fee, delivery_base_km, delivery_fee_per_km, delivery_max_km, address, city, state")
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

    const mode = (tenant.delivery_mode ?? "single") as "none" | "single" | "neighborhood" | "km";

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

    if (mode === "km") {
      if (!data.street || !data.number) {
        return {
          mode, available: false, fee: 0, source: null,
          neighborhood: null, min_order_total: 0, estimated_minutes: null,
          message: "Preencha a rua e o número para calcular a taxa de entrega",
        };
      }
      const destStr = `${data.street}, ${data.number}, ${data.neighborhood || ""}, ${data.city || ""}, ${data.state || ""}`.trim().replace(/,\s*,/g, ",");
      const origStr = `${tenant.address}, ${tenant.city}, ${tenant.state}`.trim();
      
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.error("GOOGLE_MAPS_API_KEY não configurada.");
        return {
          mode, available: true, fee: Number(tenant.delivery_fee ?? 0), source: "single_fee",
          neighborhood: null, min_order_total: 0, estimated_minutes: null,
          message: "Não foi possível calcular a distância, aplicando taxa base.",
        };
      }

      try {
        const cacheKey = `${tenant.id}|${destStr.toLowerCase().replace(/\s+/g, " ")}`;
        const cached = distanceCache.get(cacheKey);
        let meters: number | null = null;
        let matrix: any = null;
        if (cached && cached.expires > Date.now()) {
          meters = cached.meters;
        } else {
          const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origStr)}&destinations=${encodeURIComponent(destStr)}&region=br&language=pt-BR&key=${apiKey}`;
          const res = await fetch(url);
          matrix = await res.json() as any;
          if (matrix.status === "REQUEST_DENIED" || matrix.error_message) {
            console.error(`Google Distance Matrix recusou [${matrix.status}]: ${matrix.error_message ?? "sem detalhes"} — verifique se a Distance Matrix API está ativada e se a chave não tem restrição por referenciador HTTP.`);
          }
          if (matrix.status === "OK" && matrix.rows?.[0]?.elements?.[0]?.status === "OK") {
            meters = matrix.rows[0].elements[0].distance.value as number;
            distanceCache.set(cacheKey, { meters, expires: Date.now() + 10 * 60 * 1000 });
            if (distanceCache.size > 500) distanceCache.delete(distanceCache.keys().next().value as string);
          }
        }

        if (meters !== null) {
          const km = meters / 1000;
          const baseKm = Number(tenant.delivery_base_km ?? 0);
          const feePerKm = Number(tenant.delivery_fee_per_km ?? 0);
          const maxKm = tenant.delivery_max_km ? Number(tenant.delivery_max_km) : null;

          if (maxKm !== null && maxKm > 0 && km > maxKm) {
            return {
              mode, available: false, fee: 0, source: null,
              neighborhood: null, min_order_total: 0, estimated_minutes: null,
              message: `Desculpe, só entregamos até ${maxKm}km. Você está a ${km.toFixed(1)}km.`,
            };
          }

          let extraKm = Math.max(0, km - baseKm);
          extraKm = Math.ceil(extraKm); // Arredonda pra cima como pedido
          const totalFee = Number(tenant.delivery_fee ?? 0) + (extraKm * feePerKm);

          return {
            mode, available: true, fee: totalFee, source: "distance_km",
            neighborhood: data.neighborhood || null, min_order_total: 0, estimated_minutes: null, message: null,
          };
        } else {
          console.warn("Google Maps Matrix falhou ou endereço não encontrado:", matrix);
          return {
            mode, available: true, fee: Number(tenant.delivery_fee ?? 0), source: "distance_km",
            neighborhood: data.neighborhood || null, min_order_total: 0, estimated_minutes: null,
            message: "Endereço exato não encontrado, aplicando taxa base.",
          };
        }
      } catch (err) {
        console.error("Erro na API do Google Maps:", err);
        return {
          mode, available: true, fee: Number(tenant.delivery_fee ?? 0), source: "distance_km",
          neighborhood: data.neighborhood || null, min_order_total: 0, estimated_minutes: null,
          message: "Erro de conexão, aplicando taxa base.",
        };
      }
    }

    // mode === 'neighborhood'
    const { data: zones } = await supabaseAdmin
      .from("delivery_zones")
      .select("id, neighborhood, fee, min_order_total, estimated_minutes, cep_start, cep_end")
      .eq("tenant_id", tenant.id)
      .eq("active", true);

    const list = zones ?? [];
    const cep = cepDigits(data.cep);

    // 0) Zone ID match
    if (data.zone_id) {
      const byId = list.find((z) => z.id === data.zone_id);
      if (byId) {
        return {
          mode, available: true, fee: Number(byId.fee),
          source: "neighborhood_by_name",
          neighborhood: cleanNeighborhoodName(byId.neighborhood),
          min_order_total: Number(byId.min_order_total),
          estimated_minutes: byId.estimated_minutes,
          message: null,
        };
      }
    }

    // 1) CEP range match
    if (cep.length === 8) {
      const byCep = list.find((z) => z.cep_start && z.cep_end && cep >= z.cep_start && cep <= z.cep_end);
      if (byCep) {
        return {
          mode, available: true, fee: Number(byCep.fee),
          source: "neighborhood_by_cep",
          neighborhood: cleanNeighborhoodName(byCep.neighborhood),
          min_order_total: Number(byCep.min_order_total),
          estimated_minutes: byCep.estimated_minutes,
          message: null,
        };
      }
    }

    // 2) Neighborhood name match
    const name = normalizeName(data.neighborhood ?? "");
    if (name) {
      const matchingByName = list.filter((z) => normalizeName(z.neighborhood) === name);
      if (matchingByName.length > 0) {
        let best = matchingByName[0];
        if (cep.length === 8) {
          const cepMatch = matchingByName.find((z) => z.cep_start && z.cep_end && cep >= z.cep_start && cep <= z.cep_end);
          if (cepMatch) best = cepMatch;
        }
        return {
          mode, available: true, fee: Number(best.fee),
          source: "neighborhood_by_name",
          neighborhood: cleanNeighborhoodName(best.neighborhood),
          min_order_total: Number(best.min_order_total),
          estimated_minutes: best.estimated_minutes,
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

// ---- Public delivery-fee range (min/max) ----

export type DeliveryFeeRange = {
  mode: "none" | "single" | "neighborhood";
  min: number;
  max: number;
};

export const getDeliveryFeeRange = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/) }).parse(d),
  )
  .handler(async ({ data }): Promise<DeliveryFeeRange> => {
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, delivery_mode, delivery_fee")
      .eq("slug", data.slug)
      .eq("active", true)
      .maybeSingle();
    if (!tenant) return { mode: "single", min: 0, max: 0 };
    const mode = (tenant.delivery_mode ?? "single") as "none" | "single" | "neighborhood";
    const baseFee = Number(tenant.delivery_fee ?? 0);
    if (mode === "none") return { mode, min: 0, max: 0 };
    if (mode === "single") return { mode, min: baseFee, max: baseFee };
    const { data: zones } = await supabaseAdmin
      .from("delivery_zones")
      .select("fee")
      .eq("tenant_id", tenant.id)
      .eq("active", true);
    const fees = (zones ?? []).map((z) => Number(z.fee)).filter((n) => Number.isFinite(n));
    if (fees.length === 0) return { mode, min: baseFee, max: baseFee };
    return { mode, min: Math.min(...fees), max: Math.max(...fees) };
  });
