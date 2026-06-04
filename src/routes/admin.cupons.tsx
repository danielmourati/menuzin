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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Edit2, Trash2, Loader2, Ticket } from "lucide-react";
import { toast } from "sonner";
import { listMyCoupons, upsertCoupon, deleteCoupon, type CouponRow } from "@/lib/coupons.functions";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/admin/cupons")({
  component: CouponsPage,
});

type Editing = {
  id?: string;
  code: string;
  discount_type: "fixed" | "percent";
  discount_value: number;
  min_order_total: number;
  max_uses: number | null;
  valid_from: string | null;
  valid_until: string | null;
  active: boolean;
};

const empty = (): Editing => ({
  code: "",
  discount_type: "percent",
  discount_value: 10,
  min_order_total: 0,
  max_uses: null,
  valid_from: null,
  valid_until: null,
  active: true,
});

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromDatetimeLocal(v: string): string | null {
  if (!v) return null;
  return new Date(v).toISOString();
}

function CouponsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: async () => (await listMyCoupons()).coupons,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);

  const saveMut = useMutation({
    mutationFn: (input: Editing) => upsertCoupon({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
      toast.success("Cupom salvo");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteCoupon({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
      toast.success("Cupom excluído");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: (c: CouponRow) =>
      upsertCoupon({
        data: {
          id: c.id,
          code: c.code,
          discount_type: c.discount_type,
          discount_value: Number(c.discount_value),
          min_order_total: Number(c.min_order_total),
          max_uses: c.max_uses,
          valid_from: c.valid_from,
          valid_until: c.valid_until,
          active: !c.active,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "coupons"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const list = data ?? [];

  const openNew = () => { setEditing(empty()); setOpen(true); };
  const openEdit = (c: CouponRow) => {
    setEditing({
      id: c.id,
      code: c.code,
      discount_type: c.discount_type,
      discount_value: Number(c.discount_value),
      min_order_total: Number(c.min_order_total),
      max_uses: c.max_uses,
      valid_from: c.valid_from,
      valid_until: c.valid_until,
      active: c.active,
    });
    setOpen(true);
  };

  const save = () => {
    if (!editing) return;
    if (!editing.code) return toast.error("Informe o código");
    if (!editing.discount_value || editing.discount_value <= 0) return toast.error("Valor de desconto inválido");
    if (editing.discount_type === "percent" && editing.discount_value > 100) {
      return toast.error("Percentual máximo é 100%");
    }
    saveMut.mutate(editing);
  };

  return (
    <AdminLayout
      title="Cupons"
      action={
        <Button size="sm" onClick={openNew} className="font-bold text-xs">
          <Plus className="mr-1.5 h-4 w-4" /> Novo cupom
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
                <Ticket className="h-10 w-10" />
                <p className="text-sm">Nenhum cupom criado.</p>
                <Button size="sm" onClick={openNew}>
                  <Plus className="mr-1.5 h-4 w-4" /> Criar primeiro cupom
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {list.map((c) => (
                  <div key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base">{c.code}</span>
                        <Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Ativo" : "Inativo"}</Badge>
                        <Badge variant="outline">
                          {c.discount_type === "percent"
                            ? `${Number(c.discount_value)}% off`
                            : `${brl(Number(c.discount_value))} off`}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {Number(c.min_order_total) > 0 && <>Mín. {brl(Number(c.min_order_total))} · </>}
                        Usos: {c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}
                        {c.valid_until && <> · até {new Date(c.valid_until).toLocaleDateString("pt-BR")}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={c.active} onCheckedChange={() => toggleMut.mutate(c)} />
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => { if (confirm(`Excluir o cupom ${c.code}?`)) delMut.mutate(c.id); }}
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
            <DialogTitle>{editing?.id ? "Editar cupom" : "Novo cupom"}</DialogTitle>
            <DialogDescription>Cupons valem para qualquer produto da loja (global).</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Código *</Label>
                <Input
                  className="mt-1.5 uppercase font-mono"
                  value={editing.code}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })}
                  placeholder="EX: BEMVINDO10"
                  maxLength={40}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={editing.discount_type}
                    onValueChange={(v) => setEditing({ ...editing, discount_type: v as "fixed" | "percent" })}
                  >
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentual (%)</SelectItem>
                      <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor *</Label>
                  {editing.discount_type === "fixed" ? (
                    <CurrencyInput
                      className="mt-1.5"
                      value={editing.discount_value}
                      onChange={(v) => setEditing({ ...editing, discount_value: v })}
                    />
                  ) : (
                    <Input
                      className="mt-1.5"
                      type="number"
                      min={0}
                      max={100}
                      step="1"
                      value={editing.discount_value}
                      onChange={(e) => setEditing({ ...editing, discount_value: Number(e.target.value) })}
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Pedido mínimo (R$)</Label>
                  <CurrencyInput
                    className="mt-1.5"
                    value={editing.min_order_total}
                    onChange={(v) => setEditing({ ...editing, min_order_total: v })}
                  />
                </div>
                <div>
                  <Label>Limite de usos</Label>
                  <Input
                    className="mt-1.5"
                    type="number" min={1}
                    placeholder="Sem limite"
                    value={editing.max_uses ?? ""}
                    onChange={(e) => setEditing({ ...editing, max_uses: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Válido a partir de</Label>
                  <Input
                    className="mt-1.5"
                    type="datetime-local"
                    value={toDatetimeLocal(editing.valid_from)}
                    onChange={(e) => setEditing({ ...editing, valid_from: fromDatetimeLocal(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Válido até</Label>
                  <Input
                    className="mt-1.5"
                    type="datetime-local"
                    value={toDatetimeLocal(editing.valid_until)}
                    onChange={(e) => setEditing({ ...editing, valid_until: fromDatetimeLocal(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label className="text-sm">Ativo</Label>
                  <p className="text-xs text-muted-foreground">Desative para impedir o uso temporariamente.</p>
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
