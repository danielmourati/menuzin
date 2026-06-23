import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import { OrdersStatusGroups } from "@/components/orders/OrdersStatusGroups";
import { OrdersMobileTabs } from "@/components/orders/OrdersMobileTabs";
import { OrderDetailsDrawer } from "@/components/orders/OrderDetailsDrawer";
import { CancelOrderModal } from "@/components/orders/CancelOrderModal";
import { LiveClock } from "@/components/admin/LiveClock";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getMyTenant } from "@/lib/tenants.functions";
import { useAuth } from "@/lib/auth-context";
import { useAcceptOrderWithKitchenPrint } from "@/hooks/useAcceptOrderWithKitchenPrint";

export const Route = createFileRoute("/admin/pedidos")({
  component: OrdersPage,
});

function OrdersPage() {
  const { isAuthenticated, loading: authLoading, profile } = useAuth();
  const {
    orders,
    cancelOrder,
    updateOrderStatus: rawUpdateOrderStatus,
  } = useOrdersRealtime();
  const { acceptOrder, updateOrderStatus } = useAcceptOrderWithKitchenPrint(
    orders,
    rawUpdateOrderStatus,
  );
  const { data: tenantData } = useQuery({
    queryKey: ["my-tenant", profile?.tenant_id ?? "none"],
    queryFn: () => getMyTenant(),
    enabled: !authLoading && isAuthenticated && !!profile?.tenant_id,
  });
  const tenantName = tenantData?.tenant?.name ?? "Sua loja";

  const [q, setQ] = useState("");
  const [modeFilter, setModeFilter] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<string>("todos");


  
  const [detailedOrderId, setDetailedOrderId] = useState<string | null>(null);
  const [cancellationOrderId, setCancellationOrderId] = useState<string | null>(null);

  // Encontra os dados atualizados das ordens abertas em modal/drawer
  const detailedOrder = useMemo(() => {
    return orders.find((o) => o.id === detailedOrderId) || null;
  }, [orders, detailedOrderId]);

  const cancellationOrder = useMemo(() => {
    return orders.find((o) => o.id === cancellationOrderId) || null;
  }, [orders, cancellationOrderId]);

  // Listener para eventos customizados de abertura (para o bell/toast)
  useEffect(() => {
    const handleOpenDetails = (e: Event) => {
      const customEvent = e as CustomEvent<{ orderId: string }>;
      const orderId = customEvent.detail?.orderId;
      if (orderId) {
        setDetailedOrderId(orderId);
      }
    };
    window.addEventListener("open-order-details", handleOpenDetails);
    return () => window.removeEventListener("open-order-details", handleOpenDetails);
  }, []);

  // Filtra as ordens de acordo com a barra de busca e modalidade
  const filtered = useMemo(() => {
    return orders.filter((o) => {
      // Filtro de Texto (Nome do cliente ou número do pedido)
      if (q && !`${o.number} ${o.customerName}`.toLowerCase().includes(q.toLowerCase())) {
        return false;
      }
      
      // Filtro de Modalidade (Entrega, Retirada, Consumo local)
      if (modeFilter !== "todos" && o.mode !== modeFilter) {
        return false;
      }

      // Filtro de Status
      if (statusFilter === "ativos") {
        return o.status !== "finalizado" && o.status !== "cancelado";
      }
      if (statusFilter !== "todos" && o.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [orders, q, modeFilter, statusFilter]);

  return (
    <AdminLayout
      title="Gestão de Pedidos"
      action={
        <div className="flex items-center gap-2">
          <LiveClock />
        </div>
      }
    >
      <div className="space-y-4">
        {/* Barra de Filtros */}
        <Card className="shadow-sm border border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 grid gap-3 grid-cols-1 sm:grid-cols-[1fr_180px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por cliente ou nº do pedido..."
                  className="pl-9 h-10 rounded-xl"
                />
              </div>

              <Select value={modeFilter} onValueChange={setModeFilter}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Todas as modalidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas modalidades</SelectItem>
                  <SelectItem value="entrega">Entrega</SelectItem>
                  <SelectItem value="retirada">Retirada</SelectItem>
                  <SelectItem value="consumo_local">Consumo local</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativos">Pedidos Ativos</SelectItem>
                  <SelectItem value="todos">Todos (inclui arquivados)</SelectItem>
                  <SelectItem value="finalizado">Finalizados</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Mobile — abas com scroll */}
        <div className="md:hidden">
          <OrdersMobileTabs
            orders={filtered}
            onViewDetails={(order) => setDetailedOrderId(order.id)}
            onAccept={acceptOrder}
            onCancel={(order) => setCancellationOrderId(order.id)}
            onUpdateStatus={updateOrderStatus}
          />
        </div>

        {/* Desktop — grupos de cards retangulares por status */}
        <div className="hidden md:block">
          {filtered.length === 0 ? (
            <Card className="border border-dashed">
              <CardContent className="p-12 text-center text-muted-foreground">
                Nenhum pedido encontrado com os filtros selecionados.
              </CardContent>
            </Card>
          ) : (
            <OrdersStatusGroups
              orders={filtered}
              onViewDetails={(order) => setDetailedOrderId(order.id)}
              onAccept={acceptOrder}
              onCancel={(order) => setCancellationOrderId(order.id)}
              onUpdateStatus={updateOrderStatus}
            />
          )}
        </div>
      </div>




      {/* Drawer de Detalhes do Pedido */}
      <OrderDetailsDrawer
        order={detailedOrder}
        isOpen={!!detailedOrder}
        onClose={() => setDetailedOrderId(null)}
        onAccept={() => detailedOrder && acceptOrder(detailedOrder.id)}
        onCancel={() => detailedOrder && setCancellationOrderId(detailedOrder.id)}
        onUpdateStatus={(status) => detailedOrder && updateOrderStatus(detailedOrder.id, status)}
        storeName={tenantName}
      />

      {/* Modal de Cancelamento de Pedido */}
      <CancelOrderModal
        order={cancellationOrder}
        isOpen={!!cancellationOrder}
        onClose={() => setCancellationOrderId(null)}
        onConfirm={(reason, note) => {
          if (cancellationOrder) {
            cancelOrder(cancellationOrder.id, reason, note);
            toast.error(`Pedido #${cancellationOrder.number} cancelado`);
          }
        }}
      />
    </AdminLayout>
  );
}
