import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Minus, Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { getOrderItemsForEdit, updateOrderItems } from "@/lib/orders.functions";
import { listMyDrivers, assignDriverToOrder } from "@/lib/drivers.functions";
import { listMyCategories, listMyProducts, listAddonGroups } from "@/lib/catalog-admin.functions";
import { ProductFinderModal, type FinderRow } from "@/components/pdv/ProductFinderModal";
import { ProductModal } from "@/components/storefront/ProductModal";
import { dbProductToUi } from "@/lib/db-adapters";
import { computeUnitPrice, type CartItem } from "@/lib/cart-context";
import { requiresCustomization } from "@/lib/pdv-customization";
import { ChangePaymentDialog } from "./ChangePaymentDialog";
import type { Order } from "@/lib/domain-types";

type EditItem = {
  key: string;
  id: string | null;
  product_id: string | null;
  name_snapshot: string;
  qty: number;
  unit_price: number;
  addons: { name: string; price: number }[];
  note: string | null;
};

const EDITABLE = ["novo", "aceito", "preparo"];

export function EditOrderDialog({
  open, onOpenChange, order, rules,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: Order;
  rules: { accepts100: boolean; accepts200: boolean };
}) {
  const qc = useQueryClient();
  const canEditItems = EDITABLE.includes(order.status);
  const { data, isLoading } = useQuery({
    queryKey: ["order-edit", order.id, open],
    queryFn: () => getOrderItemsForEdit({ data: { order_id: order.id } }),
    enabled: open,
    staleTime: 0,
  });
  const [items, setItems] = useState<EditItem[]>([]);
  useEffect(() => {
    if (data?.items) setItems(data.items.map((it) => ({ ...it, key: it.id })));
  }, [data]);

  const { data: catsData } = useQuery({ queryKey: ["my-categories"], queryFn: () => listMyCategories(), enabled: open });
  const { data: prodsData, isLoading: prodsLoading } = useQuery({ queryKey: ["my-products"], queryFn: () => listMyProducts(), enabled: open });
  const { data: groupsData } = useQuery({ queryKey: ["pdv-addon-groups"], queryFn: () => listAddonGroups(), enabled: open });
  const { data: driversData } = useQuery({ queryKey: ["my-drivers"], queryFn: () => listMyDrivers(), enabled: open && order.mode === "entrega" });
  const categories = catsData?.categories ?? [];
  const products = prodsData?.products ?? [];

  const finderRows = useMemo<FinderRow[]>(() => {
    const groups = (groupsData?.groups ?? []).map((g) => ({
      active: g.active, required: g.required, min_select: g.min_select,
      targets: (g.targets ?? []).map((t) => ({ category_id: t.category_id ?? null, product_id: t.product_id ?? null })),
    }));
    const catById = new Map(categories.map((c) => [c.id, c]));
    const rows: FinderRow[] = [];
    for (const p of products) {
      if (!p.available) continue;
      const c = p.category_id ? catById.get(p.category_id) : undefined;
      const kind = (c as { kind?: string } | undefined)?.kind ?? null;
      const needs = requiresCustomization(p, { categoryKind: kind, groups });
      const base = { productId: p.id, categoryId: p.category_id, categoryName: c?.name ?? "Sem categoria", needsChoice: needs };
      const sizes = (p as { sizes?: { id: string; name: string; price: number }[] }).sizes ?? [];
      if (sizes.length > 0 && kind !== "pizza" && p.type !== "pizza") {
        for (const s of sizes) rows.push({ ...base, key: `${p.id}:${s.id}`, code: s.id.slice(-4), name: `${p.name} (${s.name})`, price: Number(s.price), sizeId: s.id });
      } else {
        rows.push({ ...base, key: p.id, code: p.id.slice(-4), name: p.name, price: Number(p.promo_price ?? p.price) });
      }
    }
    return rows;
  }, [products, categories, groupsData]);

  const [finderOpen, setFinderOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  const addCartItem = (c: Omit<CartItem, "uid">) => {
    let name = c.product.name;
    if (c.size) name += ` (${c.size.name})`;
    if (c.flavors?.length) name += ` - ${c.flavors.map((f) => f.name).join(", ")}`;
    setItems((prev) => [...prev, {
      key: crypto.randomUUID(), id: null, product_id: c.product.id, name_snapshot: name, qty: c.qty,
      unit_price: computeUnitPrice(c as CartItem),
      addons: [
        ...(c.addons || []).map((a) => ({ name: a.name, price: a.price })),
        ...(c.groupOptions || []).map((g) => ({ name: `${g.groupName}: ${g.name}`, price: g.price })),
      ],
      note: c.note || null,
    }]);
    toast.success(`${name} incluído`, { duration: 1200 });
  };

  const addDirect = (r: FinderRow) => {
    const p = products.find((x) => x.id === r.productId);
    if (!p) return;
    const ui = dbProductToUi(p, r.categoryName);
    const size = r.sizeId ? ui.sizes?.find((s) => s.id === r.sizeId) : undefined;
    addCartItem({ product: ui, qty: 1, addons: [], ...(size ? { size, basePrice: size.price } : {}) } as Omit<CartItem, "uid">);
  };

  const subtotal = items.reduce((s, it) => s + it.qty * it.unit_price, 0);
  const o = data?.order;
  const fee = o?.delivery_fee ?? order.deliveryFee;
  const paidOnline = order.paymentStatus === "approved" && !!o?.mp_payment_id;
  const estTotal = Math.max(0, subtotal - (o?.discount_amount ?? 0)) + fee;

  const save = useMutation({
    mutationFn: () => updateOrderItems({
      data: {
        order_id: order.id,
        items: items.map((it) => ({ id: it.id, product_id: it.product_id, name_snapshot: it.name_snapshot, qty: it.qty, unit_price: it.unit_price, addons: it.addons, note: it.note })),
      },
    }),
    onSuccess: (r) => {
      toast.success(`Pedido atualizado. Novo total: ${brl(r.total)}`);
      if (r.amountDue > 0) toast.info(`Cobrar ${brl(r.amountDue)} na entrega (diferença do pagamento online).`);
      if (r.refundDue > 0) toast.warning(`O total diminuiu ${brl(r.refundDue)}. Faça o reembolso manualmente no Mercado Pago.`);
      if (r.changeWarning) toast.warning(r.changeWarning);
      qc.invalidateQueries();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const driverMut = useMutation({
    mutationFn: (driverId: string) => {
      const d = driversData?.drivers.find((x) => x.id === driverId);
      return assignDriverToOrder({ data: { orderId: order.id, driverId: d ? d.id : null, driverName: d?.name ?? null, updateStatusToSaiuEntrega: false } });
    },
    onSuccess: () => { toast.success("Entregador atualizado."); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const changed = JSON.stringify(items.map((i) => [i.id, i.qty, i.note])) !== JSON.stringify((data?.items ?? []).map((i) => [i.id, i.qty, i.note]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[calc(100%-2rem)] max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar pedido #{order.number}</DialogTitle>
          <DialogDescription>Os valores são recalculados e o cliente vê a atualização no acompanhamento.</DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Itens</h3>
            {canEditItems && (
              <Button size="sm" variant="outline" onClick={() => setFinderOpen(true)}>
                <Search className="mr-1 h-4 w-4" /> Incluir item
              </Button>
            )}
          </div>
          {!canEditItems && <p className="text-xs text-muted-foreground">Itens só podem ser alterados em pedidos novos, aceitos ou em preparo.</p>}
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="divide-y rounded-lg border">
              {items.map((it, idx) => (
                <div key={it.key} className="space-y-2 p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{it.name_snapshot}</p>
                      {it.addons.length > 0 && <p className="text-xs text-muted-foreground">{it.addons.map((a) => a.name).join(", ")}</p>}
                      <p className="text-xs text-muted-foreground">{brl(it.unit_price)} cada {!it.id && <span className="font-semibold text-primary">· novo</span>}</p>
                    </div>
                    <span className="font-semibold">{brl(it.qty * it.unit_price)}</span>
                  </div>
                  {canEditItems && (
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" className="h-8 w-8" aria-label="Diminuir" disabled={it.qty <= 1}
                        onClick={() => setItems((p) => p.map((x, i) => (i === idx ? { ...x, qty: x.qty - 1 } : x)))}><Minus className="h-4 w-4" /></Button>
                      <span className="w-6 text-center font-semibold">{it.qty}</span>
                      <Button size="icon" variant="outline" className="h-8 w-8" aria-label="Aumentar"
                        onClick={() => setItems((p) => p.map((x, i) => (i === idx ? { ...x, qty: x.qty + 1 } : x)))}><Plus className="h-4 w-4" /></Button>
                      <Input className="h-8 flex-1" placeholder="Observação" value={it.note ?? ""} maxLength={500}
                        onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, note: e.target.value || null } : x)))} />
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label="Remover item" disabled={items.length <= 1}
                        onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="space-y-1 rounded-lg bg-muted/40 p-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{brl(subtotal)}</span></div>
            {(o?.discount_amount ?? 0) > 0 && <div className="flex justify-between"><span>Cupom {o?.coupon_code}</span><span>- {brl(o!.discount_amount)}</span></div>}
            {fee > 0 && <div className="flex justify-between"><span>Entrega</span><span>{brl(fee)}</span></div>}
            <div className="flex justify-between border-t pt-1 font-bold"><span>Total {changed && "(estimado)"}</span><span>{brl(changed ? estTotal : order.total)}</span></div>
            {o?.coupon_code && <p className="text-xs text-muted-foreground">O desconto do cupom é recalculado ao salvar.</p>}
            {paidOnline && changed && estTotal !== order.total && (
              <p className="text-xs font-medium text-warning-foreground">
                Pago online: {estTotal > order.total ? `a diferença de ${brl(estTotal - order.total)} será cobrada na entrega.` : `o reembolso de ${brl(order.total - estTotal)} deve ser feito manualmente.`}
              </p>
            )}
          </div>
        </section>

        {order.mode === "entrega" && (
          <section className="space-y-2">
            <Label>Entregador</Label>
            <Select value={order.driverId ?? "__none__"} onValueChange={(v) => driverMut.mutate(v)} disabled={driverMut.isPending}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(driversData?.drivers ?? []).filter((d) => d.active || d.id === order.driverId).map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
                <SelectItem value="__none__">[Sem entregador]</SelectItem>
              </SelectContent>
            </Select>
          </section>
        )}

        <section className="space-y-2">
          <Label>Forma de pagamento</Label>
          <div className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
            <span className="font-medium">{order.payment || "—"}</span>
            {paidOnline ? (
              <span className="text-xs text-muted-foreground">Pago online — não pode ser alterado</span>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setPayOpen(true)}>Alterar</Button>
            )}
          </div>
          <ChangePaymentDialog open={payOpen} onOpenChange={setPayOpen} orderId={order.id} total={order.total} rules={rules} />
        </section>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          {canEditItems && (
            <Button disabled={!changed || save.isPending || items.length === 0} onClick={() => save.mutate()}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar itens
            </Button>
          )}
        </DialogFooter>

        <ProductFinderModal
          open={finderOpen}
          onOpenChange={setFinderOpen}
          rows={finderRows}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          loading={prodsLoading}
          onRefresh={() => qc.invalidateQueries({ queryKey: ["my-products"] })}
          onAddDirect={addDirect}
          onPersonalize={(r) => {
            const p = products.find((x) => x.id === r.productId);
            if (!p) return;
            const cat = categories.find((c) => c.id === p.category_id) as { kind?: string } | undefined;
            if (cat?.kind === "pizza" || p.type === "pizza") {
              toast.info("Pizzas montadas devem ser lançadas pelo PDV.");
              return;
            }
            setSelected(p);
          }}
        />
        {selected && (
          <ProductModal
            product={dbProductToUi(selected, categories.find((c) => c.id === selected.category_id)?.name || "Categoria")}
            open={!!selected}
            onOpenChange={(v) => { if (!v) setSelected(null); }}
            onAddToCart={(item) => { addCartItem(item); setSelected(null); }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
