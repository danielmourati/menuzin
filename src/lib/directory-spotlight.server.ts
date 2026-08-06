// Helpers server-only para os destaques do Guia.
/* eslint-disable @typescript-eslint/no-explicit-any */

export const FAR_FUTURE_ISO = "2999-12-31T00:00:00.000Z";

/** Produtos da loja cujo destaque foi pago (solicitação aprovada via PIX). */
export async function paidProductIds(client: any, tenantId: string): Promise<string[]> {
  const { data } = await client
    .from("guia_promo_requests")
    .select("product_id")
    .eq("tenant_id", tenantId)
    .eq("status", "paid")
    .not("product_id", "is", null);
  return ((data ?? []) as { product_id: string | null }[])
    .map((r) => r.product_id)
    .filter((v): v is string => !!v);
}
