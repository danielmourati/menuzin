import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { brl } from "@/lib/format";
import { store } from "@/lib/mock-data";
import { toast } from "sonner";

type Step = "cart" | "customer" | "mode" | "payment";

export function CartDrawer({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const { items, update, remove, subtotal, clear } = useCart();
  const [step, setStep] = useState<Step>("cart");

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [generalNote, setGeneralNote] = useState("");
  const [mode, setMode] = useState<"entrega" | "retirada" | "consumo_local">("entrega");

  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [complement, setComplement] = useState("");
  const [reference, setReference] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [table, setTable] = useState("");

  const [payment, setPayment] = useState("Pix");
  const [changeFor, setChangeFor] = useState("");

  const deliveryFee = mode === "entrega" ? store.deliveryFee : 0;
  const total = subtotal + deliveryFee;

  const reset = () => { setStep("cart"); };

  const goNext = () => {
    if (step === "cart") setStep("customer");
    else if (step === "customer") {
      if (!name || !whatsapp) return toast.error("Informe nome e WhatsApp");
      setStep("mode");
    } else if (step === "mode") {
      if (mode === "entrega" && (!street || !number || !neighborhood))
        return toast.error("Preencha o endereço");
      if (mode === "consumo_local" && !table) return toast.error("Informe a mesa/comanda");
      setStep("payment");
    } else if (step === "payment") {
      const order = {
        number: 1000 + Math.floor(Math.random() * 9000),
        customerName: name,
        whatsapp,
        mode,
        payment,
        changeFor: payment === "Dinheiro" && changeFor ? Number(changeFor) : undefined,
        items: items.map((i) => ({
          name: i.product.name,
          qty: i.qty,
          unitPrice: i.product.promoPrice ?? i.product.price,
          addons: i.addons,
          note: i.note,
        })),
        subtotal, deliveryFee, total,
        address: mode === "entrega" ? { cep, street, number, neighborhood, complement, reference } : undefined,
        table: mode === "consumo_local" ? table : undefined,
        pickupTime: mode === "retirada" ? pickupTime : undefined,
        note: generalNote,
      };
      try { sessionStorage.setItem(`order:${order.number}`, JSON.stringify(order)); } catch {}
      clear();
      onOpenChange(false);
      reset();
      navigate({ to: "/loja/$slug/pedido-confirmado", params: { slug: store.slug }, search: { n: order.number } as never });
    }
  };

  const goBack = () => {
    if (step === "customer") setStep("cart");
    else if (step === "mode") setStep("customer");
    else if (step === "payment") setStep("mode");
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2">
            {step !== "cart" && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={goBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {step === "cart" && "Seu carrinho"}
            {step === "customer" && "Seus dados"}
            {step === "mode" && "Como deseja receber?"}
            {step === "payment" && "Forma de pagamento"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === "cart" && (
            items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                <ShoppingBag className="h-12 w-12" />
                <p className="mt-3">Seu carrinho está vazio</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((i) => {
                  const unit = (i.product.promoPrice ?? i.product.price) + i.addons.reduce((s, a) => s + a.price, 0);
                  return (
                    <div key={i.uid} className="flex gap-3 rounded-xl border p-3">
                      <img src={i.product.image} alt="" className="h-16 w-16 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{i.product.name}</p>
                        {i.addons.length > 0 && (
                          <p className="text-xs text-muted-foreground">+ {i.addons.map(a => a.name).join(", ")}</p>
                        )}
                        {i.note && <p className="mt-1 text-xs italic text-muted-foreground">"{i.note}"</p>}
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-1 rounded-full border p-0.5">
                            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => update(i.uid, i.qty - 1)}><Minus className="h-3 w-3" /></Button>
                            <span className="w-5 text-center text-sm font-semibold">{i.qty}</span>
                            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => update(i.uid, i.qty + 1)}><Plus className="h-3 w-3" /></Button>
                          </div>
                          <span className="font-semibold">{brl(unit * i.qty)}</span>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => remove(i.uid)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {step === "customer" && (
            <div className="space-y-4">
              <div><Label>Nome*</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" /></div>
              <div><Label>WhatsApp*</Label><Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" className="mt-1.5" /></div>
              <div><Label>Observação geral</Label><Textarea value={generalNote} onChange={(e) => setGeneralNote(e.target.value)} className="mt-1.5" /></div>
            </div>
          )}

          {step === "mode" && (
            <div className="space-y-5">
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as never)} className="grid gap-2">
                {[
                  { v: "entrega", l: "Entrega", d: `Taxa ${brl(store.deliveryFee)}` },
                  { v: "retirada", l: "Retirada no local", d: "Sem taxa" },
                  { v: "consumo_local", l: "Consumo no local", d: "Atendimento na mesa" },
                ].map((o) => (
                  <label key={o.v} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${mode === o.v ? "border-primary bg-primary/5" : ""}`}>
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value={o.v} />
                      <div><p className="font-medium">{o.l}</p><p className="text-xs text-muted-foreground">{o.d}</p></div>
                    </div>
                  </label>
                ))}
              </RadioGroup>

              {mode === "entrega" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>CEP</Label><Input value={cep} onChange={(e) => setCep(e.target.value)} className="mt-1.5" /></div>
                  <div className="col-span-2"><Label>Rua*</Label><Input value={street} onChange={(e) => setStreet(e.target.value)} className="mt-1.5" /></div>
                  <div><Label>Número*</Label><Input value={number} onChange={(e) => setNumber(e.target.value)} className="mt-1.5" /></div>
                  <div><Label>Bairro*</Label><Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="mt-1.5" /></div>
                  <div className="col-span-2"><Label>Complemento</Label><Input value={complement} onChange={(e) => setComplement(e.target.value)} className="mt-1.5" /></div>
                  <div className="col-span-2"><Label>Ponto de referência</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} className="mt-1.5" /></div>
                </div>
              )}
              {mode === "retirada" && (
                <div><Label>Horário desejado (opcional)</Label><Input value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} placeholder="Ex: 20h00" className="mt-1.5" /></div>
              )}
              {mode === "consumo_local" && (
                <div><Label>Mesa / Comanda*</Label><Input value={table} onChange={(e) => setTable(e.target.value)} placeholder="Ex: Mesa 7" className="mt-1.5" /></div>
              )}
            </div>
          )}

          {step === "payment" && (
            <div className="space-y-4">
              <RadioGroup value={payment} onValueChange={setPayment} className="grid gap-2">
                {["Dinheiro", "Pix", "Cartão de crédito na entrega", "Cartão de débito na entrega"].map((p) => (
                  <label key={p} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${payment === p ? "border-primary bg-primary/5" : ""}`}>
                    <RadioGroupItem value={p} />
                    <span className="text-sm font-medium">{p}</span>
                  </label>
                ))}
              </RadioGroup>
              {payment === "Dinheiro" && (
                <div><Label>Troco para quanto?</Label><Input type="number" value={changeFor} onChange={(e) => setChangeFor(e.target.value)} placeholder="Ex: 50" className="mt-1.5" /></div>
              )}
              {payment === "Pix" && (
                <div className="rounded-xl border bg-muted/40 p-4 text-sm">
                  <p className="font-semibold">Chave Pix</p>
                  <p className="font-mono text-primary">pix@burgerprime.com.br</p>
                  <p className="mt-1 text-xs text-muted-foreground">Recebedor: Burger Prime LTDA</p>
                  <p className="mt-2 text-xs">Envie o comprovante pelo WhatsApp após finalizar.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t bg-card p-5">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{brl(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Taxa de entrega</span><span>{deliveryFee ? brl(deliveryFee) : "—"}</span></div>
              <div className="flex justify-between text-base font-bold"><span>Total</span><span>{brl(total)}</span></div>
            </div>
            <Button className="mt-4 h-12 w-full text-base" onClick={goNext}>
              {step === "payment" ? "Finalizar pedido" : "Continuar"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
