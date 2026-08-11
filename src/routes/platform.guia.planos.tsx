import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Pencil, Plus, Trash2, Calendar, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { SLOT_KIND_LABELS, type GuiaSlotKind, type GuiaHighlightPlan } from "@/lib/guia-types";
import {
  adminListHighlightPlans,
  adminUpsertHighlightPlan,
  adminDeleteHighlightPlan,
} from "@/lib/guia-admin.functions";

export const Route = createFileRoute("/platform/guia/planos")({
  component: PlatformGuiaPlanosPage,
});

function PlatformGuiaPlanosPage() {
  const qc = useQueryClient();
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["admin-highlight-plans"],
    queryFn: () => adminListHighlightPlans(),
  });

  const [selectedKind, setSelectedKind] = useState<string>("all");
  const [editingPlan, setEditingPlan] = useState<GuiaHighlightPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const toggleMut = useMutation({
    mutationFn: (plan: GuiaHighlightPlan) =>
      adminUpsertHighlightPlan({
        data: {
          id: plan.id,
          name: plan.name,
          slot_kind: plan.slot_kind,
          duration_days: plan.duration_days,
          price: plan.price,
          description: plan.description,
          active: !plan.active,
          sort_order: plan.sort_order,
        },
      }),
    onSuccess: (_res, plan) => {
      toast.success(`Plano "${plan.name}" ${!plan.active ? "ativado" : "desativado"}`);
      qc.invalidateQueries({ queryKey: ["admin-highlight-plans"] });
      qc.invalidateQueries({ queryKey: ["public-highlight-plans"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminDeleteHighlightPlan({ data: { id } }),
    onSuccess: () => {
      toast.success("Plano excluído com sucesso.");
      qc.invalidateQueries({ queryKey: ["admin-highlight-plans"] });
      qc.invalidateQueries({ queryKey: ["public-highlight-plans"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filteredPlans = plans.filter((p) => {
    if (selectedKind !== "all" && p.slot_kind !== selectedKind) return false;
    return true;
  });

  const activeCount = plans.filter((p) => p.active).length;

  return (
    <div className="space-y-6">
      {/* Visual Header / Summary */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Planos de Destaque</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os pacotes, durações e preços de destaques disponíveis para os lojistas solicitarem no Guia.
          </p>
        </div>

        <Button onClick={() => setIsCreating(true)} className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          Novo Plano de Destaque
        </Button>
      </div>

      {/* Filter and Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1 text-xs">
            Total: <strong className="ml-1 text-foreground">{plans.length}</strong>
          </Badge>
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-600 dark:text-emerald-400">
            Ativos: <strong className="ml-1">{activeCount}</strong>
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Filtrar tipo:</Label>
          <Select value={selectedKind} onValueChange={setSelectedKind}>
            <SelectTrigger className="h-9 w-[180px] text-xs">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {(Object.keys(SLOT_KIND_LABELS) as GuiaSlotKind[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {SLOT_KIND_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid of Plans */}
      {isLoading ? (
        <div className="grid place-items-center p-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-sm text-muted-foreground">
          Nenhum plano de destaque encontrado.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all hover:shadow-md ${
                !plan.active ? "opacity-75 bg-muted/20" : ""
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="outline" className="mb-2 text-[11px] font-bold">
                      {SLOT_KIND_LABELS[plan.slot_kind] ?? plan.slot_kind}
                    </Badge>
                    <h3 className="font-bold text-base text-foreground leading-snug">{plan.name}</h3>
                  </div>

                  <Badge variant={plan.active ? "default" : "secondary"} className="shrink-0">
                    {plan.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                <div className="mt-4 flex items-baseline justify-between border-t pt-3">
                  <div>
                    <span className="text-2xl font-black text-primary">{brl(plan.price)}</span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    {plan.duration_days} {plan.duration_days === 1 ? "dia" : "dias"}
                  </span>
                </div>

                {plan.description && (
                  <p className="mt-2.5 text-xs text-muted-foreground line-clamp-2">
                    {plan.description}
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between border-t pt-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`switch-${plan.id}`}
                      checked={plan.active}
                      disabled={toggleMut.isPending}
                      onCheckedChange={() => toggleMut.mutate(plan)}
                    />
                    <Label htmlFor={`switch-${plan.id}`} className="text-xs font-medium cursor-pointer">
                      {plan.active ? "Ativo" : "Inativo"}
                    </Label>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditingPlan(plan)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(`Deseja excluir o plano "${plan.name}"?`)) {
                          deleteMut.mutate(plan.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog for Create / Edit */}
      {(editingPlan || isCreating) && (
        <HighlightPlanFormDialog
          plan={editingPlan}
          onClose={() => {
            setEditingPlan(null);
            setIsCreating(false);
          }}
        />
      )}
    </div>
  );
}

function HighlightPlanFormDialog({
  plan,
  onClose,
}: {
  plan: GuiaHighlightPlan | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    id: plan?.id,
    name: plan?.name ?? "",
    slot_kind: plan?.slot_kind ?? ("featured" as GuiaSlotKind),
    duration_days: plan?.duration_days ?? 7,
    price: plan?.price ?? 49.9,
    description: plan?.description ?? "",
    active: plan?.active ?? true,
    sort_order: plan?.sort_order ?? 0,
  });

  const upsertMut = useMutation({
    mutationFn: () => adminUpsertHighlightPlan({ data: form }),
    onSuccess: () => {
      toast.success(plan ? "Plano atualizado" : "Novo plano criado");
      qc.invalidateQueries({ queryKey: ["admin-highlight-plans"] });
      qc.invalidateQueries({ queryKey: ["public-highlight-plans"] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Informe o nome do plano.");
    if (form.duration_days < 1) return toast.error("A duração mínima é de 1 dia.");
    if (form.price < 0) return toast.error("O preço não pode ser negativo.");
    upsertMut.mutate();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {plan ? "Editar Plano de Destaque" : "Novo Plano de Destaque"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="plan-name">Nome do Plano *</Label>
            <Input
              id="plan-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Destaque Produto - 7 dias"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="plan-kind">Tipo de Destaque *</Label>
            <Select
              value={form.slot_kind}
              onValueChange={(v) => setForm({ ...form, slot_kind: v as GuiaSlotKind })}
            >
              <SelectTrigger id="plan-kind" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SLOT_KIND_LABELS) as GuiaSlotKind[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {SLOT_KIND_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="plan-duration">Duração (Dias) *</Label>
              <Input
                id="plan-duration"
                type="number"
                min={1}
                value={form.duration_days}
                onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="plan-price">Preço (R$) *</Label>
              <Input
                id="plan-price"
                type="number"
                step="0.01"
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                required
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="plan-desc">Descrição</Label>
            <Input
              id="plan-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Card de produto em área destacada"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <Label htmlFor="plan-order">Ordem de Exibição</Label>
              <Input
                id="plan-order"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                className="mt-1"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Switch
                id="plan-active"
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
              <Label htmlFor="plan-active" className="cursor-pointer font-medium">
                Ativo
              </Label>
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={upsertMut.isPending}>
              {upsertMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Plano
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
