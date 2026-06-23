import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PlatformLayout } from "./platform.dashboard";
import { adminListPlans, adminUpsertPlan, type PlanRow, type SubscriptionPeriod } from "@/lib/subscriptions.functions";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/platform/planos")({ component: Page });

const PERIODS: SubscriptionPeriod[] = ["mensal","trimestral","semestral","anual","personalizado"];

function Page() {
  return (
    <PlatformLayout title="Planos">
      <PlansAdmin />
    </PlatformLayout>
  );
}

function PlansAdmin() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-plans"], queryFn: () => adminListPlans() });
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}><Plus className="mr-1 h-4 w-4" />Novo plano</Button>
      </div>
      {isLoading ? (
        <div className="grid place-items-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.plans ?? []).map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">{p.slug}</p>
                  </div>
                  <Badge variant={p.active ? "default" : "outline"}>{p.active ? "Ativo" : "Inativo"}</Badge>
                </div>
                <p className="mt-2 text-lg font-bold">{brl(Number(p.monthly_price))}<span className="text-xs font-normal text-muted-foreground">/mês</span></p>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.description ?? "—"}</p>
                <ul className="mt-2 space-y-0.5 text-xs">
                  {p.features.slice(0, 4).map((f) => <li key={f}>• {f}</li>)}
                </ul>
                <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => setEditing(p)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />Editar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {(editing || creating) && (
        <PlanForm
          plan={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
        />
      )}
    </div>
  );
}

function PlanForm({ plan, onClose }: { plan: PlanRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    id: plan?.id,
    slug: plan?.slug ?? "",
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    monthly_price: Number(plan?.monthly_price ?? 0),
    annual_price: plan?.annual_price != null ? Number(plan.annual_price) : null,
    billing_periods: (plan?.billing_periods ?? ["mensal"]) as SubscriptionPeriod[],
    features: plan?.features ?? [],
    active: plan?.active ?? true,
    sort_order: plan?.sort_order ?? 0,
  });
  const [featureInput, setFeatureInput] = useState("");

  const mut = useMutation({
    mutationFn: () => adminUpsertPlan({ data: form }),
    onSuccess: () => { toast.success("Plano salvo"); qc.invalidateQueries({ queryKey: ["admin-plans"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{plan ? "Editar plano" : "Novo plano"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Slug *</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} /></div>
          <div className="sm:col-span-2"><Label>Descrição</Label><Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Valor mensal (R$)</Label><Input type="number" step="0.01" value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: Number(e.target.value) })} /></div>
          <div><Label>Valor anual (R$)</Label><Input type="number" step="0.01" value={form.annual_price ?? ""} onChange={(e) => setForm({ ...form, annual_price: e.target.value === "" ? null : Number(e.target.value) })} /></div>
          <div className="sm:col-span-2">
            <Label>Períodos disponíveis</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {PERIODS.map((p) => {
                const checked = form.billing_periods.includes(p);
                return (
                  <Button key={p} type="button" size="sm" variant={checked ? "default" : "outline"}
                    onClick={() => setForm({
                      ...form,
                      billing_periods: checked
                        ? form.billing_periods.filter((x) => x !== p)
                        : [...form.billing_periods, p],
                    })}>
                    {p}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label>Recursos</Label>
            <div className="mt-1.5 flex gap-2">
              <Input value={featureInput} onChange={(e) => setFeatureInput(e.target.value)} placeholder="Adicionar recurso..." />
              <Button type="button" onClick={() => { if (featureInput.trim()) { setForm({ ...form, features: [...form.features, featureInput.trim()] }); setFeatureInput(""); } }}>Adicionar</Button>
            </div>
            <ul className="mt-2 space-y-1">
              {form.features.map((f, i) => (
                <li key={`${f}-${i}`} className="flex items-center gap-2 rounded border bg-muted/30 px-2 py-1 text-sm">
                  <span className="flex-1">{f}</span>
                  <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, features: form.features.filter((_, j) => j !== i) })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            <Label>Ativo</Label>
          </div>
          <div><Label>Ordem</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
