import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tryResolveEffectiveTenantId } from "@/lib/active-tenant.server";
import type { DbDriver } from "./db-types";

export type DriverRow = DbDriver;

export const listMyDrivers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) return { drivers: [] as DriverRow[], tableMissing: false };
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("drivers")
        .select("*")
        .eq("tenant_id", resolved.tenantId)
        .order("name", { ascending: true });

      if (error) {
        if (error.message?.includes("drivers") || error.message?.includes("schema cache") || error.code === "PGRST205") {
          console.warn("[listMyDrivers] Tabela 'drivers' ausente no schema do Supabase.");
          return { drivers: [] as DriverRow[], tableMissing: true };
        }
        throw new Error(error.message);
      }
      return { drivers: (data ?? []) as DriverRow[], tableMissing: false };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("drivers") || msg.includes("schema cache") || msg.includes("PGRST205")) {
        return { drivers: [] as DriverRow[], tableMissing: true };
      }
      throw err;
    }
  });

const DriverInput = z.object({
  id: z.string().uuid().nullable().optional(),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phone: z.string().min(8, "Telefone inválido"),
  vehicle: z.string().nullable().optional(),
  active: z.boolean().default(true),
});

export const upsertDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DriverInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) throw new Error("Loja não configurada");

    const payload = {
      tenant_id: resolved.tenantId,
      name: data.name,
      phone: data.phone,
      vehicle: data.vehicle || null,
      active: data.active,
    };

    try {
      if (data.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: updated, error } = await (supabase as any)
          .from("drivers")
          .update(payload)
          .eq("id", data.id)
          .eq("tenant_id", resolved.tenantId)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return { driver: updated as DriverRow };
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: inserted, error } = await (supabase as any)
          .from("drivers")
          .insert(payload)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return { driver: inserted as DriverRow };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("drivers") || msg.includes("schema cache") || msg.includes("PGRST205")) {
        throw new Error(
          "A tabela 'drivers' ainda não foi criada no banco de dados Supabase. Execute o script SQL da migração 20260917180000_drivers_table.sql no painel do Supabase."
        );
      }
      throw err;
    }
  });

const DeleteDriverInput = z.object({
  id: z.string().uuid(),
});

export const deleteDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteDriverInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) throw new Error("Loja não configurada");

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("drivers")
        .delete()
        .eq("id", data.id)
        .eq("tenant_id", resolved.tenantId);

      if (error) throw new Error(error.message);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("drivers") || msg.includes("schema cache")) {
        throw new Error("A tabela 'drivers' ainda não foi criada no Supabase.");
      }
      throw err;
    }
  });

const ToggleDriverInput = z.object({
  id: z.string().uuid(),
  active: z.boolean(),
});

export const toggleDriverActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ToggleDriverInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) throw new Error("Loja não configurada");

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("drivers")
        .update({ active: data.active })
        .eq("id", data.id)
        .eq("tenant_id", resolved.tenantId);

      if (error) throw new Error(error.message);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("drivers") || msg.includes("schema cache")) {
        throw new Error("A tabela 'drivers' ainda não foi criada no Supabase.");
      }
      throw err;
    }
  });

const AssignDriverInput = z.object({
  orderId: z.string().uuid(),
  driverId: z.string().uuid(),
  driverName: z.string(),
  updateStatusToSaiuEntrega: z.boolean().default(true),
});

export const assignDriverToOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AssignDriverInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const resolved = await tryResolveEffectiveTenantId(supabase, userId);
    if (!resolved?.tenantId) throw new Error("Loja não configurada");

    const updatePayload: Record<string, unknown> = {
      driver_id: data.driverId,
      driver_name: data.driverName,
    };

    if (data.updateStatusToSaiuEntrega) {
      updatePayload.status = "saiu_entrega";
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updatedOrder, error } = await (supabase as any)
        .from("orders")
        .update(updatePayload)
        .eq("id", data.orderId)
        .eq("tenant_id", resolved.tenantId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Registra no histórico de status
      if (data.updateStatusToSaiuEntrega) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("order_status_history").insert({
          order_id: data.orderId,
          previous_status: "preparo",
          new_status: "saiu_entrega",
          note: `Despachado com o entregador: ${data.driverName}`,
        });
      }

      return { success: true, order: updatedOrder };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("driver_id") || msg.includes("column") || msg.includes("schema cache")) {
        throw new Error("A coluna 'driver_id' na tabela 'orders' ainda não foi criada no Supabase.");
      }
      throw err;
    }
  });

const DRIVERS_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drivers_tenant_id ON public.drivers(tenant_id);

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS driver_name TEXT;

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'drivers' AND policyname = 'Permitir leitura de entregadores do tenant'
  ) THEN
    CREATE POLICY "Permitir leitura de entregadores do tenant" ON public.drivers FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'drivers' AND policyname = 'Permitir escrita de entregadores do tenant'
  ) THEN
    CREATE POLICY "Permitir escrita de entregadores do tenant" ON public.drivers FOR ALL USING (true);
  END IF;
END $$;
`;

export const autoSetupDriversTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const projectId = process.env.SUPABASE_PROJECT_ID || "fetiqngwjgxajtqjaolb";
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ACCESS_TOKEN ||
      process.env.SUPABASE_SECRET_KEY;

    if (!serviceKey) {
      return {
        success: false,
        sql: DRIVERS_MIGRATION_SQL,
        message: "Chave do Supabase service_role ausente no ambiente do servidor.",
      };
    }

    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/sql`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: DRIVERS_MIGRATION_SQL }),
      });

      if (res.ok) {
        return { success: true, sql: DRIVERS_MIGRATION_SQL, message: "Tabela de entregadores instalada com sucesso no Supabase!" };
      }

      const errText = await res.text();
      console.warn("Falha via Supabase Management API:", res.status, errText);
    } catch (e) {
      console.warn("Erro ao tentar executar via Management API:", e);
    }

    return {
      success: false,
      sql: DRIVERS_MIGRATION_SQL,
      message: "Execução automática não suportada pela API REST direta. Use o código SQL fornecido.",
    };
  });
