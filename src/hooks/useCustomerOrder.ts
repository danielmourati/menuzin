import { useQuery } from "@tanstack/react-query";
import { getOrder, getOrderByNumber } from "@/lib/orders.functions";
import { dbOrderToUi, dbHistoryToUi } from "@/lib/order-adapters";
import type { Order } from "@/lib/domain-types";

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
 * Hook público (sem auth) que busca um pedido e mantém o estado atualizado
 * por polling. Não usamos Supabase Realtime aqui porque a tabela `orders`
 * agora é restrita à equipe do tenant via RLS — o cliente acessa o pedido
 * apenas através de uma server function que carrega pelo id privado.
 */
export function useCustomerOrder(lookup: Lookup | null): {
  order: Order | null;
  isLoading: boolean;
  error: Error | null;
} {
  const queryKey = lookup
    ? ["customer-order", lookup.kind === "id" ? lookup.id : `${lookup.tenantSlug}:${lookup.number}`]
    : ["customer-order", "none"];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchOrder(lookup!),
    enabled: !!lookup,
    staleTime: 5_000,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  return {
    order: data ?? null,
    isLoading,
    error: (error as Error) ?? null,
  };
}
