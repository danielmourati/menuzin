import { useState, useEffect, type ReactNode } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Minus, Plus, Trash2, ShoppingBag, ArrowLeft, ChevronRight,
  Truck, Store as StoreIcon, Utensils, Smartphone, DollarSign,
  User, Mail, Phone, MapPin, Pencil, Home, Map, Ticket, Loader2, X as XIcon,
  Eraser,
} from "lucide-react";
import { useCart, computeUnitPrice } from "@/lib/cart-context";
import { brl } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { getTenantBySlug } from "@/lib/catalog.functions";
import { toast } from "sonner";
import { getPaymentSettingsBySlug, createPixPayment, createCardPayment } from "@/lib/payment-service";
import type { StorePaymentSettingsSafe, PaymentMethod, PixPaymentData, CardPaymentData } from "@/lib/payment-types";
import { PaymentMethodSelector } from "@/components/payment/PaymentMethodSelector";
import { PixCheckout } from "@/components/payment/PixCheckout";
import { CardCheckout } from "@/components/payment/CardCheckout";
import { maskPhone, maskCpfCnpj } from "@/lib/masks";
import { validateCoupon, type ValidatedCoupon } from "@/lib/coupons.functions";
import { listPublicDeliveryZones, resolveDeliveryFee, type PublicDeliveryZone, type DeliveryFeeResolution } from "@/lib/delivery-zones.functions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { lookupByCep } from "@/lib/viacep";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";


type Step =
  | "cart"
  | "mode"
  | "mode-address"
  | "mode-table"
  | "payment-when"
  | "payment-method"
  | "payment-online-pix"
  | "payment-online-card"
  | "payment-pix"
  | "customer"
  | "review";

type Mode = "entrega" | "retirada" | "consumo_local";

export function CartDrawer({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { slug } = useParams({ strict: false }) as { slug?: string };
  const navigate = useNavigate();
  const { items, update, remove, subtotal, clear } = useCart();
  const [step, setStep] = useState<Step>("cart");
  const [history, setHistory] = useState<Step[]>([]);

  // payment settings from DB
  const [settings, setSettings] = useState<StorePaymentSettingsSafe | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [pixData, setPixData] = useState<PixPaymentData | null>(null);
  const [cardData, setCardData] = useState<CardPaymentData | null>(null);

  // Persisted order (created before online payment, reused in finalize)
  const [dbOrderId, setDbOrderId] = useState<string | null>(null);
  const [dbOrderNumber, setDbOrderNumber] = useState<number | null>(null);

  // customer
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [doc, setDoc] = useState("");

  // mode
  const [mode, setMode] = useState<Mode | null>(null);
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [complement, setComplement] = useState("");
  const [reference, setReference] = useState("");
  const [table, setTable] = useState("");

  // payment
  const [paymentWhen, setPaymentWhen] = useState<"agora" | "na_retirada" | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("PIX");
  const [generalNote, setGeneralNote] = useState("");

  // Coupon
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<ValidatedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Submit + CEP lookup
  const [submitting, setSubmitting] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);

  // Fetch settings for tenant
  useEffect(() => {
    if (open && slug) {
      getPaymentSettingsBySlug(slug).then((data) => {
        if (data) {
          setSettings(data);
        }
      });
    }
  }, [open, slug]);

  const { data: tenantData } = useQuery({
    queryKey: ["public-tenant", slug],
    queryFn: () => slug ? getTenantBySlug({ data: { slug } }) : Promise.resolve({ tenant: null }),
    enabled: !!slug,
    staleTime: 60_000,
  });
  const tenant = tenantData?.tenant;
  const tenantAddress = tenant?.address ?? "";
  const deliveryMode = (tenant?.delivery_mode ?? "single") as "none" | "single" | "neighborhood";

  // Delivery zones (per-neighborhood). Only used to populate selector in neighborhood mode.
  const { data: zonesData } = useQuery({
    queryKey: ["public-delivery-zones", slug],
    queryFn: () => slug ? listPublicDeliveryZones({ data: { tenant_slug: slug } }) : Promise.resolve({ zones: [] as PublicDeliveryZone[] }),
    enabled: !!slug && deliveryMode === "neighborhood",
    staleTime: 60_000,
  });
  const zones = zonesData?.zones ?? [];

  // Resolve delivery fee from server (single source of truth).
  const cepDigitsOnly = cep.replace(/\D/g, "");
  const { data: feeResolution, isFetching: feeLoading } = useQuery<DeliveryFeeResolution>({
    queryKey: ["resolve-delivery-fee", slug, cepDigitsOnly, neighborhood],
    queryFn: () => resolveDeliveryFee({ data: { tenant_slug: slug!, cep: cepDigitsOnly, neighborhood } }),
    enabled: !!slug && mode === "entrega",
    staleTime: 30_000,
  });

  const deliveryFee = mode === "entrega" ? Number(feeResolution?.fee ?? 0) : 0;
  const deliveryAvailable = mode !== "entrega" || (feeResolution?.available ?? false);
  const deliveryMinOrder = Number(feeResolution?.min_order_total ?? 0);
  const discount = appliedCoupon ? Math.min(appliedCoupon.discount, subtotal) : 0;
  const total = Math.max(0, subtotal - discount) + deliveryFee;

  const applyCoupon = async () => {
    if (!couponInput || !slug) return;
    setCouponLoading(true);
    try {
      const res = await validateCoupon({ data: { tenant_slug: slug, code: couponInput.trim(), subtotal } });
      setAppliedCoupon(res);
      toast.success(`Cupom ${res.code} aplicado`);
    } catch (e) {
      setAppliedCoupon(null);
      toast.error((e as Error).message || "Cupom inválido");
    } finally {
      setCouponLoading(false);
    }
  };
  const removeCoupon = () => { setAppliedCoupon(null); setCouponInput(""); };

  // Dynamic CEP search (ViaCEP) with debounce + abort.
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
      } else if (res.status === "empty") {
        setCepError("CEP não encontrado");
      } else if (res.status === "error") {
        setCepError("Falha ao buscar CEP. Preencha manualmente.");
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cep]);

  const hasFormData = Boolean(
    cep || street || number || neighborhood || complement || reference ||
    table || name || phone || email || doc || generalNote || couponInput || appliedCoupon
  );

  const clearForm = () => {
    setCep(""); setStreet(""); setNumber(""); setNeighborhood("");
    setComplement(""); setReference(""); setTable("");
    setName(""); setPhone(""); setEmail(""); setDoc(""); setGeneralNote("");
    setCouponInput(""); setAppliedCoupon(null);
    setPaymentWhen(null); setPaymentMethod("PIX"); setSelectedMethod(null);
    setDbOrderId(null); setDbOrderNumber(null);
    setPixData(null); setCardData(null);
    setCepError(null); setCepLoading(false);
    setHistory([]); setStep("mode");
    toast.success("Campos limpos");
  };

  const requestClearForm = () => {
    if (hasFormData) setClearOpen(true);
    else clearForm();
  };



  const goTo = (next: Step) => {
    setHistory((h) => [...h, step]);
    setStep(next);
  };
  const goBack = () => {
    setHistory((h) => {
      const prev = h[h.length - 1];
      if (!prev) return h;
      setStep(prev);
      return h.slice(0, -1);
    });
  };
  const resetAll = () => {
    setStep("cart"); setHistory([]);
    setDbOrderId(null); setDbOrderNumber(null);
    setPixData(null); setCardData(null); setSelectedMethod(null);
    setAppliedCoupon(null); setCouponInput("");
  };


  const modeLabelMap: Record<Mode, string> = {
    entrega: "Entrega", retirada: "Retirada no local", consumo_local: "Consumo no local",
  };
  const paymentWhenLabel = paymentWhen === "agora" ? "Pagar agora" : paymentWhen === "na_retirada" ? "Pagar na retirada" : "";

  const selectMode = (m: Mode) => {
    setMode(m);
    if (m === "entrega") goTo("mode-address");
    else if (m === "consumo_local") goTo("mode-table");
    else goTo("customer"); // retirada → collect customer info next
  };

  const confirmAddress = () => {
    if (!street || !number || !neighborhood) return toast.error("Preencha o endereço");
    if (!deliveryAvailable) {
      return toast.error(feeResolution?.message || "Endereço fora da área de entrega");
    }
    if (deliveryMinOrder > 0 && subtotal < deliveryMinOrder) {
      return toast.error(`Pedido mínimo para esta área: ${brl(deliveryMinOrder)}`);
    }
    goTo("customer");
  };
  const confirmTable = () => {
    if (!table) return toast.error("Informe a mesa/comanda");
    goTo("customer");
  };

  const confirmCustomer = () => {
    if (!name || !phone) return toast.error("Informe nome e telefone");
    goTo("payment-when");
  };

  const selectPaymentWhen = (w: "agora" | "na_retirada") => {
    setPaymentWhen(w);
    setSelectedMethod(null);
    goTo("payment-method");
  };

  // Persist a draft order if not already created (used before online MP call).
  // Returns the order id AND number to avoid React setState race conditions.
  const ensureOrder = async (methodLabel: string): Promise<{ id: string; number: number }> => {
    if (dbOrderId && dbOrderNumber != null) return { id: dbOrderId, number: dbOrderNumber };
    const { createOrder } = await import("@/lib/orders.functions");
    const res = await createOrder({
      data: {
        tenant_slug: slug || "",
        customer_name: name,
        whatsapp: phone.replace(/\D/g, ""),
        mode: mode!,
        payment_label: `${paymentWhenLabel} · ${methodLabel}`,
        delivery_fee: deliveryFee,
        delivery_fee_source: mode === "entrega" ? (feeResolution?.source ?? null) : null,
        delivery_neighborhood_snapshot: mode === "entrega" ? (feeResolution?.neighborhood ?? neighborhood ?? null) : null,
        address: mode === "entrega" ? { cep, street, number, neighborhood, complement, reference } : null,
        table_label: mode === "consumo_local" ? table : null,
        note: generalNote || null,
        coupon_code: appliedCoupon?.code ?? null,

        items: items.map((i) => {
          const sizeLabel = i.size ? [{ name: `Tamanho: ${i.size.name}`, price: 0 }] : [];
          const flavorLabels = (i.flavors ?? []).map((f) => ({ name: `Sabor: ${f.name}`, price: 0 }));
          const groupLabels = (i.groupOptions ?? []).map((o) => ({ name: `${o.groupName}: ${o.name}`, price: Number(o.price) }));
          const legacyAddons = i.addons.map((a) => ({ name: a.name, price: Number(a.price) }));
          return {
            product_id: /^[0-9a-f-]{36}$/i.test(i.product.id) ? i.product.id : null,
            name_snapshot: i.product.name,
            qty: i.qty,
            unit_price: computeUnitPrice(i),
            addons: [...sizeLabel, ...flavorLabels, ...groupLabels, ...legacyAddons],
            note: i.note ?? null,
          };
        }),
      },
    });
    setDbOrderId(res.order.id);
    setDbOrderNumber(res.order.number);
    return { id: res.order.id, number: res.order.number };
  };

  const handleSelectMethod = async (m: PaymentMethod) => {
    setSelectedMethod(m);

    const methodLabels: Record<PaymentMethod, string> = {
      pix_online: "Pix Online (Mercado Pago)",
      credit_card: "Cartão de Crédito Online (Mercado Pago)",
      debit_card: "Cartão de Débito Online (Mercado Pago)",
      pix_manual: "Pix Manual (Comprovante)",
      cash: "Dinheiro em Espécie",
      card_on_delivery: "Cartão na Maquininha (Entrega)",
    };
    setPaymentMethod(methodLabels[m]);

    if (m === "pix_online") {
      const toastId = toast.loading("Gerando transação Pix segura...");
      try {
        const { id: orderId } = await ensureOrder(methodLabels[m]);
        const res = await createPixPayment({
          store_slug: slug || "",
          order_id: orderId,
          payment_method: "pix_online",
          payer: {
            email: email || "comprador@teste.com",
            first_name: name.split(" ")[0] || "Cliente",
            last_name: name.split(" ").slice(1).join(" ") || "Menuzin",
          },
        });
        toast.dismiss(toastId);
        setPixData(res.data);
        goTo("payment-online-pix");
      } catch (err) {
        toast.dismiss(toastId);
        const msg = err instanceof Error ? err.message : "Erro ao gerar pagamento Pix.";
        toast.error(msg);
      }
    } else if (m === "credit_card" || m === "debit_card") {
      // Ensure order exists so CardCheckout has a real order_id to bind
      try {
        await ensureOrder(methodLabels[m]);
        goTo("payment-online-card");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha ao iniciar pagamento.";
        toast.error(msg);
      }
    } else if (m === "pix_manual") {
      goTo("payment-pix");
    } else {
      goTo("review");
    }
  };

  const handleCardSubmit = async (cardInfo: {
    cardNumber: string;
    cardholderName: string;
    expirationMonth: string;
    expirationYear: string;
    securityCode: string;
    installments: number;
    cardToken: string;
  }) => {
    const { id: orderId } = await ensureOrder(paymentMethod);
    const res = await createCardPayment({
      store_slug: slug || "",
      order_id: orderId,
      payment_method: selectedMethod === "debit_card" ? "debit_card" : "credit_card",
      card_token: cardInfo.cardToken,
      installments: cardInfo.installments,
      payer: {
        email: email || "comprador@teste.com",
        first_name: cardInfo.cardholderName.split(" ")[0] || "Titular",
        last_name: cardInfo.cardholderName.split(" ").slice(1).join(" ") || "Card",
        identification: { type: "CPF", number: (doc || "11111111111").replace(/\D/g, "") },
      },
    });
    setCardData(res.data);
    return res.data;
  };

  const finalize = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // Status mapping
      let finalPaymentStatus: "pending" | "approved" | "rejected" | "manual" = "pending";
      let mpPaymentId: string | undefined = undefined;

      if (selectedMethod === "pix_online") {
        finalPaymentStatus = (pixData?.payment_status as typeof finalPaymentStatus) || "pending";
        mpPaymentId = pixData?.payment_id;
      } else if (selectedMethod === "credit_card" || selectedMethod === "debit_card") {
        finalPaymentStatus = (cardData?.payment_status as typeof finalPaymentStatus) || "approved";
        mpPaymentId = cardData?.payment_id;
      } else if (selectedMethod === "cash" || selectedMethod === "card_on_delivery" || selectedMethod === "pix_manual") {
        finalPaymentStatus = "manual";
      }

      // Ensure order persisted (for offline methods that skipped the online flow).
      // Use the returned values directly — dbOrderNumber state is not yet updated.
      let orderId: string;
      let orderNumber: number;
      try {
        const persisted = await ensureOrder(paymentMethod);
        orderId = persisted.id;
        orderNumber = persisted.number;
      } catch (err) {
        console.error("Falha ao persistir pedido no banco:", err);
        toast.error("Não foi possível registrar o pedido. Tente novamente.");
        return;
      }

      const order = {
        number: orderNumber,
        id: orderId,
        customerName: name,
        whatsapp: phone.replace(/\D/g, ""),
        email,
        doc,
        mode: mode!,
        payment: `${paymentWhenLabel} · ${paymentMethod}`,
        paymentMethod: selectedMethod,
        paymentStatus: finalPaymentStatus,
        orderStatus: (finalPaymentStatus as string) === "approved" ? "new" : "pending_payment",
        mpPaymentId,
        items: items.map((i) => ({
          name: i.product.name,
          qty: i.qty,
          unitPrice: computeUnitPrice(i),
          addons: [
            ...(i.size ? [{ id: i.size.id, name: `Tamanho: ${i.size.name}`, price: 0 }] : []),
            ...((i.flavors ?? []).map((f) => ({ id: f.id, name: `Sabor: ${f.name}`, price: 0 }))),
            ...((i.groupOptions ?? []).map((o) => ({ id: o.id, name: `${o.groupName}: ${o.name}`, price: Number(o.price) }))),
            ...i.addons,
          ],
          note: i.note,
        })),
        subtotal, deliveryFee, total,
        address: mode === "entrega" ? { cep, street, number, neighborhood, complement, reference } : undefined,
        table: mode === "consumo_local" ? table : undefined,
        note: generalNote,
      };
      try { sessionStorage.setItem(`order:${order.number}`, JSON.stringify(order)); } catch {}
      toast.success(`Pedido #${order.number} criado`);
      clear();
      onOpenChange(false);
      resetAll();
      navigate({
        to: "/$slug/pedido-confirmado",
        params: { slug: slug || tenant?.slug || "" },
        search: { n: order.number } as never,
      });
    } finally {
      setSubmitting(false);
    }
  };


  // ----- UI building blocks -----
  const Header = ({ title, right }: { title: string; right?: ReactNode }) => (
    <div className="flex items-center justify-between border-b bg-card px-4 py-3.5">
      <div className="flex items-center gap-2">
        <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => (history.length ? goBack() : onOpenChange(false))}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {right}
    </div>
  );

  const StickySubtotal = ({ cta, onCta, disabled, loading }: { cta?: string; onCta?: () => void; disabled?: boolean; loading?: boolean }) => (
    <div className="border-t bg-card px-4 py-3">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Subtotal</span><span>{brl(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex items-center gap-2 text-xs text-success">
              <span>Desconto</span><span>− {brl(discount)}</span>
            </div>
          )}
          {deliveryFee > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Taxa de entrega</span><span>{brl(deliveryFee)}</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-bold leading-none">{brl(total)}</p>
        </div>
        {cta && (
          <Button onClick={onCta} disabled={disabled || loading} className="h-12 min-w-[140px] rounded-xl text-base font-semibold">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : cta}
          </Button>
        )}
      </div>
    </div>
  );

  const OptionRow = ({
    icon, title, subtitle, onClick, active, muted,
  }: { icon: ReactNode; title: string; subtitle?: string; onClick: () => void; active?: boolean; muted?: boolean }) => (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left transition hover:border-primary/40 ${
        active ? "border-primary/60" : ""
      }`}
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
        active ? "bg-primary/15 text-primary" : muted ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
      }`}>{icon}</span>
      <div className="flex-1">
        <p className={`font-semibold ${muted ? "text-muted-foreground" : ""}`}>{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </button>
  );

  const ClearBtn = () => (
    <button
      onClick={requestClearForm}
      className="flex items-center gap-1 text-sm font-semibold text-primary"
      type="button"
    >
      <Eraser className="h-4 w-4" /> Limpar
    </button>
  );

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetAll(); }}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 bg-card p-0 sm:max-w-md">
        {/* CART */}
        {step === "cart" && (
          <>
            <Header
              title="Carrinho"
              right={items.length > 0 && (
                <button onClick={() => { clear(); toast.success("Carrinho esvaziado"); }} className="text-sm font-semibold text-primary">Limpar</button>
              )}
            />
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center text-muted-foreground">
                  <ShoppingBag className="h-12 w-12" />
                  <p className="mt-3">Seu carrinho está vazio</p>
                </div>
              ) : (
                <div className="divide-y bg-card">
                  {items.map((i) => {
                    const unit = computeUnitPrice(i);
                    const detailParts: string[] = [];
                    if (i.size) detailParts.push(i.size.name);
                    if (i.flavors && i.flavors.length) detailParts.push(i.flavors.map((f) => f.name).join(" + "));
                    if (i.groupOptions && i.groupOptions.length) detailParts.push(i.groupOptions.map((o) => o.name).join(", "));
                    if (i.addons.length) detailParts.push(i.addons.map((a) => a.name).join(", "));
                    return (
                      <div key={i.uid} className="px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold leading-tight">{i.product.name}</p>
                            {detailParts.length > 0 && (
                              <p className="mt-0.5 text-xs text-muted-foreground">{detailParts.join(" · ")}</p>
                            )}
                            <p className="mt-2 font-bold">{brl(unit * i.qty)}</p>
                          </div>
                          <button className="text-sm font-semibold text-primary" onClick={() => onOpenChange(false)}>Alterar</button>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <div className="flex items-center gap-2 rounded-lg bg-muted px-2 py-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => i.qty === 1 ? remove(i.uid) : update(i.uid, i.qty - 1)}>
                              {i.qty === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                            </Button>
                            <span className="w-6 text-center text-sm font-semibold">{i.qty}</span>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => update(i.uid, i.qty + 1)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="px-4 py-6 text-center">
                    <button onClick={() => onOpenChange(false)} className="text-sm font-bold text-primary">
                      Adicionar mais itens
                    </button>
                  </div>
                </div>
              )}
            </div>
            {items.length > 0 && <StickySubtotal cta="Continuar" onCta={() => goTo("mode")} />}
          </>
        )}

        {/* MODE */}
        {step === "mode" && (
          <>
            <Header title="Opções de entrega" />
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {(tenant?.accepts_delivery ?? true) && (
                <OptionRow icon={<Truck className="h-5 w-5" />} title="Entrega" subtitle="Receba em seu endereço" onClick={() => selectMode("entrega")} active={mode === "entrega"} />
              )}
              {(tenant?.accepts_takeout ?? true) && (
                <OptionRow icon={<StoreIcon className="h-5 w-5" />} title="Retirada" subtitle="Retire no estabelecimento" onClick={() => selectMode("retirada")} active={mode === "retirada"} />
              )}
              {(tenant?.accepts_dinein ?? true) && (
                <OptionRow icon={<Utensils className="h-5 w-5" />} title="Consumo no local" subtitle="Consuma no estabelecimento" onClick={() => selectMode("consumo_local")} active={mode === "consumo_local"} />
              )}
            </div>
            <StickySubtotal />
          </>
        )}

        {/* MODE - ADDRESS */}
        {step === "mode-address" && (
          <>
            <Header title="Endereço de entrega" right={<ClearBtn />} />
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>CEP</Label>
                  <Input
                    value={cep}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, "").slice(0, 8);
                      const masked = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
                      setCep(masked);
                    }}
                    placeholder="00000-000"
                    inputMode="numeric"
                    className="mt-1.5 h-11"
                  />
                  {cepLoading && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Buscando endereço…
                    </p>
                  )}
                  {cepError && !cepLoading && (
                    <p className="mt-1 text-xs text-destructive">{cepError}</p>
                  )}
                </div>
                <div className="col-span-2"><Label>Rua *</Label><Input value={street} onChange={(e) => setStreet(e.target.value)} className="mt-1.5 h-11" /></div>
                <div><Label>Número *</Label><Input value={number} onChange={(e) => setNumber(e.target.value)} className="mt-1.5 h-11" /></div>
                <div>
                  <Label>Bairro *</Label>
                  {deliveryMode === "neighborhood" && zones.length > 0 ? (
                    <Select value={neighborhood} onValueChange={setNeighborhood}>
                      <SelectTrigger className="mt-1.5 h-11"><SelectValue placeholder="Selecione o bairro" /></SelectTrigger>
                      <SelectContent>
                        {zones.map((z) => (
                          <SelectItem key={z.id} value={z.neighborhood}>
                            {z.neighborhood} — {brl(z.fee)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="mt-1.5 h-11" />
                  )}
                </div>
                <div className="col-span-2"><Label>Complemento</Label><Input value={complement} onChange={(e) => setComplement(e.target.value)} className="mt-1.5 h-11" /></div>
                <div className="col-span-2"><Label>Ponto de referência</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} className="mt-1.5 h-11" /></div>
              </div>

              {/* Delivery fee feedback */}
              <div className="mt-4 rounded-lg border bg-card p-3 text-sm">
                {feeLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Calculando taxa de entrega…
                  </div>
                ) : feeResolution?.mode === "none" ? (
                  <div className="flex items-center justify-between">
                    <span>Taxa de entrega</span>
                    <span className="font-semibold text-success">Grátis</span>
                  </div>
                ) : feeResolution?.available ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Taxa de entrega{feeResolution.neighborhood ? ` (${feeResolution.neighborhood})` : ""}</span>
                      <span className="font-semibold">{brl(feeResolution.fee)}</span>
                    </div>
                    {deliveryMinOrder > 0 && (
                      <p className="text-[11px] text-muted-foreground">Pedido mínimo: {brl(deliveryMinOrder)}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-destructive text-xs">
                    {feeResolution?.message || "Informe o CEP ou bairro para calcular a taxa de entrega."}
                  </p>
                )}
              </div>
            </div>
            <StickySubtotal cta="Confirmar endereço" onCta={confirmAddress} disabled={!deliveryAvailable} />
          </>
        )}


        {/* MODE - TABLE */}
        {step === "mode-table" && (
          <>
            <Header title="Mesa / Comanda" right={<ClearBtn />} />
            <div className="flex-1 overflow-y-auto p-4">
              <Label>Mesa ou número da comanda *</Label>
              <Input value={table} onChange={(e) => setTable(e.target.value)} placeholder="Ex: Mesa 7" className="mt-1.5 h-11" />
            </div>
            <StickySubtotal cta="Confirmar" onCta={confirmTable} />
          </>
        )}

        {/* PAYMENT - WHEN */}
        {step === "payment-when" && (
          <>
            <Header title="Opções de pagamento" />
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <OptionRow icon={<Smartphone className="h-5 w-5" />} title="Pagar agora" subtitle="Pague agora pelo aplicativo" onClick={() => selectPaymentWhen("agora")} />
              <OptionRow icon={<DollarSign className="h-5 w-5" />} title={mode === "entrega" ? "Pagar na entrega" : "Pagar na retirada"} subtitle={mode === "entrega" ? "Pague no momento da entrega" : "Pague no momento da retirada"} onClick={() => selectPaymentWhen("na_retirada")} />
            </div>
            <StickySubtotal />
          </>
        )}

        {/* PAYMENT - METHOD */}
        {step === "payment-method" && (
          <>
            <Header title="Método de pagamento" />
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <PaymentMethodSelector
                settings={settings}
                paymentWhen={paymentWhen || "na_retirada"}
                selectedMethod={selectedMethod}
                onSelectMethod={handleSelectMethod}
              />
            </div>
            <StickySubtotal />
          </>
        )}

        {/* PAYMENT - ONLINE - PIX */}
        {step === "payment-online-pix" && pixData && (
          <>
            <Header title="Pagamento Pix" />
            <div className="flex-1 overflow-y-auto bg-card">
              <PixCheckout
                pixData={pixData}
                amount={total}
                storeSlug={slug || ""}
                onSuccess={() => goTo("review")}
                onCancel={() => {
                  setPixData(null);
                  setSelectedMethod(null);
                  setStep("payment-method");
                }}
              />
            </div>
            <StickySubtotal />
          </>
        )}

        {/* PAYMENT - ONLINE - CARD */}
        {step === "payment-online-card" && (
          <>
            <Header title="Pagamento com Cartão" />
            <div className="flex-1 overflow-y-auto bg-card">
              <CardCheckout
                amount={total}
                publicKey={settings?.mp_public_key || ""}
                onSubmit={handleCardSubmit}
                onSuccess={() => goTo("review")}
                onCancel={() => {
                  setCardData(null);
                  setSelectedMethod(null);
                  setStep("payment-method");
                }}
              />
            </div>
            <StickySubtotal />
          </>
        )}

        {/* PAYMENT - PIX */}
        {step === "payment-pix" && (
          <>
            <Header title="Pagamento com PIX" />
            <div className="flex-1 overflow-y-auto p-4">
              <div className="rounded-2xl border bg-card p-5">
                <p className="text-sm text-muted-foreground">Chave PIX</p>
                <p className="mt-1 font-mono text-primary">pix@burgerprime.com.br</p>
                <p className="mt-3 text-xs text-muted-foreground">Recebedor: Burger Prime LTDA</p>
                <p className="mt-3 text-xs">Envie o comprovante pelo WhatsApp após finalizar o pedido.</p>
              </div>
            </div>
            <StickySubtotal cta="Continuar" onCta={() => goTo("customer")} />
          </>
        )}

        {/* CUSTOMER */}
        {step === "customer" && (
          <>
            <Header title="Insira seus dados" right={<ClearBtn />} />
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div>
                <Label>Nome <span className="text-primary">*</span></Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Insira seu nome" className="mt-1.5 h-11" />
              </div>
              <div>
                <Label>Telefone <span className="text-primary">*</span></Label>
                <div className="mt-1.5 flex gap-2">
                  <div className="flex h-11 items-center gap-1 rounded-md border bg-card px-3 text-sm">🇧🇷 +55</div>
                  <Input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" inputMode="tel" maxLength={15} className="h-11 flex-1" />
                </div>
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Insira seu e-mail" className="mt-1.5 h-11" />
              </div>
              <div>
                <Label>CPF/CNPJ</Label>
                <Input value={doc} onChange={(e) => setDoc(maskCpfCnpj(e.target.value))} placeholder="Insira seu CPF ou CNPJ" inputMode="numeric" maxLength={18} className="mt-1.5 h-11" />
              </div>
              <div>
                <Label>Observação geral</Label>
                <Textarea value={generalNote} onChange={(e) => setGeneralNote(e.target.value)} placeholder="Alguma observação para o pedido?" className="mt-1.5" />
              </div>
              <Button className="h-12 w-full text-base font-semibold" onClick={confirmCustomer}>Confirmar</Button>
            </div>
          </>
        )}

        {/* REVIEW */}
        {step === "review" && (
          <>
            <Header
              title="Revisar pedido"
              right={
                <div className="flex items-center gap-2">
                  <ClearBtn />
                  <Button size="icon" variant="ghost" className="h-9 w-9 text-primary" onClick={() => { onOpenChange(false); resetAll(); }}>
                    <Home className="h-5 w-5" />
                  </Button>
                </div>
              }
            />
            <div className="flex-1 space-y-3 overflow-y-auto bg-card p-4">
              {/* Customer */}
              <div className="rounded-2xl bg-card p-4">
                <div className="flex items-center gap-2 font-semibold"><User className="h-4 w-4" /> {name}</div>
                {email && <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4" /> {email}</div>}
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-4 w-4" /> +55 {phone}</div>
              </div>

              {/* Mode */}
              <div className="rounded-2xl bg-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 font-semibold">
                    {mode === "entrega" ? <Truck className="h-5 w-5" /> : mode === "retirada" ? <StoreIcon className="h-5 w-5" /> : <Utensils className="h-5 w-5" />}
                    {mode && modeLabelMap[mode]}
                  </div>
                  <button onClick={() => setStep("mode")} className="text-sm font-semibold text-primary">Alterar</button>
                </div>
                {mode === "entrega" && (
                  <div className="mt-3 space-y-1 text-sm">
                    <p className="flex items-center gap-1 font-medium text-muted-foreground"><MapPin className="h-4 w-4" /> Endereço:</p>
                    <p>{street}, {number}{complement ? ` — ${complement}` : ""}</p>
                    {neighborhood && (
                      <p><span className="text-muted-foreground">Bairro:</span> <span className="font-semibold">{neighborhood}</span></p>
                    )}
                    {deliveryFee > 0 && (
                      <p><span className="text-muted-foreground">Taxa de entrega:</span> <span className="font-semibold">{brl(deliveryFee)}</span></p>
                    )}
                    {deliveryMinOrder > 0 && (
                      <p className="text-xs text-muted-foreground">Pedido mínimo nesta área: {brl(deliveryMinOrder)}</p>
                    )}
                  </div>
                )}
                {mode === "retirada" && (
                  <div className="mt-3 text-sm">
                    <p className="flex items-center gap-1 font-medium text-muted-foreground"><MapPin className="h-4 w-4" /> Endereço:</p>
                    <p className="mt-1">{tenantAddress}</p>
                    <button className="mt-2 flex items-center gap-1 text-sm font-semibold text-primary"><Map className="h-4 w-4" /> Ver no mapa</button>
                  </div>
                )}
                {mode === "consumo_local" && (
                  <p className="mt-2 text-sm">Mesa: <span className="font-semibold">{table}</span></p>
                )}
              </div>

              {/* Payment */}
              <div className="rounded-2xl bg-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 font-semibold"><Smartphone className="h-5 w-5" /> {paymentWhenLabel}</div>
                  <button onClick={() => setStep("payment-when")} className="text-sm font-semibold text-primary">Alterar</button>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm">
                    <p className="font-medium">Pagamento com {paymentMethod}</p>
                    <p className="text-xs text-muted-foreground">{paymentWhen === "agora" ? "Pague agora" : "Pague no momento"} com {paymentMethod}</p>
                  </div>
                  <button onClick={() => setStep("payment-method")} className="text-primary"><Pencil className="h-4 w-4" /></button>
                </div>
              </div>

              {/* Items */}
              <div className="rounded-2xl bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Itens do pedido <span className="text-muted-foreground">| {items.reduce((s, i) => s + i.qty, 0)} Itens</span></p>
                  <button onClick={() => setStep("cart")} className="text-sm font-semibold text-primary">Alterar itens</button>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  {items.map((i) => {
                    const unit = computeUnitPrice(i);
                    return (
                      <div key={i.uid} className="flex justify-between gap-3">
                        <span><span className="font-semibold">{i.qty}x</span> {i.product.name}</span>
                        <span className="font-semibold">{brl(unit * i.qty)}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between border-t pt-2 text-muted-foreground">
                    <span>Subtotal</span><span>{brl(subtotal)}</span>
                  </div>
                  {discount > 0 && appliedCoupon && (
                    <div className="flex justify-between text-success">
                      <span>Cupom {appliedCoupon.code}</span><span>− {brl(discount)}</span>
                    </div>
                  )}
                  {deliveryFee > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Taxa de entrega{neighborhood ? ` (${neighborhood})` : ""}</span><span>{brl(deliveryFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 text-base font-bold">
                    <span>Total</span><span>{brl(total)}</span>
                  </div>
                </div>
              </div>

              {/* Cupom */}
              <div className="rounded-2xl bg-card p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Ticket className="h-4 w-4" /> Cupom de desconto
                </div>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between rounded-lg border border-success/40 bg-success/10 px-3 py-2">
                    <div className="text-sm">
                      <p className="font-mono font-bold">{appliedCoupon.code}</p>
                      <p className="text-xs text-success">Desconto de {brl(discount)} aplicado</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={removeCoupon}>
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Digite o código"
                      className="h-10 uppercase font-mono"
                      maxLength={40}
                    />
                    <Button onClick={applyCoupon} disabled={couponLoading || !couponInput} className="h-10">
                      {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                    </Button>
                  </div>
                )}
              </div>

            </div>
            <StickySubtotal cta="Fazer pedido" onCta={finalize} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
