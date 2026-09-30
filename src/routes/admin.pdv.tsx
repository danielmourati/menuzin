import type { DbCategoryPizzaSize } from "@/lib/db-types";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Minus, Search, ShoppingCart, Utensils, Check, ArrowRight, MapPin } from "lucide-react";
import { listMyCategories, listMyProducts } from "@/lib/catalog-admin.functions";
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

  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("todas");

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (activeCat !== "todas" && p.category_id !== activeCat) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, activeCat, search]);

  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  // Checkout states
  const [customerName, setCustomerName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [mode, setMode] = useState<OrderMode>("balcao");
  const [tableLabel, setTableLabel] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "approved">("approved");
  const [paymentLabel, setPaymentLabel] = useState("Dinheiro");

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

  const addToCart = (item: Omit<CartItem, "uid">) => {
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
          payment_status: paymentStatus,
          initial_status: paymentStatus === "approved" ? "preparo" : "novo",
          delivery_fee: mode === "entrega" ? deliveryFee : 0,
          table_label: tableLabel || null,
          address: address as any,
          items,
        }
      });
    },
    onSuccess: async (data) => {
      toast.success(`Pedido #${data.displayId} lançado com sucesso!`);
      setCart([]);
      setCustomerName("");
      setWhatsapp("");
      setTableLabel("");
      setCep("");
      setStreet("");
      setNumber("");
      setNeighborhood("");
      setComplement("");
      setReference("");
      setDeliveryFee(0);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <AdminLayout title="PDV (Frente de Caixa)">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 pb-24 lg:pb-0 lg:h-[calc(100vh-8rem)]">
        
        {/* Lado Esquerdo: Catálogo */}
        <div className="lg:col-span-2 flex flex-col h-[70vh] lg:h-full bg-background border rounded-xl overflow-hidden">
          <div className="p-4 border-b flex gap-3 bg-muted/30">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar produto..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background h-11 text-base lg:h-10 lg:text-sm"
              />
            </div>
          </div>
          
          <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
            {/* Categorias Sidebar */}
            <div className="flex md:block gap-2 md:gap-0 md:w-48 shrink-0 border-b md:border-b-0 md:border-r overflow-x-auto md:overflow-x-hidden md:overflow-y-auto bg-muted/10 p-2 md:space-y-1 scrollbar-hide">
              <button 
                onClick={() => setActiveCat("todas")}
                className={`shrink-0 whitespace-nowrap md:whitespace-normal md:w-full text-left px-3 py-2 min-h-10 rounded-full md:rounded-md text-sm transition-colors ${activeCat === "todas" ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}
              >
                Todas as categorias
              </button>
              {categories.map((c) => (
                <button 
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={`shrink-0 whitespace-nowrap md:whitespace-normal md:w-full text-left px-3 py-2 min-h-10 rounded-full md:rounded-md text-sm transition-colors ${activeCat === c.id ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Produtos Grid */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4">
              {prodsLoading ? (
                <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredProducts.map((p) => (
                    <div 
                      key={p.id} 
                      onClick={() => {
                        setSelectedProduct(p);
                        setModalOpen(true);
                      }}
                      className="border rounded-lg p-3 min-h-20 active:scale-[0.98] hover:border-primary hover:shadow-sm cursor-pointer transition-all bg-card flex flex-col h-full"
                    >
                      <h4 className="font-medium text-sm leading-tight flex-1">{p.name}</h4>
                      <p className="font-semibold text-primary mt-2">{brl(p.price)}</p>
                    </div>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="col-span-full text-center text-muted-foreground py-10">
                      Nenhum produto encontrado.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lado Direito: Carrinho / Resumo */}
        <div id="pdv-comanda" className="flex flex-col lg:h-full bg-background border rounded-xl overflow-hidden shadow-sm scroll-mt-4">
          <div className="p-4 border-b bg-muted/30">
            <h2 className="font-semibold flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Comanda Atual</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 max-h-[50vh] lg:max-h-none">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                <Utensils className="h-8 w-8 mb-3 opacity-20" />
                <p>O carrinho está vazio.</p>
                <p>Selecione produtos ao lado.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item, i) => (
                  <div key={item.uid} className="flex flex-col gap-1 text-sm border-b pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 font-medium text-wrap break-words leading-tight">
                        {item.product.name}
                        {item.size && <span className="text-muted-foreground font-normal ml-1">({item.size.name})</span>}
                        {item.flavors && item.flavors.length > 0 && (
                          <span className="text-muted-foreground font-normal ml-1 text-xs">
                            - {item.flavors.map((f) => f.name).join(", ")}
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground whitespace-nowrap">{brl(computeUnitPrice(item))}</div>
                      <div className="flex items-center gap-1 bg-muted rounded-md p-1 shrink-0 ml-1">
                        <button onClick={() => updateQty(i, -1)} aria-label="Diminuir" className="grid h-9 w-9 lg:h-7 lg:w-7 place-items-center hover:bg-background rounded text-muted-foreground"><Minus className="h-4 w-4 lg:h-3 lg:w-3" /></button>
                        <span className="w-5 text-center font-medium">{item.qty}</span>
                        <button onClick={() => updateQty(i, 1)} aria-label="Aumentar" className="grid h-9 w-9 lg:h-7 lg:w-7 place-items-center hover:bg-background rounded text-muted-foreground"><Plus className="h-4 w-4 lg:h-3 lg:w-3" /></button>
                      </div>
                    </div>
                    {/* Addons e Notas */}
                    {(item.addons?.length || item.groupOptions?.length || item.note) ? (
                      <div className="pl-2 border-l-2 border-muted/50 ml-1 py-0.5 space-y-1">
                        {item.addons?.map((a, idx) => (
                          <p key={idx} className="text-xs text-muted-foreground">+ {a.name}</p>
                        ))}
                        {item.groupOptions?.map((go, idx) => (
                          <p key={idx} className="text-xs text-muted-foreground">+ {go.groupName}: {go.name}</p>
                        ))}
                        {item.note && (
                          <p className="text-xs text-amber-600 font-medium italic">Obs: {item.note}</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-muted/10 space-y-4">
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2">
                <div>
                  <Label className="text-xs">Nome do Cliente *</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ex: Maria" className="h-11 lg:h-8 mt-1 text-base lg:text-sm" />
                </div>
                <div>
                  <Label className="text-xs">WhatsApp (Opcional)</Label>
                  <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))} placeholder="Apenas números" className="h-11 lg:h-8 mt-1 text-base lg:text-sm" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2">
                <div>
                  <Label className="text-xs">Tipo de Venda</Label>
                  <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                    <SelectTrigger className="h-11 lg:h-8 mt-1 text-base lg:text-sm"><SelectValue /></SelectTrigger>
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
                    <Input value={tableLabel} onChange={(e) => setTableLabel(e.target.value)} placeholder="Ex: 05" className="h-11 lg:h-8 mt-1 text-base lg:text-sm" />
                  </div>
                )}
                {mode === "entrega" && (
                  <div>
                    <Label className="text-xs">Endereço de Entrega</Label>
                    <Button 
                      variant={cep && street ? "secondary" : "outline"}
                      className="w-full h-11 lg:h-8 mt-1 justify-start text-sm lg:text-xs font-normal overflow-hidden" 
                      onClick={() => setAddressModalOpen(true)}
                    >
                      <MapPin className="mr-2 h-3.5 w-3.5 shrink-0" />
                      {cep && street ? <span className="truncate">{street}, {number}</span> : "Informar Endereço"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2">
                <div>
                  <Label className="text-xs">Pagamento</Label>
                  <Select value={paymentLabel} onValueChange={setPaymentLabel}>
                    <SelectTrigger className="h-11 lg:h-8 mt-1 text-base lg:text-sm"><SelectValue /></SelectTrigger>
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
                    <SelectTrigger className="h-11 lg:h-8 mt-1 text-base lg:text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Já Pago</SelectItem>
                      <SelectItem value="pending">Aguardando (Pagar depois)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-end">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total a Cobrar</p>
                <p className="text-2xl font-black text-primary leading-none mt-1">{brl(total)}</p>
                {mode === "entrega" && deliveryFee > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    (Inc. Frete de {brl(deliveryFee)})
                  </p>
                )}
              </div>
              <Button 
                onClick={() => submitMut.mutate()} 
                disabled={submitMut.isPending || cart.length === 0}
                className="font-bold shadow-md h-12 w-full sm:w-auto lg:h-10"
              >
                {submitMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1.5" /> Lançar Pedido</>}
              </Button>
            </div>
          </div>
        </div>

      </div>

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
