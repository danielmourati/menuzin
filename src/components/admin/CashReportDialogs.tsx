import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getOpenCashReport, type OpenReportOrder } from "@/lib/cash.functions";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (s: string) => new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const fmtTime = (s: string) => new Date(s).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const MODE: Record<string, string> = { entrega: "Entrega", retirada: "Retirada", consumo_local: "Local" };
const STATUS: Record<string, string> = {
  novo: "Novo", aceito: "Aceito", preparo: "Em preparo", saiu_entrega: "Saiu p/ entrega",
  pronto_retirada: "Pronto p/ retirada", servido: "Servido", finalizado: "Finalizado", cancelado: "Cancelado",
};

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={strong ? "text-xl font-extrabold" : "text-lg font-bold"}>{value}</p>
    </div>
  );
}

type Filter = "todos" | "pendentes" | "cancelados";

export function OpenCashReportDialog({
  open, onOpenChange, mode,
}: { open: boolean; onOpenChange: (v: boolean) => void; mode: "summary" | "full" }) {
  const q = useQuery({
    queryKey: ["open-cash-report"],
    queryFn: () => getOpenCashReport(),
    enabled: open,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const [filter, setFilter] = useState<Filter>("todos");
  const r = q.data;

  const orders: OpenReportOrder[] = (r?.orders ?? []).filter((o) =>
    filter === "todos" ? true : filter === "cancelados" ? o.status === "cancelado" : o.status !== "cancelado" && o.status !== "finalizado",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-1rem)] max-w-3xl overflow-y-auto p-0 sm:w-full">
        <DialogHeader className="border-b px-5 py-4 pr-12">
          <DialogTitle>{mode === "summary" ? "Resumo do turno atual" : "Relatório completo do turno"}</DialogTitle>
          {r && (
            <DialogDescription>
              Desde {fmtDate(r.opened_at)}{r.opened_by_name ? ` · ${r.opened_by_name}` : ""}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-5 p-5">
          {q.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : q.isError || !r ? (
            <div className="space-y-3 py-6 text-center text-sm">
              <p className="text-destructive">{(q.error as Error | null)?.message ?? "Não foi possível carregar o turno."}</p>
              <Button variant="outline" size="sm" onClick={() => q.refetch()}><RefreshCw className="mr-2 h-4 w-4" /> Tentar de novo</Button>
            </div>
          ) : (
            <>
              {!r.can_see_cash && (
                <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-xs">
                  <EyeOff className="mt-0.5 h-4 w-4 shrink-0" />
                  Valores em dinheiro ficam ocultos até o fechamento cego. Só dono/admin vê esses números.
                </p>
              )}

              <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Stat label="Fundo inicial" value={brl(r.opening_float)} />
                <Stat label="Pedidos" value={String(r.orders_count)} />
                <Stat label="Pendentes" value={String(r.pending_count)} />
                {r.can_see_cash
                  ? <Stat label="Total vendido" value={brl(r.total_sold ?? 0)} strong />
                  : <Stat label="Vendido (Pix/cartão/outros)" value={brl(r.non_cash_sold)} strong />}
                <Stat label={`Sangrias (${r.withdrawals_count})`} value={brl(r.withdrawals)} />
                <Stat label={`Cancelados (${r.cancelled_count})`} value={r.cancelled_total != null ? brl(r.cancelled_total) : String(r.cancelled_count)} />
              </section>

              {r.can_see_cash && (
                <section className="grid grid-cols-2 gap-2">
                  <Stat label="Vendas em dinheiro (finalizadas)" value={brl(r.cash_sales ?? 0)} />
                  <Stat label="Esperado na gaveta" value={brl(r.expected ?? 0)} strong />
                  <p className="col-span-2 text-xs text-muted-foreground">
                    Esperado = fundo inicial + vendas em dinheiro finalizadas − sangrias.
                  </p>
                </section>
              )}

              {mode === "full" && (
                <>
                  <section>
                    <h3 className="mb-2 text-sm font-bold">Vendas por forma de pagamento</h3>
                    {r.payments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum pedido neste turno.</p>
                    ) : (
                      <ul className="divide-y rounded-lg border text-sm">
                        {r.payments.map((p) => (
                          <li key={p.label} className="flex items-center justify-between gap-2 px-3 py-2">
                            <span>{p.label} <span className="text-xs text-muted-foreground">· {p.count} pedido(s)</span></span>
                            <b>{p.total != null ? brl(p.total) : "oculto"}</b>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  {r.movements.length > 0 && (
                    <section>
                      <h3 className="mb-2 text-sm font-bold">Sangrias</h3>
                      <ul className="divide-y rounded-lg border text-sm">
                        {r.movements.map((m) => (
                          <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2">
                            <span>{m.reason || "Sangria"} <span className="text-xs text-muted-foreground">· {fmtDate(m.created_at)}</span></span>
                            <b>{brl(m.amount)}</b>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <section>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold">Pedidos do turno ({r.orders.length})</h3>
                      <div className="flex gap-1">
                        {(["todos", "pendentes", "cancelados"] as Filter[]).map((f) => (
                          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="h-8 capitalize" onClick={() => setFilter(f)}>
                            {f}
                          </Button>
                        ))}
                      </div>
                    </div>
                    {orders.length === 0 ? (
                      <p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">Nenhum pedido neste filtro.</p>
                    ) : (
                      <ul className="divide-y rounded-lg border text-sm">
                        {orders.map((o) => {
                          const cancelled = o.status === "cancelado";
                          return (
                            <li key={o.id} className={`flex items-start justify-between gap-3 px-3 py-2 ${cancelled ? "bg-destructive/5" : ""}`}>
                              <div className="min-w-0">
                                <p className={`font-semibold ${cancelled ? "line-through text-muted-foreground" : ""}`}>
                                  #{o.number} <span className="font-normal text-muted-foreground">· {fmtTime(o.created_at)} · {o.customer_name || "Sem nome"}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {MODE[o.mode] ?? o.mode} · {o.payment_label}
                                  {o.is_cash && o.total != null && !o.no_change && o.change_for ? ` · nota de ${brl(o.change_for)}` : ""}
                                  {o.is_cash && o.total != null && o.no_change ? " · sem troco" : ""}
                                </p>
                                <Badge variant={cancelled ? "destructive" : "secondary"} className="mt-1 text-[10px]">{STATUS[o.status] ?? o.status}</Badge>
                              </div>
                              <b className={`shrink-0 ${cancelled ? "line-through text-muted-foreground" : ""}`}>
                                {o.total != null ? brl(o.total) : "oculto"}
                              </b>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
