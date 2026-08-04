import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const AddressSchema = z.object({
  cep: z.string().max(20).nullable().optional(),
  street: z.string().max(200).nullable().optional(),
  number: z.string().max(30).nullable().optional(),
  neighborhood: z.string().max(120).nullable().optional(),
  complement: z.string().max(200).nullable().optional(),
  reference: z.string().max(200).nullable().optional(),
});

const SaveProfileInput = z.object({
  phone: z.string().min(8).max(20),
  name: z.string().max(120).nullable().optional(),
  email: z.string().email().max(160).nullable().optional().or(z.literal("")),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().or(z.literal("")),
  cep: z.string().max(20).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  uf: z.string().max(2).nullable().optional(),
  neighborhood: z.string().max(120).nullable().optional(),
  address: AddressSchema.nullable().optional(),
});

/** Saves customer data captured in a checkout (no account, no password). */
export const saveCustomerProfile = createServerFn({ method: "POST" })
  .inputValidator((d) => SaveProfileInput.parse(d))
  .handler(async ({ data }) => {
    const { upsertCustomer, saveDefaultAddress } = await import("@/lib/customers.server");
    const row = await upsertCustomer({
      phone: data.phone,
      name: data.name ?? null,
      email: data.email || null,
      birthdate: data.birthdate || null,
      cep: data.cep ?? null,
      city: data.city ?? null,
      uf: data.uf ?? null,
      neighborhood: data.neighborhood ?? null,
      address: data.address ?? null,
    });
    if (!row) return { customer: null };
    if (data.address) {
      await saveDefaultAddress(row.id, { ...data.address, city: data.city ?? null, uf: data.uf ?? null });
    }
    return {
      customer: {
        id: row.id,
        phone: row.phone,
        token: row.device_token,
        name: row.name,
        email: row.email,
        birthdate: row.birthdate,
        cep: row.last_cep,
        city: row.last_city,
        uf: row.last_uf,
        neighborhood: row.last_neighborhood,
        address: row.last_address,
        ordersCount: row.orders_count,
      },
    };
  });

const TokenInput = z.object({
  phone: z.string().min(8).max(20),
  token: z.string().min(16).max(120),
});

/** Returns stored data only to a device holding the ownership token. */
export const getCustomerProfile = createServerFn({ method: "POST" })
  .inputValidator((d) => TokenInput.parse(d))
  .handler(async ({ data }) => {
    const { getCustomerByToken } = await import("@/lib/customers.server");
    const row = await getCustomerByToken(data.phone, data.token);
    if (!row) return { customer: null };
    return {
      customer: {
        id: row.id,
        phone: row.phone,
        token: row.device_token,
        name: row.name,
        email: row.email,
        birthdate: row.birthdate,
        cep: row.last_cep,
        city: row.last_city,
        uf: row.last_uf,
        neighborhood: row.last_neighborhood,
        address: row.last_address,
        ordersCount: row.orders_count,
      },
    };
  });

/** Cross-tenant order history for the phone that owns the token. */
export const listCustomerOrders = createServerFn({ method: "POST" })
  .inputValidator((d) => TokenInput.parse(d))
  .handler(async ({ data }) => {
    const { getCustomerByToken, listOrdersForCustomer } = await import("@/lib/customers.server");
    const row = await getCustomerByToken(data.phone, data.token);
    if (!row) return { orders: [] };
    return { orders: await listOrdersForCustomer(row.id, row.phone) };
  });

const CepInput = z.object({ cep: z.string().min(8).max(12) });

/** CEP -> city/UF, used as the Guia Menuzin entry gate. */
export const resolveCityByCep = createServerFn({ method: "POST" })
  .inputValidator((d) => CepInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveCity } = await import("@/lib/customers.server");
    return await resolveCity(data.cep);
  });
