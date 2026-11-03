import { useMemo, useState } from "react";
import type { Order } from "@/lib/domain-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { brl, modeLabel, formatTime } from "@/lib/format";
import { groupBy, spDayKey, dayLabel } from "@/lib/cash-grouping";
import { Eye, ChevronDown, ChevronUp, CheckCircle2, XCircle, ChefHat } from "lucide-react";
import { PrintKitchenButton } from "./PrintKitchenButton";

interface OrdersFinalizedListProps {
  orders: Order[];
  onViewDetails: (order: Order) => void;
}

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function OrdersFinalizedList({ orders, onViewDetails }: OrdersFinalizedListProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [mode, setMode] = useState("all");
  const [day, setDay] = useState("all");

  const allDays = useMemo(() => groupBy(orders, (o) => spDayKey(o.createdAt)).map((g) => g.key), [orders]);
  const groups = useMemo(() => {
    const term = norm(q.trim());
    const filtered = orders
      .filter((o) => status === "all" || (status === "cancelado" ? o.status === "cancelado" : o.status !== "cancelado"))
      .filter((o) => mode === "all" || o.mode === mode)
      .filter((o) => day === "all" || spDayKey(o.createdAt) === day)
      .filter((o) => !term || String(o.number).includes(term) || norm(o.customerName || "").includes(term))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return groupBy(filtered, (o) => spDayKey(o.createdAt));
  }, [orders, q, status, mode, day]);

  if (orders.length === 0) return null;

  return (
    <section>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between py-2 group">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />
          <h3 className="font-bold text-sm text-foreground">Finalizados / Cancelados</h3>
          <Badge className="rounded-full px-2 py-0 text-[10px] bg-muted text-muted-foreground">{orders.length}</Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" asChild>
          <span>{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
        </Button>
      </button>

      {open && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nº ou cliente" className="h-8 w-48" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas situações</SelectItem>
                <SelectItem value="finalizado">Finalizados</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="entrega">Entrega</SelectItem>
                <SelectItem value="retirada">Retirada</SelectItem>
                <SelectItem value="consumo_local">Local</SelectItem>
              </SelectContent>
            </Select>
            <Select value={day} onValueChange={setDay}>
              <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as datas</SelectItem>
                {allDays.map((d) => <SelectItem key={d} value={d}>{dayLabel(d)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {groups.length === 0 ? (
            <p className="rounded-xl border bg-card px-3 py-4 text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
          ) : (
            <Accordion type="multiple" defaultValue={[groups[0].key]} className="space-y-2">
              {groups.map((g) => (
                <AccordionItem key={g.key} value={g.key} className="border border-border rounded-xl overflow-hidden bg-card">
                  <AccordionTrigger className="px-3 py-2 hover:no-underline">
                    <span className="flex flex-1 items-center justify-between pr-2 text-sm">
                      <span className="font-semibold">{dayLabel(g.key)} <span className="text-xs font-normal text-muted-foreground">· {g.items.length} pedido(s)</span></span>
                      <b className="text-primary">{brl(g.items.filter((o) => o.status !== "cancelado").reduce((a, o) => a + o.total, 0))}</b>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <div className="flex items-center gap-3 border-y bg-muted/30 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      <span className="w-4 shrink-0" />
                      <span className="w-14 shrink-0">Pedido</span>
                      <span className="flex-1 min-w-0">Cliente</span>
                      <span className="hidden sm:inline-block w-24 shrink-0">Tipo</span>
                      <span className="hidden md:inline-block w-14 shrink-0">Hora</span>
                      <span className="w-20 shrink-0 text-right">Total</span>
                      <span className="w-[7.5rem] shrink-0 text-right">Ações</span>
                    </div>
                    <div className="divide-y">
                      {g.items.map((order) => {
                        const cancelled = order.status === "cancelado";
                        return (
                          <div key={order.id} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/40 transition-colors">
                            {cancelled ? <XCircle className="h-4 w-4 text-destructive shrink-0" /> : <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
                            <span className="font-bold text-foreground w-14 shrink-0">#{order.number}</span>
                            <span className="font-medium text-foreground truncate flex-1 min-w-0" title={order.customerName}>{order.customerName || "Sem nome"}</span>
                            <span className="hidden sm:inline-block text-xs text-muted-foreground shrink-0 w-24 truncate">{modeLabel[order.mode]}</span>
                            <span className="hidden md:inline-block text-xs text-muted-foreground shrink-0 w-14">{formatTime(order.createdAt)}</span>
                            <span className="font-semibold text-primary shrink-0 w-20 text-right">{brl(order.total)}</span>
                            <span className="flex w-[7.5rem] shrink-0 justify-end gap-1">
                              <PrintKitchenButton order={order} size="icon" variant="ghost" className="h-8 w-8 shrink-0" />
                              <Button variant="outline" size="sm" onClick={() => onViewDetails(order)} className="h-8 px-2 text-xs shrink-0">
                                <Eye className="h-3.5 w-3.5 sm:mr-1.5" />
                                <span className="hidden sm:inline">Visualizar</span>
                              </Button>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground flex items-center gap-1">
            <ChefHat className="h-3 w-3" /> Clique no chapéu para reimprimir a comanda da cozinha.
          </div>
        </div>
      )}
    </section>
  );
}
