import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import {
  listMyDeliveryZones, upsertDeliveryZone, deleteDeliveryZone,
  type DeliveryZoneRow,
} from "@/lib/delivery-zones.functions";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/admin/taxas-entrega")({
  component: DeliveryZonesPage,
});

type Editing = {
  id?: string;
  neighborhood: string;
  fee: number;
  min_order_total: number;
  estimated_minutes: number | null;
  active: boolean;
};

const empty = (): Editing => ({
  neighborhood: "",
  fee: 0,
  min_order_total: 0,
  estimated_minutes: null,
  active: true,
});

function DeliveryZonesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "delivery-zones"],
    queryFn: async () => (await listMyDeliveryZones()).zones,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);

  const saveMut = useMutation({
    mutationFn: (input: Editing) => upsertDeliveryZone({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "delivery-zones"] });
      toast.success("Bairro salvo");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteDeliveryZone({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "delivery-zones"] });
      toast.success("Bairro excluído");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: (z: DeliveryZoneRow) =>
      upsertDeliveryZone({
        data: {
          id: z.id,
          neighborhood: z.neighborhood,
          fee: Number(z.fee),
          min_order_total: Number(z.min_order_total),
          estimated_minutes: z.estimated_minutes,
          active: !z.active,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "delivery-zones"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const list = data ?? [];

  const openNew = () => { setEditing(empty()); setOpen(true); };
  const openEdit = (z: DeliveryZoneRow) => {
    setEditing({
      id: z.id,
      neighborhood: z.neighborhood,
      fee: Number(z.fee),
      min_order_total: Number(z.min_order_total),
      estimated_minutes: z.estimated_minutes,
      active: z.active,
    });
    setOpen(true);
  };

  const save = () => {
    if (!editing) return;
    if (!editing.neighborhood.trim()) return toast.error("Informe o bairro");
    if (editing.fee < 0) return toast.error("Taxa inválida");
    saveMut.mutate(editing);
  };

  return (
    <AdminLayout
      title="Taxas de entrega"
      action={
        <Button size="sm" onClick={openNew} className="font-bold text-xs">
          <Plus className="mr-1.5 h-4 w-4" /> Novo bairro
        </Button>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="grid place-items-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
                <MapPin className="h-10 w-10" />
                <p className="text-sm max-w-sm">
                  Nenhum bairro cadastrado. Sem bairros, a taxa padrão da loja será cobrada em todas as entregas.
                </p>
                <Button size="sm" onClick={openNew}>
                  <Plus className="mr-1.5 h-4 w-4" /> Cadastrar primeiro bairro
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {list.map((z) => (
                  <div key={z.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-base truncate">{z.neighborhood}</span>
                        <Badge variant={z.active ? "default" : "secondary"}>{z.active ? "Ativo" : "Inativo"}</Badge>
                        <Badge variant="outline">Taxa {brl(Number(z.fee))}</Badge>
                        {Number(z.min_order_total) > 0 && (
                          <Badge variant="outline">Mín. {brl(Number(z.min_order_total))}</Badge>
                        )}
                        {z.estimated_minutes && (
                          <Badge variant="outline">~{z.estimated_minutes} min</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={z.active} onCheckedChange={() => toggleMut.mutate(z)} />
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(z)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => { if (confirm(`Excluir o bairro ${z.neighborhood}?`)) delMut.mutate(z.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar bairro" : "Novo bairro"}</DialogTitle>
            <DialogDescription>
              Defina a taxa cobrada para entregas neste bairro. Se algum bairro estiver cadastrado, o cliente deverá selecioná-lo no checkout.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Bairro *</Label>
                <Input
                  className="mt-1.5"
                  value={editing.neighborhood}
                  onChange={(e) => setEditing({ ...editing, neighborhood: e.target.value })}
                  placeholder="Ex: Centro"
                  maxLength={120}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Taxa (R$) *</Label>
                  <Input
                    className="mt-1.5"
                    type="number" min={0} step="0.01"
                    value={editing.fee}
                    onChange={(e) => setEditing({ ...editing, fee: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Pedido mínimo (R$)</Label>
                  <Input
                    className="mt-1.5"
                    type="number" min={0} step="0.01"
                    value={editing.min_order_total}
                    onChange={(e) => setEditing({ ...editing, min_order_total: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Tempo estimado (min)</Label>
                  <Input
                    className="mt-1.5"
                    type="number" min={1}
                    placeholder="Opcional"
                    value={editing.estimated_minutes ?? ""}
                    onChange={(e) => setEditing({ ...editing, estimated_minutes: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label className="text-sm">Ativo</Label>
                  <p className="text-xs text-muted-foreground">Desative para ocultar este bairro no checkout.</p>
                </div>
                <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saveMut.isPending}>
              {saveMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
