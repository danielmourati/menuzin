import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getOrder, getOrderByNumber } from "@/lib/orders.functions";
import { dbOrderToUi, dbHistoryToUi } from "@/lib/order-adapters";
import type { Order } from "@/lib/mock-data";

type Lookup =
  | { kind: "id"; id: string }
  | { kind: "number"; tenantSlug: string; number: number };

async function fetchOrder(lookup: Lookup) {
  const res = lookup.kind === "id"
    ? await getOrder({ data: { id: lookup.id } })
    : await getOrderByNumber({ data: { tenant_slug: lookup.tenantSlug, number: lookup.number } });
  if (!res.order) return null;
  return dbOrderToUi(res.order, dbHistoryToUi(res.history));
}

/**
 * Hook público (sem auth) que busca um pedido e assina mudanças em tempo real
 * tanto na linha `orders` (mudanças de status/pagamento) quanto em novas
 * entradas em `order_status_history`.
 */
export function useCustomerOrder(lookup: Lookup | null): {
  order: Order | null;
  isLoading: boolean;
  error: Error | null;
} {
  const queryClient = useQueryClient();
  const queryKey = lookup
    ? ["customer-order", lookup.kind === "id" ? lookup.id : `${lookup.tenantSlug}:${lookup.number}`]
    : ["customer-order", "none"];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchOrder(lookup!),
    enabled: !!lookup,
    staleTime: 5_000,
  });

  const orderId = data?.id ?? null;

  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`order:${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        () => { queryClient.invalidateQueries({ queryKey }); },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_status_history", filter: `order_id=eq.${orderId}` },
        () => { queryClient.invalidateQueries({ queryKey }); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [orderId, queryClient, queryKey]);

  return {
    order: data ?? null,
    isLoading,
    error: (error as Error) ?? null,
  };
}
