import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { catalogQueryOptions } from "@/routes/$slug";

const SYNC_CHANNEL_NAME = "menuzin_store_sync_channel";

export type StoreSyncEvent = {
  type: "TENANT_STATUS_CHANGED" | "CATALOG_CHANGED";
  tenantId?: string;
  slug?: string;
  openMode?: "auto" | "open" | "closed";
  open?: boolean;
};

const getSyncChannel = () => {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    return new BroadcastChannel(SYNC_CHANNEL_NAME);
  }
  return null;
};

/**
  Transmite a alteração de status/cardápio em 0 milissegundos para outras abas do mesmo navegador.
 */
export function broadcastStoreSync(event: StoreSyncEvent) {
  if (typeof window === "undefined") return;
  try {
    const ch = getSyncChannel();
    if (ch) {
      ch.postMessage(event);
      ch.close();
    }
    localStorage.setItem("menuzin_store_sync_trigger", JSON.stringify({ ...event, t: Date.now() }));
  } catch {
    /* ignore */
  }
}

/**
  Hook executado no storefront ($slug.tsx) para sincronizar status da loja e cardápio em tempo real (milissegundos)
  via Supabase Realtime WebSockets e BroadcastChannel.
 */
export function useStorefrontRealtime(slug: string, tenantId?: string) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!slug || !tenantId) return;

    // 1. Sincronização em sub-milissegundos entre abas do mesmo navegador (BroadcastChannel)
    const bc = getSyncChannel();
    const handleSyncMessage = (data: StoreSyncEvent) => {
      if (!data) return;
      if (data.tenantId && data.tenantId !== tenantId) return;

      if (data.type === "TENANT_STATUS_CHANGED" && data.openMode) {
        qc.setQueryData(catalogQueryOptions(slug).queryKey, (old: any) => {
          if (!old || !old.tenant) return old;
          return {
            ...old,
            tenant: {
              ...old.tenant,
              openMode: data.openMode,
              open: typeof data.open === "boolean" ? data.open : old.tenant.open,
            },
          };
        });
      }
      qc.invalidateQueries({ queryKey: ["catalog", slug] });
    };

    if (bc) {
      bc.onmessage = (msg: MessageEvent<StoreSyncEvent>) => handleSyncMessage(msg.data);
    }

    // Fallback de evento Storage para navegadores mais antigos
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "menuzin_store_sync_trigger" && e.newValue) {
        try {
          const data = JSON.parse(e.newValue) as StoreSyncEvent;
          handleSyncMessage(data);
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    // 2. Inscrição no Supabase Realtime WebSocket (sincronização via internet em milissegundos para clientes remotos)
    const channelName = `storefront-realtime-${tenantId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tenants",
          filter: `id=eq.${tenantId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, any>;
          if (row) {
            // Atualiza o estado da loja na UI em MILISSEGUNDOS via React Query setQueryData!
            qc.setQueryData(catalogQueryOptions(slug).queryKey, (old: any) => {
              if (!old || !old.tenant) return old;
              return {
                ...old,
                tenant: {
                  ...old.tenant,
                  open: typeof row.open === "boolean" ? row.open : old.tenant.open,
                  openMode: row.open_mode ?? old.tenant.openMode,
                  hoursSchedule: Array.isArray(row.hours_schedule) ? row.hours_schedule : old.tenant.hoursSchedule,
                  name: row.name ?? old.tenant.name,
                  logoUrl: row.logo_url ?? old.tenant.logoUrl,
                  coverUrl: row.cover_url ?? old.tenant.coverUrl,
                  deliveryFee: row.delivery_fee != null ? Number(row.delivery_fee) : old.tenant.deliveryFee,
                  minOrder: row.min_order != null ? Number(row.min_order) : old.tenant.minOrder,
                },
              };
            });
          }
          // Garante re-fetch completo em segundo plano
          qc.invalidateQueries({ queryKey: ["catalog", slug] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["catalog", slug] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["catalog", slug] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "addon_groups",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["catalog", slug] });
        }
      )
      .subscribe();

    return () => {
      if (bc) bc.close();
      window.removeEventListener("storage", handleStorage);
      supabase.removeChannel(channel);
    };
  }, [slug, tenantId, qc]);
}
