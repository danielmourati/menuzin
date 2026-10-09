import { CashChangePicker, type CashChangeValue } from "@/components/payment/CashChangePicker";
import type { DbCategoryPizzaSize } from "@/lib/db-types";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Minus, ShoppingCart, Utensils, Check, MapPin, Clock, User as UserIcon, Trash2 } from "lucide-react";
import { ProductFinderModal, type FinderRow } from "@/components/pdv/ProductFinderModal";
import { requiresCustomization } from "@/lib/pdv-customization";
import { useAuth } from "@/lib/auth-context";
import { listMyCategories, listMyProducts, listAddonGroups } from "@/lib/catalog-admin.functions";
import { createManualOrder } from "@/lib/orders.functions";
import { brl } from "@/lib/format";
type OrderMode = "entrega" | "retirada" | "consumo_local" | "balcao";
import { getMyTenant } from "@/lib/tenants.functions";
import { ProductModal } from "@/components/storefront/ProductModal";
import { dbProductToUi } from "@/lib/db-adapters";
import { computeUnitPrice, type CartItem } from "@/lib/cart-context";
import { lookupByCep } from "@/lib/viacep";
import { resolveDeliveryFee } from "@/lib/delivery-zones.functions";

export const Route = createFileRoute("/admin/pdv")({ component: PdvPage });

function PdvPage() {
  const qc = useQueryClient();
  const { data: tenantData } = useQuery({ queryKey: ["my-tenant"], queryFn: () => getMyTenant() });
  const { data: catsData, isLoading: catsLoading } = useQuery({ queryKey: ["my-categories"], queryFn: () => listMyCategories() });
  const { data: prodsData, isLoading: prodsLoading } = useQuery({ queryKey: ["my-products"], queryFn: () => listMyProducts() });

  const categories = catsData?.categories ?? [];
  const products = prodsData?.products ?? [];

  const { user, profile } = useAuth();
  const operatorName = (profile as { full_name?: string | null } | null)?.full_name || user?.email || "Operador";
  const { data: groupsData } = useQuery({ queryKey: ["pdv-addon-groups"], queryFn: () => listAddonGroups() });
  const [finderOpen, setFinderOpen] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);

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
      const code = p.id.slice(0, 4);
      if (sizes.length > 0 && kind !== "pizza" && p.type !== "pizza") {
        for (const s of sizes) rows.push({ ...base, key: `${p.id}:${s.id}`, code: s.id.slice(0, 4), name: `${p.name} (${s.name})`, price: Number(s.price), sizeId: s.id });
      } else {
        rows.push({ ...base, key: p.id, code, name: p.name, price: Number(p.promo_price ?? p.price) });
      }
    }
    return rows;
  }, [products, categories, groupsData]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "F2") { e.preventDefault(); setFinderOpen(true); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  // Checkout states
  const [customerName, setCustomerName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [mode, setMode] = useState<OrderMode>("balcao");
  const [tableLabel, setTableLabel] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "approved">("approved");
  const [paymentLabel, setPaymentLabel] = useState("Dinheiro");
  const [cashChange, setCashChange] = useState<CashChangeValue>({ noChange: false, paid: null });

  // Delivery / Address states
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [complement, setComplement] = useState("");
  const [reference, setReference] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);

  // ===== Rascunho automático (localStorage, por loja, expira em 24h) =====
  const tenantId = (tenantData?.tenant as { id?: string } | undefined)?.id ?? null;
  const draftKey = tenantId ? `menuzin:pdv-draft:${tenantId}` : null;
  const [draftHydrated, setDraftHydrated] = useState(false);

  useEffect(() => {
    if (!draftKey || draftHydrated) return;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        const fresh = d?.v === 1 && Date.now() - Number(d.savedAt ?? 0) < 24 * 60 * 60 * 1000;
        if (fresh && (d.cart?.length || d.customerName)) {
          setCart(d.cart ?? []);
          setCustomerName(d.customerName ?? "");
          setWhatsapp(d.whatsapp ?? "");
          setMode(d.mode ?? "balcao");
          setTableLabel(d.tableLabel ?? "");
          setOrderNote(d.orderNote ?? "");
          setPaymentStatus(d.paymentStatus ?? "approved");
          setPaymentLabel(d.paymentLabel ?? "Dinheiro");
          setCep(d.cep ?? "");
          setStreet(d.street ?? "");
          setNumber(d.number ?? "");
          setNeighborhood(d.neighborhood ?? "");
          setComplement(d.complement ?? "");
          setReference(d.reference ?? "");
          setCity(d.city ?? "");
          setState(d.state ?? "");
          setDeliveryFee(Number(d.deliveryFee ?? 0));
          toast.info("Pedido em andamento restaurado");
        } else if (!fresh) {
          window.localStorage.removeItem(draftKey);
        }
      }
    } catch {
      /* ignore */
    }
    setDraftHydrated(true);
  }, [draftKey, draftHydrated]);

  useEffect(() => {
    if (!draftKey || !draftHydrated) return;
    const t = setTimeout(() => {
      try {
        if (cart.length === 0 && !customerName) {
          window.localStorage.removeItem(draftKey);
          return;
        }
        window.localStorage.setItem(draftKey, JSON.stringify({
          v: 1, savedAt: Date.now(), cart, customerName, whatsapp, mode, tableLabel, orderNote,
          paymentStatus, paymentLabel, cep, street, number, neighborhood, complement, reference,
          city, state, deliveryFee,
        }));
      } catch {
        /* ignore */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [draftKey, draftHydrated, cart, customerName, whatsapp, mode, tableLabel, orderNote,
    paymentStatus, paymentLabel, cep, street, number, neighborhood, complement, reference,
    city, state, deliveryFee]);

  const resetDraft = () => {
    setCashChange({ noChange: false, paid: null });
    setCart([]);
    setCustomerName("");
    setWhatsapp("");
    setTableLabel("");
    setOrderNote("");
    setCep("");
    setStreet("");
    setNumber("");
    setNeighborhood("");
    setComplement("");
    setReference("");
    setDeliveryFee(0);
    try {
      if (draftKey) window.localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
  };

  // Dynamic CEP search
  useEffect(() => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setCepError(null);
      setCepLoading(false);
      return;
    }
    let cancelled = false;
    setCepError(null);
    setCepLoading(true);
    const t = setTimeout(async () => {
      const res = await lookupByCep(digits);
      if (cancelled) return;
      setCepLoading(false);
      if (res.status === "ok") {
        const r = res.results[0];
        setStreet((cur) => cur || r.logradouro);
        setNeighborhood((cur) => cur || r.bairro);
        setCity((cur) => cur || r.localidade);
        setState((cur) => cur || r.uf);
      } else if (res.status === "empty") {
        setCepError("CEP não encontrado");
      } else if (res.status === "error") {
        setCepError("Falha ao buscar CEP. Preencha manualmente.");
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [cep]);

  const cepDigitsOnly = cep.replace(/\D/g, "");
  const { data: feeResolution, isFetching: feeLoading } = useQuery({
    queryKey: ["pdv-resolve-delivery-fee", tenantData?.tenant?.slug, cepDigitsOnly, neighborhood, street, number, city, state],
    queryFn: () => {
      if (!tenantData?.tenant?.slug) return Promise.resolve(null);
      return resolveDeliveryFee({
        data: { tenant_slug: tenantData.tenant.slug, cep: cepDigitsOnly, neighborhood, street, number, city, state },
      });
    },
    enabled: !!tenantData?.tenant?.slug && mode === "entrega" && addressModalOpen,
  });

  useEffect(() => {
    if (feeResolution) {
      setDeliveryFee(Number(feeResolution.fee || 0));
    }
  }, [feeResolution]);

  const subtotal = cart.reduce((s, it) => s + it.qty * computeUnitPrice(it), 0);
  const total = subtotal + (mode === "entrega" ? deliveryFee : 0);

  const addDirect = (r: FinderRow) => {
    const p = products.find((x) => x.id === r.productId);
    if (!p) return;
    const ui = dbProductToUi(p, r.categoryName);
    const size = r.sizeId ? ui.sizes?.find((s) => s.id === r.sizeId) : undefined;
    addToCart({ product: ui, qty: 1, addons: [], ...(size ? { size, basePrice: size.price } : {}) });
    toast.success(`${r.name} adicionado`, { duration: 1200 });
  };

  const addToCart = (item: Omit<CartItem, "uid">) => {
    setStartedAt((t) => t ?? Date.now());
    setCart((prev) => {
      return [...prev, { ...item, uid: crypto.randomUUID() }];
    });
  };

  const updateQty = (index: number, delta: number) => {
    setCart((prev) => {
      const copy = [...prev];
      copy[index].qty += delta;
      if (copy[index].qty <= 0) return copy.filter((_, i) => i !== index);
      return copy;
    });
  };

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!customerName) throw new Error("Informe o nome do cliente.");
      if (cart.length === 0) throw new Error("Carrinho vazio.");
      if (mode === "consumo_local" && !tableLabel) throw new Error("Informe a mesa.");
      if (mode === "entrega" && (!cep || !street || !number || !neighborhood)) {
        setAddressModalOpen(true);
        throw new Error("Preencha o endereço de entrega antes de lançar o pedido.");
      }

      const actualMode = mode === "balcao" ? "retirada" : mode;
      
      const address = mode === "entrega" ? {
        cep: cepDigitsOnly, street, number, neighborhood, complement, reference, city, state
      } : null;

      const items = cart.map((c) => {
        const mergedAddons = [
          ...(c.addons || []).map(a => ({ name: a.name, price: a.price })),
          ...(c.groupOptions || []).map(go => ({ name: `${go.groupName}: ${go.name}`, price: go.price }))
        ];
        
        let finalName = c.product.name;
        if (c.size) finalName += ` (${c.size.name})`;
        if (c.flavors?.length) finalName += ` - ${c.flavors.map(f => f.name).join(", ")}`;

        return {
          product_id: c.product.id,
          name_snapshot: finalName,
          qty: c.qty,
          unit_price: computeUnitPrice(c),
          addons: mergedAddons,
          note: c.note || null,
        };
      });

      return createManualOrder({
        data: {
          customer_name: customerName,
          whatsapp: whatsapp || null,
          mode: actualMode as any,
          payment_label: paymentLabel,
          change_for: paymentLabel === "Dinheiro" && !cashChange.noChange ? cashChange.paid : null,
          no_change: paymentLabel === "Dinheiro" ? cashChange.noChange : false,
          payment_status: paymentStatus,
          initial_status: paymentStatus === "approved" ? "preparo" : "novo",
          delivery_fee: mode === "entrega" ? deliveryFee : 0,
          table_label: tableLabel || null,
          note: orderNote.trim() || null,
          address: address as any,
          items,
        }
      });
    },
    onSuccess: async (data) => {
      toast.success(`Pedido #${data.displayId} lançado com sucesso!`);
      resetDraft();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <AdminLayout title="PDV (Frente de Caixa)">
      <div className="grid grid-cols-1 gap-4 pb-24 lg:h-[calc(100vh-8rem)] lg:grid-cols-[minmax(320px,380px)_1fr] lg:pb-0">

        {/* Painel da comanda */}
        <div className="flex flex-col overflow-hidden rounded-xl border bg-background lg:h-full">
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <span className="text-3xl font-black text-primary leading-none">{String(cart.reduce((n, i) => n + i.qty, 0)).padStart(2, "0")}</span>
            <span className="rounded-md bg-success px-2.5 py-1 text-xs font-bold text-success-foreground">Em aberto</span>
            <span className="ml-auto text-sm font-semibold text-muted-foreground">Nova comanda</span>
          </div>
          <div className="space-y-1 border-b px-4 py-3 text-sm text-muted-foreground">
            <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> {startedAt ? `Iniciado em ${new Date(startedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : "Aguardando primeiro item"}</p>
            <p className="flex items-center gap-2"><UserIcon className="h-4 w-4" /> Criado por: <b className="text-foreground">{operatorName}</b></p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div>
                <Label className="text-xs">Nome do Cliente *</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ex: Maria" className="mt-1 h-11 text-base lg:h-9 lg:text-sm" />
              </div>
              <div>
                <Label className="text-xs">WhatsApp (Opcional)</Label>
                <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))} placeholder="Apenas números" inputMode="numeric" type="tel" className="mt-1 h-11 text-base lg:h-9 lg:text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div>
                <Label className="text-xs">Tipo de Venda</Label>
                <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                  <SelectTrigger className="mt-1 h-11 text-base lg:h-9 lg:text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balcao">Balcão (Retirada)</SelectItem>
                    <SelectItem value="consumo_local">Mesa (Local)</SelectItem>
                    <SelectItem value="entrega">Entrega (Delivery)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {mode === "consumo_local" && (
                <div>
                  <Label className="text-xs">Nº da Mesa</Label>
                  <Input value={tableLabel} onChange={(e) => setTableLabel(e.target.value)} placeholder="Ex: 05" className="mt-1 h-11 text-base lg:h-9 lg:text-sm" />
                </div>
              )}
              {mode === "entrega" && (
                <div>
                  <Label className="text-xs">Endereço de Entrega</Label>
                  <Button variant={cep && street ? "secondary" : "outline"} className="mt-1 h-11 w-full justify-start overflow-hidden text-sm font-normal lg:h-9" onClick={() => setAddressModalOpen(true)}>
                    <MapPin className="mr-2 h-3.5 w-3.5 shrink-0" />
                    {cep && street ? <span className="truncate">{street}, {number}</span> : "Informar Endereço"}
                  </Button>
                </div>
              )}
            </div>
            <Textarea value={orderNote} onChange={(e) => setOrderNote(e.target.value)} maxLength={500} rows={2} placeholder="Anotar observação..." className="resize-none text-base lg:text-sm" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div>
                <Label className="text-xs">Pagamento</Label>
                <Select value={paymentLabel} onValueChange={setPaymentLabel}>
                  <SelectTrigger className="mt-1 h-11 text-base lg:h-9 lg:text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                    <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status Pagamento</Label>
                <Select value={paymentStatus} onValueChange={(v: any) => setPaymentStatus(v)}>
                  <SelectTrigger className="mt-1 h-11 text-base lg:h-9 lg:text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Já Pago</SelectItem>
                    <SelectItem value="pending">Aguardando (Pagar depois)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {paymentLabel === "Dinheiro" && (
              <CashChangePicker compact total={total} value={cashChange} onChange={setCashChange} rules={{ accepts100: true, accepts200: true }} />
            )}
          </div>

          {(cart.length > 0 || customerName) && (
            <div className="border-t px-4 py-2">
              <Button type="button" variant="ghost" size="sm" className="h-8 w-full text-xs text-destructive" onClick={() => { if (window.confirm("Descartar a comanda atual?")) resetDraft(); }}>
                Limpar comanda
              </Button>
            </div>
          )}
        </div>

        {/* Itens + total */}
        <div id="pdv-comanda" className="flex flex-col overflow-hidden rounded-xl border bg-background shadow-sm scroll-mt-4 lg:h-full">
          <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
            <h2 className="flex items-center gap-2 font-semibold"><ShoppingCart className="h-4 w-4" /> Itens do pedido</h2>
            <Button onClick={() => setFinderOpen(true)} className="gap-1.5 font-bold">
              <Plus className="h-4 w-4" /> Adicionar item <kbd className="ml-1 hidden rounded bg-primary-foreground/20 px-1.5 text-[10px] lg:inline">F2</kbd>
            </Button>
          </div>

          <div className="min-h-[30vh] flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <button onClick={() => setFinderOpen(true)} className="flex h-full min-h-[30vh] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground hover:border-primary hover:text-primary">
                <Utensils className="mb-3 h-8 w-8 opacity-30" />
                <p className="font-medium">Nenhum item lançado.</p>
                <p>Clique aqui ou pressione F2 para localizar produtos.</p>
              </button>
            ) : (
              <div className="divide-y">
                {cart.map((item, i) => (
                  <div key={item.uid} className="flex flex-col gap-1 py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 break-words font-semibold leading-tight uppercase">
                        {item.product.name}
                        {item.size && <span className="ml-1 font-normal text-muted-foreground">({item.size.name})</span>}
                        {item.flavors && item.flavors.length > 0 && (
                          <span className="ml-1 text-xs font-normal normal-case text-muted-foreground">- {item.flavors.map((f) => f.name).join(", ")}</span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1 rounded-md bg-muted p-1">
                        <button onClick={() => updateQty(i, -1)} aria-label="Diminuir" className="grid h-9 w-9 place-items-center rounded text-muted-foreground hover:bg-background lg:h-7 lg:w-7"><Minus className="h-4 w-4 lg:h-3 lg:w-3" /></button>
                        <span className="w-6 text-center font-medium">{item.qty}</span>
                        <button onClick={() => updateQty(i, 1)} aria-label="Aumentar" className="grid h-9 w-9 place-items-center rounded text-muted-foreground hover:bg-background lg:h-7 lg:w-7"><Plus className="h-4 w-4 lg:h-3 lg:w-3" /></button>
                      </div>
                      <div className="w-24 whitespace-nowrap text-right font-bold">{brl(computeUnitPrice(item) * item.qty)}</div>
                      <button onClick={() => setCart((prev) => prev.filter((_, idx) => idx !== i))} aria-label="Remover" className="grid h-9 w-9 place-items-center rounded text-destructive hover:bg-destructive/10 lg:h-7 lg:w-7"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    {(item.addons?.length || item.groupOptions?.length || item.note) ? (
                      <div className="ml-1 space-y-0.5 border-l-2 border-muted pl-2">
                        {item.addons?.map((a, idx) => <p key={idx} className="text-xs text-muted-foreground">+ {a.name}</p>)}
                        {item.groupOptions?.map((go, idx) => <p key={idx} className="text-xs text-muted-foreground">+ {go.groupName}: {go.name}</p>)}
                        {item.note && <p className="text-xs font-medium italic text-warning-foreground">Obs: {item.note}</p>}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t bg-muted/10 p-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total do pedido</p>
              <p className="mt-1 text-3xl font-black leading-none text-primary">{brl(total)}</p>
              {mode === "entrega" && deliveryFee > 0 && <p className="mt-1 text-xs text-muted-foreground">(Inc. frete de {brl(deliveryFee)})</p>}
            </div>
            <Button onClick={() => submitMut.mutate()} disabled={submitMut.isPending || cart.length === 0} className="h-12 w-full font-bold shadow-md sm:w-auto sm:px-8">
              {submitMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-1.5 h-4 w-4" /> Lançar Pedido</>}
            </Button>
          </div>
        </div>
      </div>

      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <Button className="h-12 w-full justify-between font-bold" onClick={() => document.getElementById("pdv-comanda")?.scrollIntoView({ behavior: "smooth" })}>
            <span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Ver comanda ({cart.reduce((n, i) => n + i.qty, 0)})</span>
            <span>{brl(total)}</span>
          </Button>
        </div>
      )}

      <ProductFinderModal
        open={finderOpen}
        onOpenChange={setFinderOpen}
        rows={finderRows}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        loading={prodsLoading || catsLoading}
        onRefresh={() => { qc.invalidateQueries({ queryKey: ["my-products"] }); qc.invalidateQueries({ queryKey: ["my-categories"] }); qc.invalidateQueries({ queryKey: ["pdv-addon-groups"] }); }}
        onAddDirect={addDirect}
        onPersonalize={(r) => {
          const p = products.find((x) => x.id === r.productId);
          if (!p) return;
          if (r.needsChoice && finderOpen) toast.info("Este item precisa de escolhas");
          setSelectedProduct(p);
          setModalOpen(true);
        }}
      />
      {selectedProduct && (
        <ProductModal
          product={dbProductToUi(selectedProduct, catsData?.categories?.find(c => c.id === selectedProduct.category_id)?.name || "Categoria")}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onAddToCart={addToCart}
          tenantSlug={tenantData?.tenant?.slug}
          tenantInfo={tenantData?.tenant ? { 
            name: tenantData.tenant.name, 
            logoUrl: tenantData.tenant.logo_url ?? null, 
            logoLetter: tenantData.tenant.logo_letter ?? null 
          } : null}
          pizzaSizes={selectedProduct?.category_id ? ((((catsData?.categories?.find(c => c.id === selectedProduct.category_id) as unknown as { pizza_sizes?: DbCategoryPizzaSize[] } | undefined)?.pizza_sizes) ?? []).filter((s: DbCategoryPizzaSize) => s.active)).map((s: DbCategoryPizzaSize) => ({
            id: s.id, name: s.name, pieces: s.pieces, maxFlavors: s.max_flavors, priceRule: (s.price_rule ?? "sum_fractions") as "sum_fractions" | "max_value" | "fixed"
          })) : []}
          pizzaFlavors={
            selectedProduct?.category_id 
              ? products.filter(p => p.category_id === selectedProduct.category_id && p.available && p.listed_as_flavor === true).map(p => {
                const uiP = dbProductToUi(p, "Categoria", "pizza");
                return {
                  id: p.id,
                  name: p.name,
                  description: p.description ?? "",
                  image: p.image_url ?? "",
                  pricesByCategorySizeId: Object.fromEntries((uiP.sizes ?? []).filter((s) => s.categorySizeId).map((s) => [s.categorySizeId as string, s.price])),
                  fractionPricesByCategorySizeId: Object.fromEntries(
                    (uiP.sizes ?? [])
                      .filter((s) => s.categorySizeId && s.fractionPrices)
                      .map((s) => [s.categorySizeId as string, s.fractionPrices as Record<string, number>]),
                  ),
                  fallbackPrice: Number(p.price)
                };
              })
              : []
          }
        />
      )}

      {/* Address Modal */}
      <Dialog open={addressModalOpen} onOpenChange={setAddressModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Endereço de Entrega</DialogTitle>
            <DialogDescription>Preencha os dados do local de entrega.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="cep">CEP</Label>
                <div className="relative">
                  <Input id="cep" value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" />
                  {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {cepError && <p className="text-xs text-destructive mt-1">{cepError}</p>}
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="neighborhood">Bairro *</Label>
                <Input id="neighborhood" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3">
                <Label htmlFor="street">Endereço (Rua/Av) *</Label>
                <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} />
              </div>
              <div className="col-span-1">
                <Label htmlFor="number">Número *</Label>
                <Input id="number" value={number} onChange={(e) => setNumber(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="complement">Complemento</Label>
                <Input id="complement" value={complement} onChange={(e) => setComplement(e.target.value)} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="reference">Ponto de Referência</Label>
                <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
            </div>
          </div>
          
          <div className="bg-muted p-3 rounded-md flex justify-between items-center mt-2">
            <span className="text-sm font-medium">Taxa de Entrega:</span>
            {feeLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <span className="text-base font-bold text-primary">{brl(deliveryFee)}</span>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button onClick={() => setAddressModalOpen(false)}>
              Salvar Endereço
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
