import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Copy, CheckCircle2, Sparkles, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  getMySubscription,
  createSubscriptionCharge,
  getChargeStatus,
  listPlans,
} from "@/lib/subscriptions.functions";
import { computeSubscriptionStatus, STATUS_LABEL } from "@/lib/subscription-status";
import { SubscriptionStatusBadge } from "@/components/subscription/SubscriptionStatusBadge";
import { brl } from "@/lib/format";
import { PlanUsageCard } from "@/components/admin/PlanUsageCard";
import { normalizePlan, PLAN_LABEL, type TenantPlan } from "@/lib/plan-features";

export const Route = createFileRoute("/admin/assinatura")({ component: PageWrap });

function PageWrap() {
  return (
    <AdminLayout title="Minha assinatura">
      <SubscriptionPage />
    </AdminLayout>
  );
}

function SubscriptionPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: () => getMySubscription(),
  });
  const { data: plansData } = useQuery({ queryKey: ["plans"], queryFn: () => listPlans() });

  const [chargeOpen, setChargeOpen] = useState(false);
  const [charge, setCharge] = useState<{
    payment_id: string;
    qr_code: string;
    qr_code_base64: string;
    ticket_url: string;
    amount: number;
  } | null>(null);

  const chargeMut = useMutation({
    mutationFn: () => createSubscriptionCharge({ data: {} }),
    onSuccess: (r) => {
      setCharge(r);
      setChargeOpen(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useQuery({
    queryKey: ["charge-status", charge?.payment_id],
    queryFn: () => getChargeStatus({ data: { payment_id: charge!.payment_id } }),
    enabled: !!charge && chargeOpen,
    refetchInterval: 5000,
    select: (s) => {
      if (s.payment_status === "approved") {
        toast.success("Pagamento confirmado!");
        setChargeOpen(false);
        setCharge(null);
        qc.invalidateQueries({ queryKey: ["my-subscription"] });
      }
      return s;
    },
  });

  if (isLoading) {
    return <div className="grid place-items-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const sub = data?.subscription ?? null;
  const payments = data?.payments ?? [];
  const computed = computeSubscriptionStatus(sub as never);
  const plan = (sub as { plan?: { name: string; slug: string; features: string[] } } | null)?.plan;
  const features = plan?.features ?? [];
  const isStart = plan?.slug === "start";
  const proPlan = plansData?.plans.find((p) => p.slug === "pro");

  return (
    <div className="space-y-6 max-w-5xl">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              Plano atual: {plan?.name ?? "—"}
              <SubscriptionStatusBadge status={computed.effective} />
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {STATUS_LABEL[computed.effective]}
              {computed.daysRemaining != null && (
                <>
                  {" · "}
                  {computed.daysRemaining >= 0
                    ? `vence em ${computed.daysRemaining} dia(s)`
                    : `vencida há ${Math.abs(computed.daysRemaining)} dia(s)`}
                </>
              )}
            </p>
          </div>
          {sub && Number((sub as { amount: number }).amount) > 0 && (
            <Button onClick={() => chargeMut.mutate()} disabled={chargeMut.isPending}>
              {chargeMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
              Pagar via PIX
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <Info label="Valor" value={brl(Number((sub as { amount?: number } | null)?.amount ?? 0))} />
            <Info label="Período" value={(sub as { billing_period?: string } | null)?.billing_period ?? "—"} />
            <Info
              label="Próximo vencimento"
              value={
                (sub as { due_date?: string | null } | null)?.due_date
                  ? new Date(`${(sub as { due_date: string }).due_date}T00:00:00Z`).toLocaleDateString("pt-BR")
                  : "—"
              }
            />
          </div>
          {features.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold mb-2">Recursos incluídos</p>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {isStart && proPlan && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/20 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Faça upgrade para o Plano Pro</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Desbloqueie pagamento online, múltiplas impressoras, cupom de cozinha e suporte humano.
                </p>
                <p className="mt-2 text-sm font-semibold">{brl(Number(proPlan.monthly_price))}/mês</p>
                <Button className="mt-4" asChild>
                  <Link to="/admin/assinatura" hash="contato">Solicitar upgrade</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Histórico de pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Valor</th>
                    <th className="py-2 pr-3">Período</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="py-2 pr-3">{new Date(p.created_at).toLocaleString("pt-BR")}</td>
                      <td className="py-2 pr-3">{brl(Number(p.amount))}</td>
                      <td className="py-2 pr-3">{p.billing_period}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline">{p.payment_status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pague com PIX</DialogTitle>
            <DialogDescription>
              {charge ? brl(charge.amount) : ""} — escaneie o QR Code ou copie o código abaixo.
            </DialogDescription>
          </DialogHeader>
          {charge && (
            <div className="space-y-4">
              {charge.qr_code_base64 && (
                <img
                  src={`data:image/png;base64,${charge.qr_code_base64}`}
                  alt="QR Code PIX"
                  className="mx-auto h-56 w-56 rounded border"
                />
              )}
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Copia e cola PIX</label>
                <div className="mt-1 flex gap-2">
                  <input
                    readOnly
                    value={charge.qr_code}
                    className="flex-1 rounded border bg-muted/40 px-2 py-1 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(charge.qr_code);
                      toast.success("Código copiado!");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Aguardando confirmação automática do Mercado Pago...
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
