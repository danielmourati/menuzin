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
 * Transmite a alteração de status/cardápio em 0 milissegundos para abas locais (BroadcastChannel)
 * e para todos os dispositivos de clientes (Supabase Realtime Broadcast).
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

    // Transmite via WebSocket Broadcast do Supabase (para alcançar dispositivos e PWAs externos em < 100ms)
    if (event.tenantId) {
      const channelName = `storefront-realtime-${event.tenantId}`;
      const channel = supabase.channel(channelName);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: "TENANT_STATUS_CHANGED",
            payload: event,
          });
          setTimeout(() => {
            supabase.removeChannel(channel);
          }, 1500);
        }
      });
    }
  } catch {
    /* ignore */
  }
}

/**
 * Hook executado no storefront ($slug.tsx) para sincronizar status da loja e cardápio silenciosamente
 * em tempo real via Supabase Realtime (WebSocket Broadcast + Postgres Changes), eventos de visibilidade do app e polling inteligente.
 */
export function useStorefrontRealtime(slug: string, tenantId?: string) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!slug || !tenantId) return;

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

    // 1. Sincronização entre abas do mesmo navegador
    const bc = getSyncChannel();
    if (bc) {
      bc.onmessage = (msg: MessageEvent<StoreSyncEvent>) => handleSyncMessage(msg.data);
    }

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

    // 2. Inscrição no Supabase Realtime WebSocket (Broadcast + Postgres Changes)
    const channelName = `storefront-realtime-${tenantId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "broadcast",
        { event: "TENANT_STATUS_CHANGED" },
        (payload) => {
          if (payload?.payload) {
            handleSyncMessage(payload.payload as StoreSyncEvent);
          }
        }
      )
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
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          qc.invalidateQueries({ queryKey: ["catalog", slug] });
        }
      });

    // 3. Disparador de sync silencioso ao retomar o app (visibilidade, foco de janela, reconexão)
    const triggerSilentSync = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        qc.invalidateQueries({ queryKey: ["catalog", slug] });
      }
    };

    document.addEventListener("visibilitychange", triggerSilentSync);
    window.addEventListener("focus", triggerSilentSync);
    window.addEventListener("online", triggerSilentSync);

    // 4. Polling silencioso de fundo a cada 15 segundos enquanto o app estiver aberto/visível
    const pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        qc.invalidateQueries({ queryKey: ["catalog", slug] });
      }
    }, 15_000);

    return () => {
      if (bc) bc.close();
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", triggerSilentSync);
      window.removeEventListener("focus", triggerSilentSync);
      window.removeEventListener("online", triggerSilentSync);
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [slug, tenantId, qc]);
}

