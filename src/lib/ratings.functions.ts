import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveEffectiveTenantId } from "@/lib/active-tenant.server";

const SubmitInput = z.object({
  order_id: z.string().uuid(),
  stars: z.number().int().min(1).max(5),
  nps: z.number().int().min(0).max(10).nullable().optional(),
  comment: z.string().trim().max(1000).optional().default(""),
});

/**
 * Endpoint público (sem auth) usado pelo cliente final após o pedido.
 * Valida a existência do pedido, evita duplicatas e usa supabaseAdmin
 * porque `orders` é restrito por RLS.
 */
export const submitOrderRating = createServerFn({ method: "POST" })
  .inputValidator((d) => SubmitInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .select("id, tenant_id, whatsapp")
      .eq("id", data.order_id)
      .maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!order) throw new Error("Pedido não encontrado.");

    const { data: existing } = await supabaseAdmin
      .from("order_ratings").select("id").eq("order_id", data.order_id).maybeSingle();
    if (existing) {
      return { ok: true, alreadyRated: true };
    }

    const { error } = await supabaseAdmin.from("order_ratings").insert({
      tenant_id: order.tenant_id,
      order_id: data.order_id,
      customer_phone: order.whatsapp ?? null,
      stars: data.stars,
      nps: data.nps ?? null,
      comment: data.comment?.trim() || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true, alreadyRated: false };
  });

/**
 * Verifica se um pedido já foi avaliado. Público.
 */
export const getOrderRatingStatus = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("order_ratings").select("id, stars, nps, comment").eq("order_id", data.order_id).maybeSingle();
    return { rated: !!existing, rating: existing ?? null };
  });

/**
 * Lista avaliações da loja autenticada (paginação simples).
 */
export const listMyTenantRatings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ limit: z.number().int().min(1).max(200).default(50) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { tenantId } = await resolveEffectiveTenantId(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("order_ratings")
      .select("id, order_id, stars, nps, comment, customer_phone, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const totals = (rows ?? []).reduce(
      (acc, r) => {
        acc.count += 1;
        acc.starsSum += Number(r.stars);
        if (r.nps != null) {
          acc.npsCount += 1;
          acc.npsSum += Number(r.nps);
          if (r.nps >= 9) acc.promoters += 1;
          else if (r.nps <= 6) acc.detractors += 1;
          else acc.passives += 1;
        }
        return acc;
      },
      { count: 0, starsSum: 0, npsCount: 0, npsSum: 0, promoters: 0, passives: 0, detractors: 0 },
    );

    const avgStars = totals.count > 0 ? totals.starsSum / totals.count : 0;
    const avgNps = totals.npsCount > 0 ? totals.npsSum / totals.npsCount : null;
    const npsScore =
      totals.npsCount > 0
        ? Math.round(((totals.promoters - totals.detractors) / totals.npsCount) * 100)
        : null;

    return {
      ratings: rows ?? [],
      summary: { ...totals, avgStars, avgNps, npsScore },
    };
  });
