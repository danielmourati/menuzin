import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tryResolveEffectiveTenantId } from "@/lib/active-tenant.server";

const CodeSchema = z
  .string()
  .min(2)
  .max(40)
  .regex(/^[A-Z0-9_-]+$/i, "Use letras, números, hífen ou underline");

export type CouponRow = {
  id: string;
  tenant_id: string;
  code: string;
  discount_type: "fixed" | "percent";
  discount_value: number;
  min_order_total: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export const listMyCoupons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) return { coupons: [] as CouponRow[] };
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("tenant_id", resolved.tenantId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { coupons: (data ?? []) as unknown as CouponRow[] };
  });

const UpsertInput = z.object({
  id: z.string().uuid().nullable().optional(),
  code: CodeSchema,
  discount_type: z.enum(["fixed", "percent"]),
  discount_value: z.number().positive().max(99999),
  min_order_total: z.number().min(0).max(999999).default(0),
  max_uses: z.number().int().positive().max(1_000_000).nullable().optional(),
  valid_from: z.string().datetime().nullable().optional(),
  valid_until: z.string().datetime().nullable().optional(),
  active: z.boolean().default(true),
});

export const upsertCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpsertInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) throw new Error("Loja não encontrada");
    if (data.discount_type === "percent" && data.discount_value > 100) {
      throw new Error("Percentual não pode passar de 100%");
    }
    const payload = {
      tenant_id: resolved.tenantId,
      code: data.code.toUpperCase(),
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      min_order_total: data.min_order_total,
      max_uses: data.max_uses ?? null,
      valid_from: data.valid_from ?? null,
      valid_until: data.valid_until ?? null,
      active: data.active,
    };
    if (data.id) {
      const { error } = await supabase.from("coupons").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await supabase.from("coupons").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DeleteInput = z.object({ id: z.string().uuid() });
export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => DeleteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Public validation — used from cart
const ValidateInput = z.object({
  tenant_slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  code: CodeSchema,
  subtotal: z.number().min(0).max(999999),
});

export type ValidatedCoupon = {
  code: string;
  discount: number;
  discount_type: "fixed" | "percent";
  discount_value: number;
};

export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator((d) => ValidateInput.parse(d))
  .handler(async ({ data }): Promise<ValidatedCoupon> => {
    const { data: tenant } = await supabaseAdmin
      .from("tenants").select("id").eq("slug", data.tenant_slug).eq("active", true).maybeSingle();
    if (!tenant) throw new Error("Loja não encontrada");

    const { data: coupon } = await supabaseAdmin
      .from("coupons").select("*")
      .eq("tenant_id", tenant.id).eq("code", data.code.toUpperCase()).maybeSingle();
    if (!coupon) throw new Error("Cupom inválido");
    if (!coupon.active) throw new Error("Cupom desativado");

    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) throw new Error("Cupom ainda não está válido");
    if (coupon.valid_until && new Date(coupon.valid_until) < now) throw new Error("Cupom expirado");
    if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) throw new Error("Cupom esgotado");
    if (Number(coupon.min_order_total) > data.subtotal) {
      throw new Error(`Pedido mínimo de R$ ${Number(coupon.min_order_total).toFixed(2)} para este cupom`);
    }

    const value = Number(coupon.discount_value);
    let discount =
      coupon.discount_type === "percent"
        ? (data.subtotal * value) / 100
        : value;
    discount = Math.min(discount, data.subtotal);
    discount = Math.round(discount * 100) / 100;

    return {
      code: coupon.code,
      discount,
      discount_type: coupon.discount_type as "fixed" | "percent",
      discount_value: value,
    };
  });
