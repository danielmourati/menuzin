import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, MessageCircle, MoreHorizontal, Eye } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { brl, modeLabel, statusColor, statusLabel } from "@/lib/format";
import { orders as initialOrders, store, type Order, type OrderStatus } from "@/lib/mock-data";
import { whatsappLink } from "@/lib/whatsapp";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pedidos")({
  component: OrdersPage,
});

const STATUSES: OrderStatus[] = ["novo", "confirmado", "preparo", "saiu_entrega", "pronto_retirada", "finalizado", "cancelado"];

function OrdersPage() {
  const [list, setList] = useState<Order[]>(initialOrders);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [modeFilter, setModeFilter] = useState<string>("todos");
  const [details, setDetails] = useState<Order | null>(null);

  const filtered = useMemo(() => list.filter((o) => {
    if (statusFilter !== "todos" && o.status !== statusFilter) return false;
    if (modeFilter !== "todos" && o.mode !== modeFilter) return false;
    if (q && !`${o.number} ${o.customerName}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [list, q, statusFilter, modeFilter]);

  const setStatus = (id: string, status: OrderStatus) => {
    setList((p) => p.map((o) => o.id === id ? { ...o, status } : o));
    toast.success("Status atualizado");
  };

  return (
    <AdminLayout title="Pedidos">
      <div className="space-y-4">
        <Card><CardContent className="p-4 grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por cliente ou nº" className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={modeFilter} onValueChange={setModeFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas modalidades</SelectItem>
              <SelectItem value="entrega">Entrega</SelectItem>
              <SelectItem value="retirada">Retirada</SelectItem>
              <SelectItem value="consumo_local">Consumo local</SelectItem>
            </SelectContent>
          </Select>
        </CardContent></Card>

        <div className="grid gap-3">
          {filtered.length === 0 && (
            <Card><CardContent className="p-10 text-center text-muted-foreground">Nenhum pedido encontrado.</CardContent></Card>
          )}
          {filtered.map((o) => (
            <Card key={o.id}>
              <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">#{o.number}</span>
                    <Badge variant="secondary" className={statusColor[o.status]}>{statusLabel[o.status]}</Badge>
                    <Badge variant="outline">{modeLabel[o.mode]}</Badge>
                  </div>
                  <p className="mt-1 text-sm">{o.customerName} · <span className="text-muted-foreground">{o.whatsapp}</span></p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                    {o.items.map((i) => `${i.qty}x ${i.name}`).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="font-bold">{brl(o.total)}</p>
                    <p className="text-xs text-muted-foreground">{o.payment}</p>
                  </div>
                  <Button size="icon" variant="outline" onClick={() => setDetails(o)}><Eye className="h-4 w-4" /></Button>
                  <Button asChild size="icon" variant="outline">
                    <a href={whatsappLink(o.whatsapp, `Olá ${o.customerName}, sobre o pedido #${o.number}…`)} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-4 w-4 text-success" />
                    </a>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button size="icon" variant="outline"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {STATUSES.map((s) => (
                        <DropdownMenuItem key={s} onSelect={() => setStatus(o.id, s)}>Marcar como {statusLabel[s]}</DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => { navigator.clipboard?.writeText(`Pedido #${o.number}`); toast.success("Resumo copiado"); }}>Copiar resumo</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!details} onOpenChange={(v) => !v && setDetails(null)}>
        <DialogContent className="max-w-md">
          {details && (
            <>
              <DialogHeader><DialogTitle>Pedido #{details.number}</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className={statusColor[details.status]}>{statusLabel[details.status]}</Badge>
                  <Badge variant="outline">{modeLabel[details.mode]}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{details.customerName} · {details.whatsapp}</p>
                </div>
                {details.address && (
                  <div><p className="text-muted-foreground">Endereço</p>
                    <p>{details.address.street}, {details.address.number} — {details.address.neighborhood}</p></div>
                )}
                {details.table && <div><p className="text-muted-foreground">Mesa</p><p>{details.table}</p></div>}
                <div><p className="text-muted-foreground">Itens</p>
                  <ul className="mt-1 space-y-1">
                    {details.items.map((i, idx) => (
                      <li key={idx} className="flex justify-between"><span>{i.qty}x {i.name}</span><span>{brl(i.unitPrice * i.qty)}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{brl(details.subtotal)}</span></div>
                  {details.deliveryFee > 0 && <div className="flex justify-between text-muted-foreground"><span>Entrega</span><span>{brl(details.deliveryFee)}</span></div>}
                  <div className="flex justify-between font-bold"><span>Total</span><span>{brl(details.total)}</span></div>
                </div>
                <Button asChild className="w-full bg-success hover:bg-success/90 text-success-foreground">
                  <a href={whatsappLink(details.whatsapp, `Olá ${details.customerName}!`)} target="_blank" rel="noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" /> Conversar no WhatsApp
                  </a>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
// store unused-import guard
void store;
