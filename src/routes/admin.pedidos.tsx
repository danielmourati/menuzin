import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, PlusCircle, Settings2, Printer } from "lucide-react";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import { OrdersStatusGroups } from "@/components/orders/OrdersStatusGroups";
import { OrdersMobileTabs } from "@/components/orders/OrdersMobileTabs";
import { OrderDetailsDrawer } from "@/components/orders/OrderDetailsDrawer";
import { CancelOrderModal } from "@/components/orders/CancelOrderModal";
import { PrinterSettingsDialog } from "@/components/printer/PrinterSettingsDialog";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getMyTenant } from "@/lib/tenants.functions";

export const Route = createFileRoute("/admin/pedidos")({
  component: OrdersPage,
});

function OrdersPage() {
  const {
    orders,
    acceptOrder,
    cancelOrder,
    updateOrderStatus,
    simulateNewOrder,
  } = useOrdersRealtime();
  const { data: tenantData } = useQuery({
    queryKey: ["my-tenant"],
    queryFn: () => getMyTenant(),
  });
  const tenantName = tenantData?.tenant?.name ?? "Sua loja";

  const [q, setQ] = useState("");
  const [modeFilter, setModeFilter] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<string>("ativos"); // "todos" | "ativos" | "finalizado" | "cancelado"
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  
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

  const handleManualSimulate = () => {
    simulateNewOrder();
    toast.success("Novo pedido recebido!");
  };

  return (
    <AdminLayout
      title="Gestão de Pedidos"
      action={
        <div className="flex items-center gap-2">
          {/* Botão de simulação rápida */}
          <Button
            onClick={handleManualSimulate}
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/95 font-bold text-xs"
          >
            <PlusCircle className="mr-1.5 h-4 w-4" />
            Simular Pedido
          </Button>

          {/* Atalho de configurações */}
          <Button asChild variant="outline" size="icon" className="h-9 w-9">
            <Link to="/admin/configuracoes/pedidos" title="Alertas e Notificações">
              <Settings2 className="h-4 w-4 text-foreground/80" />
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Barra de Filtros */}
        <Card className="shadow-sm border border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 grid gap-3 grid-cols-1 sm:grid-cols-[1fr_180px_180px]">
              {/* Campo de Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por cliente ou nº do pedido..."
                  className="pl-9 h-10 rounded-xl"
                />
              </div>

              {/* Filtro de Modalidade */}
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

              {/* Filtro de Status Geral */}
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

            {/* Alternador de Visualização (Kanban vs Lista) - Oculto no Mobile */}
            <div className="hidden md:flex items-center gap-1 bg-muted p-1 rounded-xl">
              <Button
                variant={viewMode === "kanban" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("kanban")}
                className="h-8 w-8 rounded-lg"
                title="Visualização em Kanban"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
                className="h-8 w-8 rounded-lg"
                title="Visualização em Lista"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Visualização Mobile (Abas Horizontais com Scroll) */}
        <div className="md:hidden">
          <OrdersMobileTabs
            orders={filtered}
            onViewDetails={(order) => setDetailedOrderId(order.id)}
            onAccept={acceptOrder}
            onCancel={(order) => setCancellationOrderId(order.id)}
            onUpdateStatus={updateOrderStatus}
          />
        </div>

        {/* Visualização Desktop */}
        <div className="hidden md:block">
          {viewMode === "kanban" && statusFilter !== "finalizado" && statusFilter !== "cancelado" ? (
            <OrdersKanbanBoard
              orders={filtered}
              onViewDetails={(order) => setDetailedOrderId(order.id)}
              onAccept={acceptOrder}
              onCancel={(order) => setCancellationOrderId(order.id)}
              onUpdateStatus={updateOrderStatus}
            />
          ) : (
            <div className="grid gap-3">
              {filtered.length === 0 ? (
                <Card className="border border-dashed">
                  <CardContent className="p-12 text-center text-muted-foreground">
                    Nenhum pedido encontrado com os filtros selecionados.
                  </CardContent>
                </Card>
              ) : (
                filtered.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onViewDetails={() => setDetailedOrderId(order.id)}
                    onAccept={() => acceptOrder(order.id)}
                    onCancel={() => setCancellationOrderId(order.id)}
                    onUpdateStatus={(status) => updateOrderStatus(order.id, status)}
                  />
                ))
              )}
            </div>
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
