import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Minus, Search, ShoppingCart, Utensils, Check, ArrowRight } from "lucide-react";
import { listMyCategories, listMyProducts } from "@/lib/catalog-admin.functions";
import { createManualOrder } from "@/lib/orders.functions";
import { brl } from "@/lib/format";
type OrderMode = "entrega" | "retirada" | "consumo_local" | "balcao";
import { getMyTenant } from "@/lib/tenants.functions";
import { ProductModal } from "@/components/storefront/ProductModal";
import { dbProductToUi } from "@/lib/db-adapters";
import { computeUnitPrice, type CartItem } from "@/lib/cart-context";

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

  const subtotal = cart.reduce((s, it) => s + it.qty * computeUnitPrice(it), 0);

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

      const actualMode = mode === "balcao" ? "retirada" : mode;

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
          delivery_fee: 0,
          table_label: tableLabel || null,
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
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <AdminLayout title="PDV (Frente de Caixa)">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
        
        {/* Lado Esquerdo: Catálogo */}
        <div className="lg:col-span-2 flex flex-col h-full bg-background border rounded-xl overflow-hidden">
          <div className="p-4 border-b flex gap-3 bg-muted/30">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar produto..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
          </div>
          
          <div className="flex flex-1 overflow-hidden">
            {/* Categorias Sidebar */}
            <div className="w-48 border-r overflow-y-auto bg-muted/10 p-2 space-y-1">
              <button 
                onClick={() => setActiveCat("todas")}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${activeCat === "todas" ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}
              >
                Todas as categorias
              </button>
              {categories.map((c) => (
                <button 
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${activeCat === c.id ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Produtos Grid */}
            <div className="flex-1 overflow-y-auto p-4">
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
                      className="border rounded-lg p-3 hover:border-primary hover:shadow-sm cursor-pointer transition-all bg-card flex flex-col h-full"
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
        <div className="flex flex-col h-full bg-background border rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b bg-muted/30">
            <h2 className="font-semibold flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Comanda Atual</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
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
                        <button onClick={() => updateQty(i, -1)} className="p-1 hover:bg-background rounded text-muted-foreground"><Minus className="h-3 w-3" /></button>
                        <span className="w-5 text-center font-medium">{item.qty}</span>
                        <button onClick={() => updateQty(i, 1)} className="p-1 hover:bg-background rounded text-muted-foreground"><Plus className="h-3 w-3" /></button>
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Nome do Cliente *</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ex: Maria" className="h-8 mt-1 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">WhatsApp (Opcional)</Label>
                  <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))} placeholder="Apenas números" className="h-8 mt-1 text-sm" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Tipo de Venda</Label>
                  <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                    <SelectTrigger className="h-8 mt-1 text-sm"><SelectValue /></SelectTrigger>
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
                    <Input value={tableLabel} onChange={(e) => setTableLabel(e.target.value)} placeholder="Ex: 05" className="h-8 mt-1 text-sm" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Pagamento</Label>
                  <Select value={paymentLabel} onValueChange={setPaymentLabel}>
                    <SelectTrigger className="h-8 mt-1 text-sm"><SelectValue /></SelectTrigger>
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
                    <SelectTrigger className="h-8 mt-1 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Já Pago</SelectItem>
                      <SelectItem value="pending">Aguardando (Pagar depois)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-between items-end">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total a Cobrar</p>
                <p className="text-2xl font-black text-primary leading-none mt-1">{brl(subtotal)}</p>
              </div>
              <Button 
                onClick={() => submitMut.mutate()} 
                disabled={submitMut.isPending || cart.length === 0}
                className="font-bold shadow-md"
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
    </AdminLayout>
  );
}
