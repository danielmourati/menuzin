import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlanGate } from "@/components/subscription/PlanGate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Truck, Phone, Edit, Trash2, Loader2, UserCheck, Search, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { listMyDrivers, upsertDriver, deleteDriver, toggleDriverActive, type DriverRow } from "@/lib/drivers.functions";

export const Route = createFileRoute("/admin/entregadores")({
  component: () => (
    <PlanGate min="pro" title="Entregadores" featureLabel="Cadastro de Entregadores">
      <DriversPage />
    </PlanGate>
  ),
});

function DriversPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverRow | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [active, setActive] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["my-drivers"],
    queryFn: () => listMyDrivers(),
  });

  const drivers = data?.drivers ?? [];

  const openNewModal = () => {
    setEditingDriver(null);
    setName("");
    setPhone("");
    setVehicle("");
    setActive(true);
    setModalOpen(true);
  };

  const openEditModal = (driver: DriverRow) => {
    setEditingDriver(driver);
    setName(driver.name);
    setPhone(driver.phone);
    setVehicle(driver.vehicle ?? "");
    setActive(driver.active);
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertDriver({
        data: {
          id: editingDriver?.id || null,
          name,
          phone,
          vehicle: vehicle || null,
          active,
        },
      }),
    onSuccess: () => {
      toast.success(editingDriver ? "Entregador atualizado!" : "Entregador cadastrado com sucesso!");
      qc.invalidateQueries({ queryKey: ["my-drivers"] });
      setModalOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao salvar entregador.");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      toggleDriverActive({ data: { id, active } }),
    onSuccess: () => {
      toast.success("Status atualizado!");
      qc.invalidateQueries({ queryKey: ["my-drivers"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao alterar status.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDriver({ data: { id } }),
    onSuccess: () => {
      toast.success("Entregador removido!");
      qc.invalidateQueries({ queryKey: ["my-drivers"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao excluir entregador.");
    },
  });

  const filtered = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.phone.includes(search) ||
      (d.vehicle && d.vehicle.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AdminLayout
      title="Cadastro de Entregadores"
      action={
        <Button onClick={openNewModal} className="gap-2 font-semibold">
          <Plus className="h-4 w-4" /> Novo Entregador
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Barra de Filtros e Busca */}
        <Card className="shadow-xs border border-border">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou veículo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Total: <strong className="text-foreground">{filtered.length}</strong> entregador(es)
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Entregadores */}
        <Card className="shadow-xs border border-border overflow-hidden">
          <CardHeader className="bg-muted/20 border-b border-border pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" /> Equipe de Entregas
            </CardTitle>
            <CardDescription>
              Cadastre e gerencie os motoboys e entregadores que realizam as entregas da sua loja.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 flex items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" /> Carregando entregadores...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-3">
                <UserCheck className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="text-base font-medium">Nenhum entregador cadastrado.</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Clique no botão &quot;Novo Entregador&quot; para cadastrar motoboys e associar entregas aos pedidos.
                </p>
                <Button onClick={openNewModal} variant="outline" size="sm" className="mt-2">
                  <Plus className="mr-1.5 h-4 w-4" /> Cadastrar Entregador
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[250px]">Nome</TableHead>
                      <TableHead>WhatsApp / Telefone</TableHead>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((driver) => {
                      const cleanPhone = driver.phone.replace(/\D/g, "");
                      return (
                        <TableRow key={driver.id}>
                          <TableCell className="font-semibold text-foreground">
                            <div className="flex items-center gap-2.5">
                              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0">
                                {driver.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-sm leading-none">{driver.name}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              <Phone className="h-3.5 w-3.5" />
                              {driver.phone}
                              <MessageSquare className="h-3 w-3 opacity-70" />
                            </a>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs bg-muted px-2.5 py-1 rounded-md font-medium text-muted-foreground">
                              {driver.vehicle || "Moto / Padrão"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={driver.active}
                                onCheckedChange={(val) => toggleMutation.mutate({ id: driver.id, active: val })}
                              />
                              <Badge variant={driver.active ? "default" : "outline"} className={driver.active ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                                {driver.active ? "Ativo" : "Inativo"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditModal(driver)}
                                title="Editar"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm(`Deseja realmente remover ${driver.name}?`)) {
                                    deleteMutation.mutate(driver.id);
                                  }
                                }}
                                title="Excluir"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal Dialog Adicionar / Editar */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                {editingDriver ? "Editar Entregador" : "Cadastrar Novo Entregador"}
              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
              className="space-y-4 py-2"
            >
              <div className="space-y-1.5">
                <Label htmlFor="driver-name">Nome do Entregador *</Label>
                <Input
                  id="driver-name"
                  placeholder="Ex: Carlos Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="driver-phone">WhatsApp / Celular *</Label>
                <Input
                  id="driver-phone"
                  placeholder="Ex: 5586999998888"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Com DDD (e DDI 55 se aplicável). Usado para enviar ordens via WhatsApp.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="driver-vehicle">Veículo / Tipo de Transporte</Label>
                <Input
                  id="driver-vehicle"
                  placeholder="Ex: Honda CG 160, Bicicleta, Carro..."
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Status do Entregador</Label>
                  <p className="text-xs text-muted-foreground">Entregadores ativos aparecem na seleção de despacho.</p>
                </div>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>

              <DialogFooter className="mt-6 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingDriver ? "Atualizar" : "Cadastrar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
