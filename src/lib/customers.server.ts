// Server-only helpers for the universal (login-less) customer profile.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type CustomerAddress = {
  cep?: string | null;
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  complement?: string | null;
  reference?: string | null;
};

export type CustomerRow = {
  id: string;
  phone: string;
  name: string | null;
  device_token: string;
  last_cep: string | null;
  last_city: string | null;
  last_uf: string | null;
  last_neighborhood: string | null;
  last_address: CustomerAddress | null;
  orders_count: number;
  last_order_at: string | null;
};

export const normalizePhone = (v: string) => (v || "").replace(/\D/g, "").slice(-13);
export const cepDigits = (v: string | null | undefined) => (v || "").replace(/\D/g, "");

export type UpsertCustomerInput = {
  phone: string;
  name?: string | null;
  cep?: string | null;
  city?: string | null;
  uf?: string | null;
  neighborhood?: string | null;
  address?: CustomerAddress | null;
  countOrder?: boolean;
};

/** Creates or updates the customer keyed by phone. Returns the row (incl. device token). */
export async function upsertCustomer(input: UpsertCustomerInput): Promise<CustomerRow | null> {
  const phone = normalizePhone(input.phone);
  if (phone.length < 8) return null;

  const { data: existing } = await supabaseAdmin
    .from("customers")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  const address = input.address ?? null;
  const patch: Record<string, unknown> = {
    phone,
    name: input.name?.trim() || existing?.name || null,
    last_cep: cepDigits(input.cep) || existing?.last_cep || null,
    last_city: input.city || existing?.last_city || null,
    last_uf: input.uf || existing?.last_uf || null,
    last_neighborhood: input.neighborhood || existing?.last_neighborhood || null,
    last_address: address ?? existing?.last_address ?? null,
  };
  if (input.countOrder) {
    patch.orders_count = (existing?.orders_count ?? 0) + 1;
    patch.last_order_at = new Date().toISOString();
  }

  if (existing) {
    const { data } = await supabaseAdmin
      .from("customers")
      .update(patch as never)
      .eq("id", existing.id)
      .select("*")
      .maybeSingle();
    return (data ?? existing) as unknown as CustomerRow;
  }

  const { data } = await supabaseAdmin
    .from("customers")
    .insert(patch as never)
    .select("*")
    .maybeSingle();
  if (!data) return null;

  return data as unknown as CustomerRow;
}

/** Saves/refreshes the customer's default address record. */
export async function saveDefaultAddress(customerId: string, addr: CustomerAddress & { city?: string | null; uf?: string | null }) {
  if (!addr.street && !addr.cep) return;
  const { data: existing } = await supabaseAdmin
    .from("customer_addresses")
    .select("id")
    .eq("customer_id", customerId)
    .eq("is_default", true)
    .maybeSingle();

  const row = {
    customer_id: customerId,
    label: "Principal",
    cep: cepDigits(addr.cep) || null,
    street: addr.street || null,
    number: addr.number || null,
    neighborhood: addr.neighborhood || null,
    complement: addr.complement || null,
    reference: addr.reference || null,
    city: addr.city || null,
    uf: addr.uf || null,
    is_default: true,
  };

  if (existing) {
    await supabaseAdmin.from("customer_addresses").update(row as never).eq("id", existing.id);
  } else {
    await supabaseAdmin.from("customer_addresses").insert(row as never);
  }
}

/** Ownership check: only a device holding the token gets the stored data back. */
export async function getCustomerByToken(phone: string, token: string): Promise<CustomerRow | null> {
  const p = normalizePhone(phone);
  if (p.length < 8 || !token || token.length < 16) return null;
  const { data } = await supabaseAdmin
    .from("customers")
    .select("*")
    .eq("phone", p)
    .eq("device_token", token)
    .maybeSingle();
  return (data as unknown as CustomerRow) ?? null;
}

export type CustomerOrderSummary = {
  id: string;
  number: number;
  status: string;
  total: number;
  created_at: string;
  tenant_slug: string;
  tenant_name: string;
  tenant_logo_url: string | null;
};

export async function listOrdersForCustomer(customerId: string, phone: string): Promise<CustomerOrderSummary[]> {
  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("id, number, status, total, created_at, tenant_id, customer_id, whatsapp")
    .or(`customer_id.eq.${customerId},whatsapp.eq.${normalizePhone(phone)}`)
    .order("created_at", { ascending: false })
    .limit(20);

  const rows = orders ?? [];
  if (!rows.length) return [];

  const tenantIds = [...new Set(rows.map((o) => o.tenant_id as string))];
  const { data: tenants } = await supabaseAdmin
    .from("tenants")
    .select("id, slug, name, logo_url")
    .in("id", tenantIds);
  const byId = new Map((tenants ?? []).map((t) => [t.id as string, t]));

  return rows.map((o) => {
    const t = byId.get(o.tenant_id as string);
    return {
      id: o.id as string,
      number: Number(o.number),
      status: String(o.status),
      total: Number(o.total),
      created_at: String(o.created_at),
      tenant_slug: (t?.slug as string) ?? "",
      tenant_name: (t?.name as string) ?? "Loja",
      tenant_logo_url: (t?.logo_url as string) ?? null,
    };
  });
}

export type CityResolution = {
  cep: string;
  city: string | null;
  uf: string | null;
  neighborhood: string | null;
  source: "cep_ranges" | "viacep" | "none";
};

/** Resolves city/UF for a CEP: first internal cep_ranges, then ViaCEP. */
export async function resolveCity(cep: string): Promise<CityResolution> {
  const d = cepDigits(cep);
  if (d.length !== 8) return { cep: d, city: null, uf: null, neighborhood: null, source: "none" };

  const { data: range } = await supabaseAdmin
    .from("cep_ranges")
    .select("city, uf, neighborhood")
    .lte("cep_start", d)
    .gte("cep_end", d)
    .limit(1)
    .maybeSingle();

  if (range?.city) {
    return {
      cep: d,
      city: range.city as string,
      uf: (range.uf as string) ?? null,
      neighborhood: (range.neighborhood as string) ?? null,
      source: "cep_ranges",
    };
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    if (res.ok) {
      const j = (await res.json()) as {
        localidade?: string; uf?: string; bairro?: string; erro?: boolean | string;
      };
      if (!j.erro && j.localidade) {
        return {
          cep: d,
          city: j.localidade,
          uf: (j.uf ?? "").toUpperCase() || null,
          neighborhood: j.bairro || null,
          source: "viacep",
        };
      }
    }
  } catch {
    /* ignore */
  }

  return { cep: d, city: null, uf: null, neighborhood: null, source: "none" };
}
