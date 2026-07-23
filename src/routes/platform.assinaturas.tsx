import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Pencil, Plus, CalendarPlus, Lock, Unlock, Receipt, History } from "lucide-react";
import { toast } from "sonner";
import { PlatformLayout } from "./platform.dashboard";
import {
  adminListSubscriptions,
  adminListPlans,
  adminUpdateSubscription,
  adminExtendDueDate,
  adminToggleBlock,
  adminRegisterManualPayment,
  adminListEvents,
  adminSyncPayment,
  type SubscriptionPeriod,
  type SubscriptionStatusValue,
} from "@/lib/subscriptions.functions";
import { brl } from "@/lib/format";
import { computeSubscriptionStatus } from "@/lib/subscription-status";
import { SubscriptionStatusBadge } from "@/components/subscription/SubscriptionStatusBadge";

export const Route = createFileRoute("/platform/assinaturas")({ component: Page });

const PERIODS: SubscriptionPeriod[] = ["mensal", "trimestral", "semestral", "anual", "personalizado"];
const STATUSES: SubscriptionStatusValue[] = ["ativa","pendente","vencida","tolerancia","bloqueada","cancelada","teste","cortesia"];

function Page() {
  return (
    <PlatformLayout title="Assinaturas">
      <SubscriptionsAdmin />
    </PlatformLayout>
  );
}

function SubscriptionsAdmin() {
  const [filter, setFilter] = useState<"all"|"expiring"|"overdue"|"blocked">("all");
  const [planFilter, setPlanFilter] = useState<string>("");
  const [editing, setEditing] = useState<null | Record<string, unknown>>(null);
  const [history, setHistory] = useState<{ tenant_id: string; tenant_name: string } | null>(null);

  const { data: plansData } = useQuery({ queryKey: ["admin-plans"], queryFn: () => adminListPlans() });
  const { data, isLoading } = useQuery({
    queryKey: ["admin-subs", filter, planFilter],
    queryFn: () => adminListSubscriptions({ data: { filter, plan_slug: planFilter || undefined } }),
  });
  const list = data?.subscriptions ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all","expiring","overdue","blocked"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f === "all" ? "Todos" : f === "expiring" ? "Vencendo em 5 dias" : f === "overdue" ? "Vencidos" : "Bloqueados"}
          </Button>
        ))}
        <Select value={planFilter || "all"} onValueChange={(v) => setPlanFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Todos os planos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os planos</SelectItem>
            {plansData?.plans.map((p) => <SelectItem key={p.id} value={p.slug}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="grid place-items-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3">Loja</th>
                    <th className="px-4 py-3">Plano</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Período</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Vencimento</th>
                    <th className="px-4 py-3">Dias</th>
                    <th className="px-4 py-3">Último pgto</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => {
                    const c = computeSubscriptionStatus(s as never);
                    const isVirtual = String(s.id).startsWith("virtual-");
                    const planSlug = s.plan?.slug ?? "presenca";
                    const isPresenca = planSlug === "presenca";
                    return (
                      <tr key={s.id} className="border-t">
                        <td className="px-4 py-3 font-medium">
                          {(s as { tenant?: { name: string } }).tenant?.name ?? "—"}
                          {isVirtual && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">sem assinatura</span>}
                        </td>
                        <td className="px-4 py-3">{s.plan?.name ?? "Presença"}</td>
                        <td className="px-4 py-3">{brl(Number(s.amount))}</td>
                        <td className="px-4 py-3">{s.billing_period}</td>
                        <td className="px-4 py-3">
                          {isPresenca
                            ? <SubscriptionStatusBadge status="ativa" label="Ativa (grátis)" />
                            : <SubscriptionStatusBadge status={c.effective} />}
                        </td>
                        <td className="px-4 py-3">{isPresenca ? "—" : (s.due_date ? new Date(`${s.due_date}T00:00:00Z`).toLocaleDateString("pt-BR") : "—")}</td>
                        <td className="px-4 py-3">{isPresenca ? "—" : (c.daysRemaining ?? "—")}</td>
                        <td className="px-4 py-3">
                          {(s as { last_paid_at?: string | null }).last_paid_at
                            ? new Date((s as { last_paid_at: string }).last_paid_at).toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {!isVirtual && (
                              <>
                                <Button size="icon" variant="ghost" title="Editar" onClick={() => setEditing(s as never)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" title="Histórico" onClick={() => setHistory({ tenant_id: s.tenant_id, tenant_name: (s as { tenant?: { name: string } }).tenant?.name ?? "Loja" })}>
                                  <History className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {list.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Nenhuma assinatura encontrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {editing && <EditDialog sub={editing as never} plans={plansData?.plans ?? []} onClose={() => setEditing(null)} />}
      {history && <HistoryDialog tenantId={history.tenant_id} tenantName={history.tenant_name} onClose={() => setHistory(null)} />}
    </div>
  );
}

function EditDialog({
  sub, plans, onClose,
}: {
  sub: { id: string; plan_id: string; status: SubscriptionStatusValue; billing_period: SubscriptionPeriod; amount: number; due_date: string | null; grace_days: number; auto_block_enabled: boolean; notes: string | null };
  plans: { id: string; name: string; slug: string }[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    plan_id: sub.plan_id,
    status: sub.status,
    billing_period: sub.billing_period,
    amount: Number(sub.amount),
    due_date: sub.due_date ?? "",
    grace_days: sub.grace_days,
    auto_block_enabled: sub.auto_block_enabled,
    notes: sub.notes ?? "",
  });
  const [extDays, setExtDays] = useState(30);
  const [payAmt, setPayAmt] = useState(Number(sub.amount));

  const saveMut = useMutation({
    mutationFn: () => adminUpdateSubscription({ data: {
      subscription_id: sub.id,
      plan_id: form.plan_id,
      status: form.status,
      billing_period: form.billing_period,
      amount: form.amount,
      due_date: form.due_date || null,
      grace_days: form.grace_days,
      auto_block_enabled: form.auto_block_enabled,
      notes: form.notes,
    } }),
    onSuccess: () => { toast.success("Assinatura atualizada"); qc.invalidateQueries({ queryKey: ["admin-subs"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const extendMut = useMutation({
    mutationFn: () => adminExtendDueDate({ data: { subscription_id: sub.id, days: extDays } }),
    onSuccess: () => { toast.success(`Prorrogado ${extDays} dia(s)`); qc.invalidateQueries({ queryKey: ["admin-subs"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const blockMut = useMutation({
    mutationFn: (block: boolean) => adminToggleBlock({ data: { subscription_id: sub.id, block } }),
    onSuccess: (_d, block) => { toast.success(block ? "Bloqueado" : "Desbloqueado"); qc.invalidateQueries({ queryKey: ["admin-subs"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const payMut = useMutation({
    mutationFn: () => adminRegisterManualPayment({ data: { subscription_id: sub.id, amount: payAmt } }),
    onSuccess: () => { toast.success("Pagamento registrado"); qc.invalidateQueries({ queryKey: ["admin-subs"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Editar assinatura</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Plano</Label>
            <Select value={form.plan_id} onValueChange={(v) => setForm({ ...form, plan_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as SubscriptionStatusValue })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Período</Label>
            <Select value={form.billing_period} onValueChange={(v) => setForm({ ...form, billing_period: v as SubscriptionPeriod })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PERIODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
          <div><Label>Vencimento</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          <div><Label>Dias de tolerância</Label><Input type="number" value={form.grace_days} onChange={(e) => setForm({ ...form, grace_days: Number(e.target.value) })} /></div>
          <div className="flex items-center gap-2 pt-6"><Switch checked={form.auto_block_enabled} onCheckedChange={(v) => setForm({ ...form, auto_block_enabled: v })} /><Label>Bloqueio automático após tolerância</Label></div>
          <div className="sm:col-span-2"><Label>Observações internas</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>

        <div className="mt-2 rounded-lg border p-3">
          <p className="text-sm font-semibold mb-2">Ações rápidas</p>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1"><Input type="number" value={extDays} onChange={(e) => setExtDays(Number(e.target.value))} className="w-20" /><Button size="sm" variant="outline" onClick={() => extendMut.mutate()}><CalendarPlus className="mr-1 h-4 w-4" />Prorrogar dias</Button></div>
            <Button size="sm" variant="outline" onClick={() => blockMut.mutate(true)}><Lock className="mr-1 h-4 w-4" />Bloquear</Button>
            <Button size="sm" variant="outline" onClick={() => blockMut.mutate(false)}><Unlock className="mr-1 h-4 w-4" />Desbloquear</Button>
            <div className="flex items-center gap-1"><Input type="number" step="0.01" value={payAmt} onChange={(e) => setPayAmt(Number(e.target.value))} className="w-24" /><Button size="sm" variant="outline" onClick={() => payMut.mutate()}><Receipt className="mr-1 h-4 w-4" />Registrar pgto manual</Button></div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({ tenantId, tenantName, onClose }: { tenantId: string; tenantName: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-sub-events", tenantId],
    queryFn: () => adminListEvents({ data: { tenant_id: tenantId } }),
  });
  const syncMut = useMutation({
    mutationFn: (payment_id: string) => adminSyncPayment({ data: { payment_id } }),
    onSuccess: (r) => {
      toast.success(r.message ?? "Sincronizado");
      qc.invalidateQueries({ queryKey: ["admin-sub-events", tenantId] });
      qc.invalidateQueries({ queryKey: ["admin-subs"] });
    },
    onError: (e: Error) => toast.error(e.message ?? "Falha ao sincronizar"),
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Histórico — {tenantName}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <section>
            <h3 className="text-sm font-semibold mb-2">Pagamentos</h3>
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground"><tr><th className="py-1">Data</th><th>Valor</th><th>Status</th><th>MP ID</th><th></th></tr></thead>
              <tbody>
                {(data?.payments ?? []).map((p) => {
                  const row = p as { id: string; created_at: string; amount: number; payment_status: string; mercado_pago_payment_id: string | null };
                  const canSync = row.payment_status === "pending" && !!row.mercado_pago_payment_id;
                  return (
                    <tr key={row.id} className="border-t">
                      <td className="py-1">{new Date(row.created_at).toLocaleString("pt-BR")}</td>
                      <td>{brl(Number(row.amount))}</td>
                      <td><Badge variant="outline">{row.payment_status}</Badge></td>
                      <td className="text-xs text-muted-foreground">{row.mercado_pago_payment_id ?? "—"}</td>
                      <td className="text-right">
                        {canSync && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={syncMut.isPending && syncMut.variables === row.id}
                            onClick={() => syncMut.mutate(row.id)}
                          >
                            {syncMut.isPending && syncMut.variables === row.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : "Sincronizar"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
          <section>
            <h3 className="text-sm font-semibold mb-2">Eventos</h3>
            <ul className="space-y-1 text-sm">
              {(data?.events ?? []).map((e) => {
                const row = e as { id: string; created_at: string; event_type: string; description: string | null };
                return (
                  <li key={row.id} className="rounded border bg-muted/30 px-2 py-1">
                    <span className="font-mono text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString("pt-BR")}</span>
                    {" — "}<strong>{row.event_type}</strong>{row.description ? `: ${row.description}` : ""}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
