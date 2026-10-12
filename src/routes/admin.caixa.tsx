import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlanGate } from "@/components/subscription/PlanGate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wallet, ArrowDownToLine, Lock, Trash2, Truck, CheckCircle2, Eye, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "@/hooks/useConfirm";
import { maskBRL, parseBRL } from "@/lib/masks";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getCashOverview, openCashSession, addCashWithdrawal, deleteCashWithdrawal,
  closeCashSession, settleDriver, payDriverFees, undoDriverFees, getClosedCashSessionDetail,
} from "@/lib/cash.functions";

export const Route = createFileRoute("/admin/caixa")({
  validateSearch: (s: Record<string, unknown>) => ({ tab: typeof s.tab === "string" ? s.tab : undefined }),
  head: () => ({
    meta: [
      { title: "Caixa — Menuzin" },
      { name: "description", content: "Abertura de turno, sangrias, fechamento cego e prestação de contas dos entregadores." },
      { property: "og:title", content: "Caixa — Menuzin" },
      { property: "og:description", content: "Controle de caixa enxuto para delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PlanGate min="pro" title="Caixa" featureLabel="Controle de Caixa">
      <CashPage />
    </PlanGate>
  ),
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const parseMoney = (s: string) => {
  const n = Number(s.replace(/[^\d,.]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};
const fmtDate = (s: string) => new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

type CloseResult = Awaited<ReturnType<typeof closeCashSession>>;

function CashPage() {
  const qc = useQueryClient();
  const { tab } = Route.useSearch();
  const { data, isLoading } = useQuery({ queryKey: ["cash-overview"], queryFn: () => getCashOverview(), refetchInterval: 30000 });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["cash-overview"] });
    qc.invalidateQueries({ queryKey: ["cash-shift-status"] });
  };
  const [float, setFloat] = useState("100,00");
  const [wAmount, setWAmount] = useState("");
  const [wReason, setWReason] = useState("");
  const [counted, setCounted] = useState("");
  const [closeOpen, setCloseOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [result, setResult] = useState<CloseResult | null>(null);
  const [feeDriver, setFeeDriver] = useState<{ id: string; name: string; total: number } | null>(null);

  const openM = useMutation({
    mutationFn: (v: number) => openCashSession({ data: { opening_float: v } }),
    onSuccess: () => { toast.success("Turno aberto."); setResult(null); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const wM = useMutation({
    mutationFn: (v: { amount: number; reason: string }) => addCashWithdrawal({ data: v }),
    onSuccess: () => { toast.success("Sangria registrada."); setWAmount(""); setWReason(""); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delM = useMutation({
    mutationFn: (id: string) => deleteCashWithdrawal({ data: { id } }),
    onSuccess: refresh,
  });
  const settleM = useMutation({
    mutationFn: (v: { driver_id: string; driver_name: string; amount: number }) => settleDriver({ data: v }),
    onSuccess: () => { toast.success("Dinheiro do entregador conferido."); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const payFeesM = useMutation({
    mutationFn: (v: { driver_id: string; method: "cash" | "pix" }) => payDriverFees({ data: v }),
    onSuccess: (r, v) => { toast.success(v.method === "cash" ? `Taxas pagas: sangria de ${brl(r.amount)} registrada.` : "Taxas pagas via Pix."); setFeeDriver(null); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const undoFeesM = useMutation({
    mutationFn: (driver_id: string) => undoDriverFees({ data: { driver_id } }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });
  const closeM = useMutation({
    mutationFn: (v: number) => closeCashSession({ data: { counted_amount: v } }),
    onSuccess: (r) => { setResult(r); setCounted(""); setCloseOpen(false); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const open = data?.open;
  const detailQ = useQuery({
    queryKey: ["closed-cash-session", detailId],
    queryFn: () => {
      if (!detailId) throw new Error("Turno não selecionado.");
      return getClosedCashSessionDetail({ data: { session_id: detailId } });
    },
    enabled: !!detailId,
  });

  return (
    <AdminLayout title="Caixa">
      <div className="mx-auto max-w-4xl space-y-4">
        {result && <CloseResultCard r={result} onDismiss={() => setResult(null)} />}

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !open ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Abrir turno</CardTitle>
              <CardDescription>Informe quanto dinheiro tem na gaveta para troco.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label>Fundo de troco inicial</Label>
                <Input inputMode="decimal" value={float} onChange={(e) => setFloat(e.target.value)} className="mt-1 h-11 text-lg" />
              </div>
              <Button className="h-11" disabled={openM.isPending} onClick={() => {
                const v = parseMoney(float);
                if (!(v >= 0)) return toast.error("Valor inválido.");
                openM.mutate(v);
              }}>
                {openM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Abrir turno
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <Badge className="mb-1">Turno aberto</Badge>
                  <p className="text-sm text-muted-foreground">
                    Desde {fmtDate(open.opened_at)}{open.opened_by_name ? ` · ${open.opened_by_name}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Fundo inicial</p>
                  <p className="text-xl font-extrabold">{brl(open.opening_float)}</p>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue={tab === "entregadores" ? "entregadores" : "caixa"}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="caixa">Caixa</TabsTrigger>
                <TabsTrigger value="entregadores">Entregadores ({open.drivers.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="caixa" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><ArrowDownToLine className="h-4 w-4" /> Registrar sangria</CardTitle>
                    <CardDescription>Dinheiro retirado da gaveta (ex.: depósito no cofre).</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
                      <Input inputMode="decimal" placeholder="R$ 0,00" value={wAmount} onChange={(e) => setWAmount(e.target.value)} className="h-11" />
                      <Input placeholder="Motivo (ex.: Depósito no cofre)" value={wReason} onChange={(e) => setWReason(e.target.value)} maxLength={200} className="h-11" />
                      <Button className="h-11" disabled={wM.isPending} onClick={() => {
                        const v = parseMoney(wAmount);
                        if (!(v > 0)) return toast.error("Informe o valor.");
                        wM.mutate({ amount: v, reason: wReason.trim() });
                      }}>Registrar</Button>
                    </div>
                    {open.movements.length > 0 && (
                      <ul className="divide-y rounded-lg border text-sm">
                        {open.movements.map((m) => (
                          <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2">
                            <span><b>{brl(Number(m.amount))}</b> — {m.reason || "Sangria"} <span className="text-xs text-muted-foreground">· {fmtDate(m.created_at)}</span></span>
                            <Button size="icon" variant="ghost" aria-label="Excluir sangria" onClick={async () => {
                              if (await confirmDialog({ title: "Excluir sangria?", description: "Esta sangria deixará de contar no fechamento." })) delM.mutate(m.id);
                            }}><Trash2 className="h-4 w-4" /></Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><Lock className="h-4 w-4" /> Fechar caixa</CardTitle>
                    <CardDescription>Ao fechar, você informa o dinheiro contado na gaveta. O sistema compara só depois.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {open.pending.length > 0 && (
                      <p className="rounded-lg bg-muted px-3 py-2 text-xs">
                        {open.pending.length} pedido(s) em dinheiro ainda não finalizado(s) ({open.pending.map((p) => `#${p.number}`).join(", ")}) — não entram no esperado.
                      </p>
                    )}
                    <Button variant="destructive" className="h-11 w-full sm:w-auto" onClick={() => { setCounted(""); setCloseOpen(true); }}>
                      Fechar turno
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="entregadores" className="space-y-3">
                {open.drivers.length === 0 ? (
                  <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
                    Nenhuma entrega com entregador atribuído neste turno.
                  </CardContent></Card>
                ) : open.drivers.map((d) => (
                  <Card key={d.driver_id ?? d.driver_name}>
                    <CardContent className="space-y-4 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm">
                          <p className="flex items-center gap-1.5 font-bold"><Truck className="h-4 w-4 text-primary" /> {d.driver_name} <span className="font-normal text-muted-foreground">· {d.deliveries.length} entrega(s)</span></p>
                          {d.orders > 0 ? (
                            <>
                              <p className="mt-1">Cobrar dos clientes: <b>{brl(d.to_collect)}</b> · Troco levado do caixa: <b>{brl(d.change_out)}</b></p>
                              <p className="text-base">Dinheiro a devolver ao caixa: <b className="text-primary">{brl(d.must_return)}</b> <span className="text-xs text-muted-foreground">(notas recebidas dos clientes, incluindo o troco levado)</span></p>
                            </>
                          ) : <p className="mt-1 text-muted-foreground">Sem dinheiro a devolver (todas as entregas foram Pix/cartão).</p>}
                        </div>
                        {d.orders > 0 && (d.settled_at ? (
                          <Badge variant="secondary" className="gap-1 self-start"><CheckCircle2 className="h-3.5 w-3.5" /> Dinheiro devolvido em {fmtDate(d.settled_at)}</Badge>
                        ) : (
                          <Button disabled={settleM.isPending || !d.driver_id} onClick={() => d.driver_id && settleM.mutate({ driver_id: d.driver_id, driver_name: d.driver_name, amount: d.must_return })}>
                            Confirmar dinheiro recebido do entregador
                          </Button>
                        ))}
                      </div>

                      <div className="rounded-lg border">
                        <div className="border-b bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Taxas de entrega (loja → entregador)</div>
                        <ul className="divide-y text-sm">
                          {d.deliveries.map((x) => (
                            <li key={x.id} className="flex items-center justify-between gap-2 px-3 py-1.5">
                              <span>#{x.number} <span className="text-muted-foreground">· {x.neighborhood || "—"} · {x.is_cash ? "Dinheiro" : x.payment_label || "—"}</span></span>
                              <b>{brl(x.fee)}</b>
                            </li>
                          ))}
                        </ul>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2">
                          <span className="text-sm">{d.fees_paid_at ? "Taxas de entrega pagas" : "Taxas de entrega a pagar ao entregador"}: <b className="text-primary text-base">{brl(d.fees_total)}</b></span>
                          {d.fees_paid_at ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Pagas em {d.fees_paid_method === "cash" ? "Dinheiro" : "Pix"} {fmtDate(d.fees_paid_at)}</Badge>
                              <Button size="sm" variant="ghost" disabled={undoFeesM.isPending} onClick={async () => {
                                if (d.driver_id && await confirmDialog({ title: "Desfazer pagamento das taxas?", description: d.fees_paid_method === "cash" ? "A sangria gerada também será removida." : "O pagamento deixará de constar." })) undoFeesM.mutate(d.driver_id);
                              }}>Desfazer</Button>
                            </div>
                          ) : (
                            <Button size="sm" disabled={d.fees_total <= 0 || !d.driver_id} onClick={() => setFeeDriver({ id: d.driver_id!, name: d.driver_name, total: d.fees_total })}>
                              Pagar taxas
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Dialog open={!!feeDriver} onOpenChange={(v) => !v && setFeeDriver(null)}>
                  <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Pagar taxas — {feeDriver?.name}</DialogTitle></DialogHeader>
                    <p className="text-sm">Total: <b>{brl(feeDriver?.total ?? 0)}</b>. Como será pago?</p>
                    <div className="grid gap-2">
                      <Button disabled={payFeesM.isPending} onClick={() => feeDriver && payFeesM.mutate({ driver_id: feeDriver.id, method: "cash" })}>
                        Dinheiro da gaveta (registra sangria)
                      </Button>
                      <Button variant="outline" disabled={payFeesM.isPending} onClick={() => feeDriver && payFeesM.mutate({ driver_id: feeDriver.id, method: "pix" })}>
                        Pix
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </TabsContent>
            </Tabs>
          </>
        )}


        <Dialog open={closeOpen} onOpenChange={(v) => { if (!closeM.isPending) { setCloseOpen(v); if (!v) setCounted(""); } }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Fechar turno</DialogTitle>
              <DialogDescription>Conte o dinheiro físico da gaveta e digite o valor. O sistema compara só depois.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="counted">Dinheiro contado na gaveta</Label>
              <Input
                id="counted" inputMode="numeric" autoFocus placeholder="R$ 0,00"
                value={counted} onChange={(e) => setCounted(maskBRL(e.target.value))}
                className="h-12 text-xl font-bold"
              />
              <p className="text-xs text-muted-foreground">Depois de fechar não é possível alterar.</p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" disabled={closeM.isPending} onClick={() => { setCloseOpen(false); setCounted(""); }}>Cancelar</Button>
              <Button variant="destructive" disabled={!counted || closeM.isPending} onClick={() => {
                const v = parseBRL(counted);
                if (!(v >= 0)) return toast.error("Informe o valor contado.");
                closeM.mutate(v);
              }}>
                {closeM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar fechamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {(data?.history?.length ?? 0) > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Turnos anteriores</CardTitle></CardHeader>
            <CardContent>
              <ul className="divide-y text-sm">
                {data!.history.map((h) => {
                  const diff = Number(h.difference ?? 0);
                  return (
                    <li key={h.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <button type="button" className="grid min-w-0 gap-2 text-left sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" onClick={() => setDetailId(h.id)}>
                        <span className="font-medium">{fmtDate(h.opened_at)} → {h.closed_at ? fmtDate(h.closed_at) : "-"}</span>
                        <span className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                          <span>Esperado <b className="text-foreground">{brl(Number(h.expected_amount ?? 0))}</b></span>
                          <span>Contado <b className="text-foreground">{brl(Number(h.counted_amount ?? 0))}</b></span>
                        </span>
                      </button>
                      <div className="flex items-center justify-between gap-2 sm:justify-end">
                        <DiffBadge diff={diff} />
                        <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setDetailId(h.id)}>
                          <Eye className="h-4 w-4" /> Ver detalhes
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        <Dialog open={!!detailId} onOpenChange={(openDialog) => { if (!openDialog) setDetailId(null); }}>
          <DialogContent className="max-h-[92dvh] w-[calc(100%-1rem)] max-w-3xl overflow-y-auto p-0 sm:w-full">
            <DialogHeader className="border-b px-5 py-4 pr-12">
              <DialogTitle>Detalhes do turno</DialogTitle>
              {detailQ.data && (
                <DialogDescription>
                  {fmtDate(detailQ.data.opened_at)} → {fmtDate(detailQ.data.closed_at)}
                </DialogDescription>
              )}
            </DialogHeader>

            {detailQ.isLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
            ) : detailQ.isError ? (
              <div className="space-y-3 px-5 py-12 text-center">
                <p className="text-sm text-muted-foreground">Não foi possível carregar os detalhes deste turno.</p>
                <Button variant="outline" className="gap-2" onClick={() => detailQ.refetch()}><RefreshCw className="h-4 w-4" /> Tentar novamente</Button>
              </div>
            ) : detailQ.data ? (
              <div className="space-y-6 px-5 py-5">
                <section>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs font-medium text-muted-foreground">Esperado</p>
                      <p className="mt-1 text-xl font-extrabold sm:text-2xl">{brl(detailQ.data.expected)}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs font-medium text-muted-foreground">Contado</p>
                      <p className="mt-1 text-xl font-extrabold sm:text-2xl">{brl(detailQ.data.counted)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
                    <span className="text-sm font-medium">Resultado do fechamento</span>
                    <DiffBadge diff={detailQ.data.difference} />
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 text-sm font-bold">Resumo financeiro</h3>
                  <div className="divide-y rounded-lg border text-sm">
                    <div className="flex justify-between gap-3 px-4 py-2.5"><span>Fundo inicial</span><b>{brl(detailQ.data.opening_float)}</b></div>
                    <div className="flex justify-between gap-3 px-4 py-2.5"><span>+ Vendas em dinheiro</span><b>{brl(detailQ.data.cash_sales)}</b></div>
                    <div className="flex justify-between gap-3 px-4 py-2.5"><span>− Sangrias</span><b>{brl(detailQ.data.withdrawals)}</b></div>
                    <div className="flex justify-between gap-3 bg-muted/30 px-4 py-3 font-bold"><span>Total esperado</span><span>{brl(detailQ.data.expected)}</span></div>
                  </div>
                  {(detailQ.data.opened_by_name || detailQ.data.closed_by_name) && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {detailQ.data.opened_by_name ? `Aberto por ${detailQ.data.opened_by_name}` : ""}
                      {detailQ.data.opened_by_name && detailQ.data.closed_by_name ? " · " : ""}
                      {detailQ.data.closed_by_name ? `Fechado por ${detailQ.data.closed_by_name}` : ""}
                    </p>
                  )}
                </section>

                <section>
                  <h3 className="mb-3 text-sm font-bold">Sangrias</h3>
                  {detailQ.data.movements.length === 0 ? (
                    <p className="rounded-lg border px-4 py-4 text-sm text-muted-foreground">Nenhuma sangria registrada neste turno.</p>
                  ) : (
                    <ul className="divide-y rounded-lg border text-sm">
                      {detailQ.data.movements.map((movement) => (
                        <li key={movement.id} className="flex items-start justify-between gap-4 px-4 py-3">
                          <span className="min-w-0"><b className="block">{movement.reason || "Sangria"}</b><span className="text-xs text-muted-foreground">{fmtDate(movement.created_at)}</span></span>
                          <b className="shrink-0">{brl(movement.amount)}</b>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <h3 className="mb-3 text-sm font-bold">Entregadores</h3>
                  {detailQ.data.drivers.length === 0 ? (
                    <p className="rounded-lg border px-4 py-4 text-sm text-muted-foreground">Nenhuma entrega com entregador neste turno.</p>
                  ) : (
                    <div className="space-y-3">
                      {detailQ.data.drivers.map((driver) => (
                        <div key={driver.driver_id ?? driver.driver_name} className="space-y-3 rounded-lg border p-4">
                          <div>
                            <p className="flex items-center gap-1.5 font-bold"><Truck className="h-4 w-4 text-primary" /> {driver.driver_name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{driver.deliveries.length} entrega(s) · {driver.orders} paga(s) em dinheiro</p>
                          </div>

                          <div className="rounded-md border">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dinheiro das entregas (entregador → caixa)</span>
                              {driver.settled_at ? (
                                <Badge variant="secondary" title="O dinheiro recebido dos clientes foi conferido e devolvido ao caixa.">Dinheiro devolvido em {fmtDate(driver.settled_at)}</Badge>
                              ) : driver.orders > 0 ? (
                                <Badge variant="outline" title="Ainda não foi marcado que o entregador devolveu o dinheiro recebido dos clientes.">Dinheiro não devolvido</Badge>
                              ) : null}
                            </div>
                            {driver.orders > 0 ? (
                              <div className="space-y-1 px-3 py-2 text-sm">
                                <div className="flex justify-between"><span className="text-muted-foreground">Cobrado dos clientes</span><b>{brl(driver.to_collect)}</b></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Troco levado do caixa</span><b>{brl(driver.change_out)}</b></div>
                                <div className="flex justify-between border-t pt-1"><span>Dinheiro a devolver ao caixa</span><b className="text-primary">{brl(driver.must_return)}</b></div>
                                <p className="text-xs text-muted-foreground">Soma das notas recebidas dos clientes, já incluindo o troco levado.</p>
                                <ul className="mt-1 divide-y text-xs">
                                  {driver.deliveries.filter((x) => x.is_cash).map((x) => (
                                    <li key={x.id} className="flex justify-between gap-2 py-1">
                                      <span>#{x.number} · total {brl(x.total)}</span>
                                      <span>cliente pagou com <b>{brl(x.paid_with ?? x.total)}</b></span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <p className="px-3 py-2 text-sm text-muted-foreground">Sem dinheiro a devolver (todas as entregas foram Pix/cartão).</p>
                            )}
                          </div>

                          <div className="rounded-md border">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Taxas de entrega (loja → entregador)</span>
                              {driver.fees_paid_at ? (
                                <Badge variant="secondary" title="A loja já pagou ao entregador as taxas deste turno.">Taxas pagas em {driver.fees_paid_method === "cash" ? "dinheiro" : "Pix"} · {fmtDate(driver.fees_paid_at)}</Badge>
                              ) : driver.fees_total > 0 ? (
                                <Badge variant="outline" title="A loja ainda não pagou ao entregador as taxas de entrega deste turno.">Taxas a pagar ao entregador</Badge>
                              ) : null}
                            </div>
                            <div className="px-3 py-2 text-sm">
                              <div className="flex justify-between"><span className="text-muted-foreground">{driver.deliveries.length} entrega(s) · taxas {driver.fees_paid_at ? "pagas" : "a receber"}</span><b>{brl(driver.fees_total)}</b></div>
                              <ul className="mt-1 divide-y text-xs">
                                {driver.deliveries.map((x) => (
                                  <li key={x.id} className="flex justify-between gap-2 py-1">
                                    <span>#{x.number} · {x.neighborhood || "—"} · {x.is_cash ? "Dinheiro" : x.payment_label || "—"}</span>
                                    <b>{brl(x.fee)}</b>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

function DiffBadge({ diff }: { diff: number }) {
  if (Math.abs(diff) < 0.005) return <Badge className="bg-primary">Bateu</Badge>;
  return diff > 0
    ? <Badge variant="secondary">Sobra de {brl(diff)}</Badge>
    : <Badge variant="destructive">Falta de {brl(-diff)}</Badge>;
}

function CloseResultCard({ r, onDismiss }: { r: CloseResult; onDismiss: () => void }) {
  return (
    <Card className="border-2 border-primary/40">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Resultado do fechamento</CardTitle>
        <DiffBadge diff={r.difference} />
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <div className="flex justify-between"><span>Fundo inicial</span><span>{brl(r.opening_float)}</span></div>
        <div className="flex justify-between"><span>+ Pedidos em dinheiro</span><span>{brl(r.cash_sales)}</span></div>
        <div className="flex justify-between"><span>− Sangrias</span><span>{brl(r.withdrawals)}</span></div>
        <div className="flex justify-between border-t pt-1 font-bold"><span>Esperado</span><span>{brl(r.expected)}</span></div>
        <div className="flex justify-between font-bold"><span>Contado</span><span>{brl(r.counted)}</span></div>
        {r.pendingCount > 0 && <p className="pt-1 text-xs text-muted-foreground">{r.pendingCount} pedido(s) em dinheiro não finalizados ficaram fora do cálculo.</p>}
        <Button variant="outline" className="mt-3" onClick={onDismiss}>Ok</Button>
      </CardContent>
    </Card>
  );
}
