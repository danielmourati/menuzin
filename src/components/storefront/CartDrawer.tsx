import { useState, useEffect, useRef, type ReactNode } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { readCustomerProfile, writeCustomerProfile, clearCustomerProfile } from "@/lib/customer-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { isValidCpf } from "@/lib/order-payment-gate";
import { getMpDeviceId, loadMpSecurityScript } from "@/lib/mp-device";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowLeft,
  ChevronRight,
  Truck,
  Store as StoreIcon,
  Utensils,
  Smartphone,
  DollarSign,
  User,
  Mail,
  Phone,
  MapPin,
  Pencil,
  Home,
  Map,
  Ticket,
  Loader2,
  X as XIcon,
  Eraser,
  Clock,
  CreditCard,
  FileText,
  Receipt,
} from "lucide-react";
import { useCart, computeUnitPrice } from "@/lib/cart-context";
import { brl } from "@/lib/format";
import { buildWhatsAppLink } from "@/lib/whatsapp-link";
import { useQuery } from "@tanstack/react-query";
import { getTenantBySlug } from "@/lib/catalog.functions";
import { toast } from "sonner";
import {
  getPaymentSettingsBySlug,
  createPixPayment,
  createCardPayment,
} from "@/lib/payment-service";
import type {
  StorePaymentSettingsSafe,
  PaymentMethod,
  PixPaymentData,
  CardPaymentData,
} from "@/lib/payment-types";
import { PaymentMethodSelector } from "@/components/payment/PaymentMethodSelector";
import { CashChangePicker, cashChangeError, type CashChangeValue } from "@/components/payment/CashChangePicker";
import { changeDue } from "@/lib/cash-change";
import { PixCheckout } from "@/components/payment/PixCheckout";
import { CardCheckout } from "@/components/payment/CardCheckout";
import { maskPhone } from "@/lib/masks";
import { validateCoupon, type ValidatedCoupon } from "@/lib/coupons.functions";
import {
  listPublicDeliveryZones,
  resolveDeliveryFee,
  type PublicDeliveryZone,
  type DeliveryFeeResolution,
} from "@/lib/delivery-zones.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { lookupByCep } from "@/lib/viacep";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UpsellSuggestions } from "@/components/storefront/UpsellSuggestions";
import type { Tenant } from "@/lib/domain-types";
import { ScheduleStep } from "@/components/storefront/ScheduleStep";
import { formatScheduledLong } from "@/lib/scheduling";
import { readReceivePref } from "@/lib/receive-pref";

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
  | "payment-cash"
  | "customer"
  | "when"
  | "review";

type Mode = "entrega" | "retirada" | "consumo_local";

export function CartDrawer({
  open,
  onOpenChange,
  tenant: storefrontTenant,
  storeOpen = true,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenant?: Tenant;
  storeOpen?: boolean;
}) {
  const { slug } = useParams({ strict: false }) as { slug?: string };
  const effectiveSlug = (storefrontTenant?.slug || slug || "").toLowerCase();
  const navigate = useNavigate();
  const { items, update, remove, subtotal, clear, activeCouponCode, setActiveCouponCode, clearActiveCoupon } = useCart();
  const [step, setStep] = useState<Step>("cart");
  const [history, setHistory] = useState<Step[]>([]);

  // payment settings from DB
  const [settings, setSettings] = useState<StorePaymentSettingsSafe | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [cashChange, setCashChange] = useState<CashChangeValue>({ noChange: false, paid: null });
  const [pixData, setPixData] = useState<PixPaymentData | null>(null);
  const [cardData, setCardData] = useState<CardPaymentData | null>(null);

  // Persisted order (created before online payment, reused in finalize)
  const [dbOrderId, setDbOrderId] = useState<string | null>(null);
  const ensureOrderPromise = useRef<Promise<{ id: string; number: number } | null> | null>(null);
  const methodBusyRef = useRef(false);
  // Código único por checkout: o servidor usa para nunca criar o mesmo pedido duas vezes.
  const checkoutKeyStorage = `menuzin_checkout_key:${effectiveSlug || "loja"}`;
  const getCheckoutKey = () => {
    try {
      const existing = sessionStorage.getItem(checkoutKeyStorage);
      if (existing) return existing;
      const k = crypto.randomUUID();
      sessionStorage.setItem(checkoutKeyStorage, k);
      return k;
    } catch {
      return crypto.randomUUID();
    }
  };
  const clearCheckoutKey = () => {
    try {
      sessionStorage.removeItem(checkoutKeyStorage);
    } catch {
      /* ignore */
    }
  };
  const [dbOrderNumber, setDbOrderNumber] = useState<number | null>(null);

  // customer
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [doc, setDoc] = useState("");
  const [cpfPromptOpen, setCpfPromptOpen] = useState(false);
  const [cpfDraft, setCpfDraft] = useState("");

  // mode
  const [mode, setMode] = useState<Mode | null>(null);
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  // Bairro só fica travado quando o CEP trouxe o bairro (ele define a taxa).
  const [cepHasNeighborhood, setCepHasNeighborhood] = useState(true);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [complement, setComplement] = useState("");
  const [reference, setReference] = useState("");
  const [table, setTable] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);

  // payment
  const [paymentWhen, setPaymentWhen] = useState<"agora" | "na_retirada" | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("PIX");
  const [generalNote, setGeneralNote] = useState("");

  // Coupon
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<ValidatedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponHint, setCouponHint] = useState<string | null>(null);

  // Submit + CEP lookup
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);

  // Prefill from the universal customer profile (no account required)
  const [usingSavedProfile, setUsingSavedProfile] = useState(false);
  useEffect(() => {
    if (!open) return;
    const p = readCustomerProfile();
    if (!p?.phone) return;
    setUsingSavedProfile(true);
    setName((v) => v || p.name || "");
    setPhone((v) => v || maskPhone(p.phone));
    const a = p.address;
    if (a) {
      setCep((v) => v || a.cep || "");
      setStreet((v) => v || a.street || "");
      setNumber((v) => v || a.number || "");
      setNeighborhood((v) => v || a.neighborhood || "");
      setComplement((v) => v || a.complement || "");
      setReference((v) => v || a.reference || "");
      setCity((v) => v || a.city || "");
      setState((v) => v || a.state || "");
    }
  }, [open]);

  // Preferência escolhida no topo da loja (Entregar / Retirar / Consumir)
  useEffect(() => {
    if (!open || !effectiveSlug) return;
    const pref = readReceivePref(effectiveSlug);
    if (!pref) return;
    setMode((m) => m ?? pref.mode);
    if (pref.mode === "entrega") {
      if (pref.cep) {
        // Endereço calculado na loja é a escolha mais recente: tem prioridade.
        const savedCep = (readCustomerProfile()?.address?.cep ?? "").replace(/\D/g, "");
        const sameCep = savedCep === pref.cep.replace(/\D/g, "");
        setCep(pref.cep);
        if (pref.street) setStreet(pref.street);
        if (pref.neighborhood) setNeighborhood(pref.neighborhood);
        if (pref.city) setCity(pref.city);
        if (pref.state) setState(pref.state);
        if (!sameCep) {
          setNumber("");
          setComplement("");
          setReference("");
        }
      } else if (pref.neighborhood) {
        setNeighborhood((v) => v || pref.neighborhood!);
      }
      if (pref.zoneId) setSelectedZoneId((v) => v ?? pref.zoneId!);
    }
  }, [open, effectiveSlug]);

  const forgetSavedProfile = () => {
    clearCustomerProfile();
    setUsingSavedProfile(false);
    setName("");
    setPhone("");
    setCep("");
    setStreet("");
    setNumber("");
    setNeighborhood("");
    setComplement("");
    setReference("");
    setCity("");
    setState("");
    // toast.success("Dados salvos removidos deste dispositivo");
  };

  // Fetch settings for tenant
  useEffect(() => {
    if (open && effectiveSlug) {
      getPaymentSettingsBySlug(effectiveSlug).then((data) => {
        if (data) {
          setSettings(data);
        }
      });
    }
  }, [open, effectiveSlug]);

  const { data: tenantData } = useQuery({
    queryKey: ["public-tenant", effectiveSlug],
    queryFn: () => (effectiveSlug ? getTenantBySlug({ data: { slug: effectiveSlug } }) : Promise.resolve({ tenant: null })),
    enabled: !!effectiveSlug && !storefrontTenant,
    staleTime: 60_000,
  });
  type TenantLike = Partial<Tenant> & {
    accepts_delivery?: boolean | null;
    accepts_takeout?: boolean | null;
    accepts_dinein?: boolean | null;
    delivery_mode?: "none" | "single" | "neighborhood" | "km" | null;
  };
  const tenant = (storefrontTenant ?? tenantData?.tenant ?? null) as TenantLike | null;
  const tenantAddress = tenant?.address ?? "";
  const deliveryMode = (tenant?.deliveryMode ?? tenant?.delivery_mode ?? "single") as "none" | "single" | "neighborhood" | "km";
  const rawTenantPlan = (tenant as { plan?: string } | null | undefined)?.plan;
  const tenantPlan = rawTenantPlan === "pro" ? "pro" : "presenca";
  const isPresencaOnly = tenantPlan === "presenca";
  const isPaidPlan = tenantPlan === "pro";
  // Presença ignora flags (loja não configura modalidades) — sempre mostra as 3 opções.
  const acceptsDelivery = isPresencaOnly ? true : (tenant?.acceptsDelivery ?? tenant?.accepts_delivery ?? true);
  const acceptsTakeout = isPresencaOnly ? true : (tenant?.acceptsTakeout ?? tenant?.accepts_takeout ?? true);
  const acceptsDinein = isPresencaOnly ? true : (tenant?.acceptsDinein ?? tenant?.accepts_dinein ?? true);

  const buildWhatsappOrderMessage = () => {
    const lines: string[] = [];
    const modeLabels: Record<string, string> = {
      entrega: "Entrega",
      retirada: "Retirada no balcão",
      consumo_local: "Consumo no local",
    };
    lines.push("Olá! Vim pelo Menuzin e gostaria de fazer o pedido abaixo:");
    lines.push("");
    if (name) lines.push(`*Cliente:* ${name}`);
    if (phone) lines.push(`*WhatsApp:* ${phone}`);
    if (mode) lines.push(`*Modalidade:* ${modeLabels[mode] ?? mode}`);
    if (scheduledFor) lines.push(`*Agendado para:* ${formatScheduledLong(scheduledFor, storefrontTenant?.schedulingSlotMinutes ?? 10)}`);
    lines.push("");
    lines.push("*Itens:*");
    for (const i of items) {
      const unit = computeUnitPrice(i);
      const parts: string[] = [];
      if (i.size) parts.push(i.size.name);
      if (i.flavors?.length) parts.push(i.flavors.map((f) => f.name).join(" + "));
      if (i.groupOptions?.length) parts.push(i.groupOptions.map((o) => o.name).join(", "));
      if (i.addons?.length) parts.push(i.addons.map((a) => a.name).join(", "));
      const detail = parts.length ? ` (${parts.join(" · ")})` : "";
      lines.push(`• ${i.qty}x ${i.product.name}${detail} — ${brl(unit * i.qty)}`);
      if (i.note) lines.push(`  obs: ${i.note}`);
    }
    if (mode === "entrega" && (street || neighborhood || cep)) {
      lines.push("");
      lines.push("*Endereço de entrega:*");
      if (street || number) lines.push(`${street}${number ? ", " + number : ""}`);
      if (neighborhood) lines.push(`Bairro: ${neighborhood}`);
      if (complement) lines.push(`Compl.: ${complement}`);
      if (reference) lines.push(`Ref.: ${reference}`);
      if (cep) lines.push(`CEP: ${cep}`);
    }
    if (mode === "consumo_local" && table) {
      lines.push("");
      lines.push(`*Mesa/Comanda:* ${table}`);
    }
    lines.push("");
    lines.push(`Subtotal: ${brl(subtotal)}`);
    if (discount > 0) {
      lines.push(`Desconto (${appliedCoupon?.code || activeCouponCode || "Cupom"}): - ${brl(discount)}`);
    }
    if (deliveryFee > 0) lines.push(`Taxa de entrega: ${brl(deliveryFee)}`);
    lines.push(`*Total: ${brl(total)}*`);
    if (generalNote) {
      lines.push("");
      lines.push(`Observação: ${generalNote}`);
    }
    lines.push("");
    lines.push("Aguardo confirmação. Obrigado!");
    lines.push("");
    lines.push("[by Menuzin]");
    return lines.join("\n");
  };

  const phoneRaw = () => phone.replace(/\D/g, "");

  const openWhatsappPresenca = () => {
    const phone = (tenant?.whatsapp ?? "").replace(/\D/g, "");
    if (!phone) {
      toast.error("Loja sem WhatsApp cadastrado.");
      return;
    }
    // Persist the visitor profile even on the WhatsApp-only flow.
    const digits = phoneRaw();
    if (digits.length >= 10) {
      void (async () => {
        try {
          const { saveCustomerProfile } = await import("@/lib/customers.functions");
          const saved = await saveCustomerProfile({
            data: {
              phone: digits,
              name: name || null,
              cep: cep.replace(/\D/g, "") || null,
              neighborhood: neighborhood || null,
              address:
                mode === "entrega"
                  ? { cep, street, number, neighborhood, complement, reference }
                  : null,
            },
          });
          if (saved.customer) {
            writeCustomerProfile({
              id: saved.customer.id,
              phone: saved.customer.phone,
              token: saved.customer.token,
              name: saved.customer.name,
              cep: saved.customer.cep,
              neighborhood: saved.customer.neighborhood,
              address:
                mode === "entrega"
                  ? { cep, street, number, neighborhood, complement, reference }
                  : null,
            });
          }
        } catch {
          /* never block the WhatsApp handoff */
        }
      })();
    }
    const url = buildWhatsAppLink(phone.startsWith("55") ? phone : "55" + phone, buildWhatsappOrderMessage());
    window.open(url, "_blank", "noopener");
    onOpenChange(false);
  };

  // Delivery zones (per-neighborhood). Only used to populate selector in neighborhood mode.
  const { data: zonesData } = useQuery({
    queryKey: ["public-delivery-zones", effectiveSlug],
    queryFn: () =>
      effectiveSlug
        ? listPublicDeliveryZones({ data: { tenant_slug: effectiveSlug } })
        : Promise.resolve({ zones: [] as PublicDeliveryZone[] }),
    enabled: !!effectiveSlug && deliveryMode === "neighborhood",
    staleTime: 60_000,
  });
  const zones = zonesData?.zones ?? [];

  // Resolve delivery fee from server (single source of truth).
  const cepDigitsOnly = cep.replace(/\D/g, "");
  const { data: feeResolution, isFetching: feeLoading } = useQuery<DeliveryFeeResolution>({
    queryKey: ["resolve-delivery-fee", effectiveSlug, cepDigitsOnly, neighborhood, selectedZoneId, street, number, city, state],
    queryFn: () =>
      resolveDeliveryFee({
        data: { tenant_slug: effectiveSlug, cep: cepDigitsOnly, neighborhood, zone_id: selectedZoneId, street, number, city, state },
      }),
    enabled: !!effectiveSlug && mode === "entrega" && (deliveryMode !== "km" || (!!street && !!number)),
    staleTime: 30_000,
  });

  const deliveryFee = isPresencaOnly ? 0 : (mode === "entrega" ? Number(feeResolution?.fee ?? 0) : 0);
  const deliveryAvailable = isPresencaOnly ? true : (mode !== "entrega" || (feeResolution?.available ?? false));
  const deliveryMinOrder = isPresencaOnly ? 0 : Number(feeResolution?.min_order_total ?? 0);
  const discount = appliedCoupon ? Math.min(appliedCoupon.discount, subtotal) : 0;
  const total = Math.max(0, subtotal - discount) + deliveryFee;

  // Auto-valida e sincroniza o cupom ativo (vindo do storefront, URL ou storage)
  useEffect(() => {
    if (!open || !effectiveSlug) return;
    const targetCode = (activeCouponCode || couponInput || "").trim().toUpperCase();
    if (!targetCode) {
      setAppliedCoupon(null);
      setCouponHint(null);
      return;
    }

    if (!couponInput && activeCouponCode) {
      setCouponInput(activeCouponCode);
    }

    if (subtotal <= 0) {
      setAppliedCoupon(null);
      setCouponHint(null);
      return;
    }

    let cancelled = false;
    setCouponLoading(true);
    validateCoupon({
      data: { tenant_slug: effectiveSlug, code: targetCode, subtotal },
    })
      .then((res) => {
        if (cancelled) return;
        setAppliedCoupon(res);
        setCouponHint(null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setAppliedCoupon(null);
        if (err.message && err.message.toLowerCase().includes("pedido mínimo")) {
          setCouponHint(err.message);
        } else {
          setCouponHint(null);
          if (activeCouponCode && targetCode === activeCouponCode) {
            clearActiveCoupon();
            toast.error(`Cupom indisponível: ${err.message || "este cupom foi desativado ou expirou."}`);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setCouponLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, effectiveSlug, activeCouponCode, subtotal]);

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code || !effectiveSlug) return;
    setCouponLoading(true);
    setCouponHint(null);
    try {
      const res = await validateCoupon({
        data: { tenant_slug: effectiveSlug, code, subtotal },
      });
      setAppliedCoupon(res);
      setActiveCouponCode(res.code);
      toast.success(`Cupom ${res.code} aplicado!`);
    } catch (e) {
      setAppliedCoupon(null);
      const msg = (e as Error).message || "Cupom inválido";
      if (msg.toLowerCase().includes("pedido mínimo")) {
        setActiveCouponCode(code);
        setCouponHint(msg);
      } else {
        toast.error(msg);
      }
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponHint(null);
    clearActiveCoupon();
  };

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
        setCepHasNeighborhood(!!r.bairro);
        setStreet((cur) => cur || r.logradouro);
        setNeighborhood((cur) => cur || r.bairro);
        setCity((cur) => cur || r.localidade);
        setState((cur) => cur || r.uf);
      } else if (res.status === "empty") {
        setCepHasNeighborhood(false);
        setCepError("CEP não encontrado");
      } else if (res.status === "error") {
        setCepHasNeighborhood(false);
        setCepError("Falha ao buscar CEP. Preencha manualmente.");
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cep]);

  const hasFormData = Boolean(
    cep ||
    street ||
    number ||
    neighborhood ||
    complement ||
    reference ||
    table ||
    name ||
    phone ||
    email ||
    doc ||
    generalNote ||
    couponInput ||
    appliedCoupon,
  );

  const clearForm = () => {
    setCep("");
    setStreet("");
    setNumber("");
    setNeighborhood("");
    setSelectedZoneId(null);
    setComplement("");
    setReference("");
    setTable("");
    setName("");
    setPhone("");
    setEmail("");
    setDoc("");
    setGeneralNote("");
    setCouponInput("");
    setAppliedCoupon(null);
    setCouponHint(null);
    clearActiveCoupon();
    setPaymentWhen(null);
    setPaymentMethod("PIX");
    setSelectedMethod(null);
    setDbOrderId(null);
    setDbOrderNumber(null);
    ensureOrderPromise.current = null;
    clearCheckoutKey();
    setPixData(null);
    setCardData(null);
    setCepError(null);
    setCepLoading(false);
    setHistory([]);
    setStep("mode");
    // toast.success("Campos limpos");
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
    setStep("cart");
    setHistory([]);
    setDbOrderId(null);
    setDbOrderNumber(null);
    ensureOrderPromise.current = null;
    clearCheckoutKey();
    setPixData(null);
    setCardData(null);
    setSelectedMethod(null);
    setAppliedCoupon(null);
    setCouponHint(null);
    setCouponInput("");
  };

  const modeLabelMap: Record<Mode, string> = {
    entrega: "Entrega",
    retirada: "Retirada no local",
    consumo_local: "Consumo no local",
  };
  const paymentWhenLabel =
    paymentWhen === "agora"
      ? "Pagar agora"
      : paymentWhen === "na_retirada"
        ? mode === "entrega"
          ? "Pagar na entrega"
          : mode === "consumo_local"
            ? "Pagar no local"
            : "Pagar na retirada"
        : "";

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

  const hasOnlinePayment = !!settings?.mp_connected && !!(settings?.pix_enabled || settings?.credit_card_enabled || settings?.debit_card_enabled);
  const hasManualPayment = !!(settings?.cash_enabled || settings?.pix_manual_enabled || settings?.card_on_delivery_enabled);

  const schedulingEnabled = !isPresencaOnly && !!storefrontTenant?.schedulingEnabled;
  const confirmCustomer = () => {
    if (!name || !phone) return toast.error("Informe nome e telefone");
    if (selectedMethod && (storeOpen || scheduledFor)) {
      goTo("review");
      return;
    }
    if (schedulingEnabled || !storeOpen) {
      goTo("when");
      return;
    }
    proceedToPayment();
  };

  const confirmWhen = () => {
    if (!storeOpen && !scheduledFor) return toast.error("Escolha um horário para agendar");
    if (selectedMethod || isPresencaOnly) {
      goTo("review");
      return;
    }
    proceedToPayment();
  };

  const proceedToPayment = () => {
    if (isPresencaOnly) {
      setPaymentWhen(null);
      setSelectedMethod(null);
      setPaymentMethod("WhatsApp");
      goTo("review");
      return;
    }
    // Auto-skip when só há um dos modos disponíveis
    if (hasOnlinePayment && !hasManualPayment) {
      setPaymentWhen("agora");
      setSelectedMethod(null);
      goTo("payment-method");
      return;
    }
    if (!hasOnlinePayment && hasManualPayment) {
      setPaymentWhen("na_retirada");
      setSelectedMethod(null);
      goTo("payment-method");
      return;
    }
    goTo("payment-when");
  };

  const selectPaymentWhen = (w: "agora" | "na_retirada") => {
    setPaymentWhen(w);
    setSelectedMethod(null);
    goTo("payment-method");
  };

  // Persist a draft order if not already created (used before online MP call).
  // Returns the order id AND number to avoid React setState race conditions.
  const ensureOrder = async (methodLabel: string): Promise<{ id: string; number: number } | null> => {
    if (isPresencaOnly) {
      openWhatsappPresenca();
      return null;
    }
    if (dbOrderId && dbOrderNumber != null) return { id: dbOrderId, number: dbOrderNumber };

    if (ensureOrderPromise.current) {
      return ensureOrderPromise.current;
    }

    ensureOrderPromise.current = (async () => {
      try {
        const targetCouponCode =
          (appliedCoupon?.code || activeCouponCode || couponInput || "").trim().toUpperCase() || null;

        const { createOrder } = await import("@/lib/orders.functions");
        const res = await createOrder({
          data: {
            tenant_slug: effectiveSlug,
            customer_name: name,
            whatsapp: phone.replace(/\D/g, ""),
            mode: mode!,
            payment_label: `${paymentWhenLabel} · ${methodLabel}`,
            change_for: selectedMethod === "cash" && !cashChange.noChange ? cashChange.paid : null,
            no_change: selectedMethod === "cash" ? cashChange.noChange : false,
            delivery_fee: deliveryFee,
            delivery_fee_full: mode === "entrega" && !isPresencaOnly ? (feeResolution?.fee_full ?? deliveryFee) : null,
            delivery_fee_source: mode === "entrega" ? (feeResolution?.source ?? null) : null,
            delivery_neighborhood_snapshot:
              mode === "entrega" ? (feeResolution?.neighborhood ?? neighborhood ?? null) : null,
            address:
              mode === "entrega" ? { cep, street, number, neighborhood, complement, reference, city, state } : null,
            table_label: mode === "consumo_local" ? table : null,
            note: generalNote || null,
            coupon_code: targetCouponCode,
            scheduled_for: scheduledFor,
            idempotency_key: getCheckoutKey(),

            items: items.map((i) => {
              const sizeLabel = i.size ? [{ name: `Tamanho: ${i.size.name}`, price: 0 }] : [];
              const flavorLabels = (i.flavors ?? []).map((f) => ({
                name: `Sabor: ${f.name}`,
                price: 0,
              }));
              const groupLabels = (i.groupOptions ?? []).map((o) => ({
                name: `${o.groupName}: ${o.name}`,
                price: Number(o.price),
              }));
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
        if (res.customer) {
          writeCustomerProfile({
            id: res.customer.id,
            phone: res.customer.phone,
            token: res.customer.token,
            name,
            cep: cep.replace(/\D/g, "") || null,
            neighborhood: neighborhood || null,
            address:
              mode === "entrega"
                ? { cep, street, number, neighborhood, complement, reference, city, state }
                : null,
          });
        }
        if (!res.order) {
          openWhatsappPresenca();
          return null;
        }
        if (res.order.coupon_code && !appliedCoupon) {
          setAppliedCoupon({
            code: res.order.coupon_code,
            discount: Number(res.order.discount_amount ?? 0),
            discount_type: "fixed",
            discount_value: Number(res.order.discount_amount ?? 0),
          });
        }
        setDbOrderId(res.order.id);
        setDbOrderNumber(res.order.number);
        return { id: res.order.id, number: res.order.number };
      } catch (err) {
        ensureOrderPromise.current = null;
        throw err;
      }
    })();

    return ensureOrderPromise.current;
  };

  const pendingPixRef = useRef(false);
  useEffect(() => { if (open) loadMpSecurityScript(); }, [open]);
  useEffect(() => {
    if (pendingPixRef.current && isValidCpf(doc)) {
      pendingPixRef.current = false;
      void handleSelectMethod("pix_online");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

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
      if (!cpfConfirmedRef.current || !isValidCpf(doc)) {
        setCpfDraft(doc);
        setCpfPromptOpen(true);
        return;
      }
      cpfConfirmedRef.current = false;
      setPixRefused(null);
      const toastId = toast.loading("Gerando transação Pix segura...");
      try {
        const persisted = await ensureOrder(methodLabels[m]);
        if (!persisted) {
          toast.dismiss(toastId);
          return;
        }
        const { id: orderId } = persisted;
        const res = await createPixPayment({
          store_slug: effectiveSlug,
          order_id: orderId,
          payment_method: "pix_online",
          payer: {
            email: email || "",
            phone,
            first_name: name.split(" ")[0] || "Cliente",
            last_name: name.split(" ").slice(1).join(" ") || "Menuzin",
            identification: { type: "CPF", number: doc.replace(/\D/g, "") },
          },
          device_id: getMpDeviceId(),
        });
        toast.dismiss(toastId);
        if (!res.data?.qr_code) {
          setPixRefused("Não foi possível gerar o QR Code do Pix.");
          return;
        }
        setPixData(res.data);
        goTo("payment-online-pix");
      } catch (err) {
        toast.dismiss(toastId);
        const raw = err instanceof Error ? err.message : "";
        const msg = !raw || raw.trim().startsWith("[") ? "Erro ao gerar pagamento Pix." : raw;
        setPixRefused(msg);
      }
    } else if (m === "credit_card" || m === "debit_card") {
      // Ensure order exists so CardCheckout has a real order_id to bind
      try {
        const persisted = await ensureOrder(methodLabels[m]);
        if (!persisted) return;
        goTo("payment-online-card");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha ao iniciar pagamento.";
        toast.error(msg);
      }
    } else if (m === "pix_manual") {
      goTo("payment-pix");
    } else if (m === "cash") {
      goTo("payment-cash");
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
    const persisted = await ensureOrder(paymentMethod);
    if (!persisted) throw new Error("Pagamento online indisponível para este plano.");
    const { id: orderId } = persisted;
    const res = await createCardPayment({
      store_slug: effectiveSlug,
      order_id: orderId,
      payment_method: selectedMethod === "debit_card" ? "debit_card" : "credit_card",
      card_token: cardInfo.cardToken,
      installments: cardInfo.installments,
      payer: {
        email: email || "",
        phone,
        first_name: cardInfo.cardholderName.split(" ")[0] || "Titular",
        last_name: cardInfo.cardholderName.split(" ").slice(1).join(" ") || "Card",
        identification: { type: "CPF", number: (doc || "11111111111").replace(/\D/g, "") },
      },
    });
    setCardData(res.data);
    return res.data;
  };

  const finalize = async () => {
    if (submittingRef.current) return;
    if (isPresencaOnly) {
      openWhatsappPresenca();
      return;
    }
    submittingRef.current = true;
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
      } else if (
        selectedMethod === "cash" ||
        selectedMethod === "card_on_delivery" ||
        selectedMethod === "pix_manual"
      ) {
        finalPaymentStatus = "manual";
      }

      // Ensure order persisted (for offline methods that skipped the online flow).
      // Use the returned values directly — dbOrderNumber state is not yet updated.
      let orderId: string;
      let orderNumber: number;
      try {
        const persisted = await ensureOrder(paymentMethod);
        if (!persisted) return;
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
            ...(i.flavors ?? []).map((f) => ({ id: f.id, name: `Sabor: ${f.name}`, price: 0 })),
            ...(i.groupOptions ?? []).map((o) => ({
              id: o.id,
              name: `${o.groupName}: ${o.name}`,
              price: Number(o.price),
            })),
            ...i.addons,
          ],
          note: i.note,
        })),
        subtotal,
        deliveryFee,
        discountAmount: discount,
        couponCode: appliedCoupon?.code ?? activeCouponCode ?? null,
        total,
        address:
          mode === "entrega"
            ? { cep, street, number, neighborhood, complement, reference }
            : undefined,
        table: mode === "consumo_local" ? table : undefined,
        note: generalNote,
      };
      try {
        sessionStorage.setItem(`order:${order.number}`, JSON.stringify(order));
      } catch {
        /* ignore */
      }
      try {
        const { saveLastOrderForSlug } = await import("@/components/storefront/MobileBottomNav");
        if (effectiveSlug)
          saveLastOrderForSlug(effectiveSlug, orderId, order.number);
      } catch {
        /* ignore */
      }
      // toast.success(`Pedido #${order.number} criado`);
      clear();
      clearActiveCoupon();
      onOpenChange(false);
      resetAll();
      navigate({
        to: "/$slug/pedido-confirmado",
        params: { slug: effectiveSlug },
        search: { n: order.number } as never,
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // ----- UI building blocks -----
  const Header = ({ title, right }: { title: string; right?: ReactNode }) => (
    <div className="flex items-center justify-between gap-3 border-b bg-card px-4 py-3.5 pr-12">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 shrink-0 text-foreground/80 hover:text-foreground"
          onClick={() => (history.length ? goBack() : onOpenChange(false))}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="truncate text-base sm:text-lg font-bold tracking-tight text-foreground">{title}</h2>
      </div>
      {right && <div className="flex shrink-0 items-center gap-1.5">{right}</div>}
    </div>
  );

  const StickySubtotal = ({
    cta,
    onCta,
    disabled,
    loading,
    compact,
  }: {
    cta?: string;
    onCta?: () => void;
    disabled?: boolean;
    loading?: boolean;
    compact?: boolean;
  }) => (
    <div className="border-t bg-card/95 backdrop-blur-md px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
      {compact ? (
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Total a pagar
            </p>
            <p className="text-2xl font-extrabold text-primary tabular-nums tracking-tight">
              {brl(total)}
            </p>
          </div>
          {cta && (
            <Button
              onClick={onCta}
              disabled={disabled || loading}
              className="h-12 flex-1 max-w-[210px] rounded-xl text-base font-bold shadow-md shadow-primary/25 transition-all hover:shadow-lg hover:shadow-primary/35 active:scale-[0.98]"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : cta}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-sm text-foreground/80">
              <span>Subtotal</span>
              <span className="font-medium tabular-nums">{brl(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex items-center justify-between gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <span>Desconto</span>
                <span className="tabular-nums">− {brl(discount)}</span>
              </div>
            )}
            {deliveryFee > 0 && (
              <div className="flex items-center justify-between gap-2 text-sm text-foreground/80">
                <span>Taxa de entrega</span>
                <span className="font-medium tabular-nums">{brl(deliveryFee)}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-2 border-t border-border/60 pt-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Total
              </p>
              <p className="text-2xl font-extrabold leading-none text-primary tabular-nums">
                {brl(total)}
              </p>
            </div>
          </div>
          {cta && (
            <Button
              onClick={onCta}
              disabled={disabled || loading}
              className="h-12 shrink-0 min-w-[120px] sm:min-w-[140px] rounded-xl text-sm sm:text-base font-semibold shadow-md shadow-primary/20"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : cta}
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const OptionRow = ({
    icon,
    title,
    subtitle,
    onClick,
    active,
    muted,
  }: {
    icon: ReactNode;
    title: string;
    subtitle?: string;
    onClick: () => void;
    active?: boolean;
    muted?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left transition hover:border-primary/40 ${active ? "border-primary/60" : ""
        }`}
    >
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${active
            ? "bg-primary/15 text-primary"
            : muted
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary"
          }`}
      >
        {icon}
      </span>
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
      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors"
      type="button"
    >
      <Eraser className="h-3.5 w-3.5" /> Limpar
    </button>
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetAll();
      }}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 bg-card p-0 sm:max-w-md">
        {/* CART */}
        {step === "cart" && (
          <>
            <Header
              title="Carrinho"
              right={
                items.length > 0 && (
                  <button
                    onClick={() => {
                      clear();
                      // toast.success("Carrinho esvaziado");
                    }}
                    className="text-sm font-semibold text-primary"
                  >
                    Limpar
                  </button>
                )
              }
            />
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center text-muted-foreground">
                  <ShoppingBag className="h-12 w-12" />
                  <p className="mt-3">Seu carrinho está vazio</p>
                </div>
              ) : (
                <div className="bg-card">
                  <UpsellSuggestions onViewAll={() => onOpenChange(false)} />
                  <div className="divide-y">
                    {items.map((i) => {
                      const unit = computeUnitPrice(i);
                      const detailParts: string[] = [];
                      if (i.size) detailParts.push(i.size.name);
                      if (i.flavors && i.flavors.length)
                        detailParts.push(i.flavors.map((f) => f.name).join(" + "));
                      if (i.groupOptions && i.groupOptions.length)
                        detailParts.push(i.groupOptions.map((o) => o.name).join(", "));
                      if (i.addons.length) detailParts.push(i.addons.map((a) => a.name).join(", "));
                      const isFreeGift = i.note === "🎁 Brinde";
                      return (
                        <div key={i.uid} className="px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold leading-tight">
                                {i.product.name}
                                {isFreeGift && (
                                  <span className="ml-2 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase text-success">
                                    Brinde
                                  </span>
                                )}
                              </p>
                              {detailParts.length > 0 && (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {detailParts.join(" · ")}
                                </p>
                              )}
                              <p className="mt-2 font-bold">
                                {isFreeGift ? "Grátis" : brl(unit * i.qty)}
                              </p>
                            </div>
                            {!isFreeGift && (
                              <button
                                className="text-sm font-semibold text-primary"
                                onClick={() => onOpenChange(false)}
                              >
                                Alterar
                              </button>
                            )}
                          </div>
                          {!isFreeGift && (
                            <div className="mt-3 flex justify-end">
                              <div className="flex items-center gap-2 rounded-lg bg-muted px-2 py-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-primary"
                                  onClick={() =>
                                    i.qty === 1 ? remove(i.uid) : update(i.uid, i.qty - 1)
                                  }
                                >
                                  {i.qty === 1 ? (
                                    <Trash2 className="h-4 w-4" />
                                  ) : (
                                    <Minus className="h-4 w-4" />
                                  )}
                                </Button>
                                <span className="w-6 text-center text-sm font-semibold">
                                  {i.qty}
                                </span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-primary"
                                  onClick={() => update(i.uid, i.qty + 1)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="px-4 py-6 text-center">
                      <button
                        onClick={() => onOpenChange(false)}
                        className="text-sm font-bold text-primary"
                      >
                        Adicionar mais itens
                      </button>
                    </div>

                    {/* Cupom de desconto */}
                    <div className="mx-4 mb-4 rounded-2xl border bg-card p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 font-semibold text-sm">
                          <Ticket className="h-4 w-4 text-primary" /> Cupom de desconto
                        </div>
                        {activeCouponCode && !appliedCoupon && (
                          <span className="text-[11px] font-mono text-primary font-bold">
                            {activeCouponCode}
                          </span>
                        )}
                      </div>
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between rounded-xl border border-success/40 bg-success/10 px-3.5 py-2.5">
                          <div className="text-sm">
                            <div className="flex items-center gap-2">
                              <p className="font-mono font-bold text-success">{appliedCoupon.code}</p>
                              <span className="rounded-md bg-success/20 px-1.5 py-0.5 text-[10px] font-bold text-success uppercase">
                                Aplicado
                              </span>
                            </div>
                            <p className="text-xs text-success font-medium mt-0.5">
                              Desconto de {brl(discount)} aplicado
                            </p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-success hover:bg-success/20"
                            onClick={removeCoupon}
                            title="Remover cupom"
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              value={couponInput}
                              onChange={(e) => {
                                setCouponInput(e.target.value.toUpperCase());
                                setCouponHint(null);
                              }}
                              placeholder="Digite o código"
                              className="h-10 uppercase font-mono"
                              maxLength={40}
                            />
                            <Button
                              onClick={applyCoupon}
                              disabled={couponLoading || !couponInput}
                              className="h-10 px-4"
                            >
                              {couponLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Aplicar"
                              )}
                            </Button>
                          </div>
                          {couponHint && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 leading-relaxed">
                              💡 {couponHint}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {items.length > 0 && (
              isPresencaOnly ? (
                <>
                  <div className="border-t bg-amber-50 px-4 py-2 text-xs text-amber-900">
                    Esta loja finaliza pedidos pelo WhatsApp. Continue para montar a mensagem completa.
                  </div>
                  <StickySubtotal cta="Continuar" onCta={() => goTo("mode")} />
                </>
              ) : (
                <StickySubtotal cta="Continuar" onCta={() => goTo("mode")} />
              )
            )}
          </>
        )}

        {/* MODE */}
        {step === "mode" && (
          <>
            <Header title="Opções de entrega" />
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {acceptsDelivery && (
                <OptionRow
                  icon={<Truck className="h-5 w-5" />}
                  title="Entrega"
                  subtitle="Receba em seu endereço"
                  onClick={() => selectMode("entrega")}
                  active={mode === "entrega"}
                />
              )}
              {acceptsTakeout && (
                <OptionRow
                  icon={<StoreIcon className="h-5 w-5" />}
                  title="Retirada"
                  subtitle="Retire no estabelecimento"
                  onClick={() => selectMode("retirada")}
                  active={mode === "retirada"}
                />
              )}
              {acceptsDinein && (
                <OptionRow
                  icon={<Utensils className="h-5 w-5" />}
                  title="Consumo no local"
                  subtitle="Consuma no estabelecimento"
                  onClick={() => selectMode("consumo_local")}
                  active={mode === "consumo_local"}
                />
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
                <div className="col-span-2">
                  <Label>Rua *</Label>
                  <Input
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="mt-1.5 h-11"
                  />
                </div>
                <div>
                  <Label>Número *</Label>
                  <Input
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="mt-1.5 h-11"
                  />
                </div>
                <div>
                  <Label>Bairro *</Label>
                  {deliveryMode === "neighborhood" && zones.length > 0 ? (
                    <Select
                      value={selectedZoneId ?? zones.find((x) => x.neighborhood === neighborhood)?.id ?? ""}
                      onValueChange={(val) => {
                        const matched = zones.find((x) => x.id === val);
                        if (matched) {
                          setSelectedZoneId(matched.id);
                          setNeighborhood(matched.neighborhood);
                          if (matched.cep_start && !cep) {
                            const d = matched.cep_start.replace(/\D/g, "");
                            const masked = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
                            setCep(masked);
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1.5 h-11">
                        <SelectValue placeholder="Selecione o bairro" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const nameCounts: Record<string, number> = {};
                          for (const z of zones) {
                            nameCounts[z.neighborhood] = (nameCounts[z.neighborhood] || 0) + 1;
                          }
                          const formatCep = (s?: string | null) => (s && s.length > 5 ? `${s.slice(0, 5)}-${s.slice(5)}` : s || "");
                          return zones.map((z) => {
                            const isDuplicate = (nameCounts[z.neighborhood] ?? 0) > 1;
                            const rangeLabel = isDuplicate || z.cep_start
                              ? z.cep_start && z.cep_end
                                ? z.cep_start === z.cep_end
                                  ? ` (CEP ${formatCep(z.cep_start)})`
                                  : ` (CEP ${formatCep(z.cep_start)} a ${formatCep(z.cep_end)})`
                                : ""
                              : "";
                            return (
                              <SelectItem key={z.id} value={z.id}>
                                {z.neighborhood}{rangeLabel} — {brl(z.fee)}
                              </SelectItem>
                            );
                          });
                        })()}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      readOnly={cepHasNeighborhood}
                      className={`mt-1.5 h-11 ${cepHasNeighborhood ? "cursor-not-allowed bg-muted/40" : ""}`}
                    />
                  )}
                </div>
                <p className="col-span-2 -mt-1 text-[11px] text-muted-foreground">
                  Preenchemos rua e bairro pelo CEP. Se o nome da rua vier incompleto, você pode corrigir.
                </p>
                <div className="col-span-2">
                  <Label>Complemento</Label>
                  <Input
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    className="mt-1.5 h-11"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Ponto de referência</Label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="mt-1.5 h-11"
                  />
                </div>
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
                      <span>
                        Taxa de entrega
                        {feeResolution.neighborhood ? ` (${feeResolution.neighborhood})` : ""}
                      </span>
                      <span className="font-semibold">{brl(feeResolution.fee)}</span>
                    </div>
                    {(feeResolution.store_share ?? 0) > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Taxa de {brl(feeResolution.fee_full ?? 0)} — a loja paga {brl(feeResolution.store_share ?? 0)}, você paga {brl(feeResolution.fee)}
                      </p>
                    )}
                    {deliveryMinOrder > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Pedido mínimo: {brl(deliveryMinOrder)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-destructive text-xs">
                    {feeResolution?.message ||
                      "Informe o CEP ou bairro para calcular a taxa de entrega."}
                  </p>
                )}
              </div>
            </div>
            <StickySubtotal
              cta="Confirmar endereço"
              onCta={confirmAddress}
              disabled={!deliveryAvailable}
            />
          </>
        )}

        {/* MODE - TABLE */}
        {step === "mode-table" && (
          <>
            <Header title="Mesa / Comanda" right={<ClearBtn />} />
            <div className="flex-1 overflow-y-auto p-4">
              <Label>Mesa ou número da comanda *</Label>
              <Input
                value={table}
                onChange={(e) => setTable(e.target.value)}
                placeholder="Ex: Mesa 7"
                className="mt-1.5 h-11"
              />
            </div>
            <StickySubtotal cta="Confirmar" onCta={confirmTable} />
          </>
        )}

        {/* PAYMENT - WHEN */}
        {step === "payment-when" && (
          <>
            <Header title="Opções de pagamento" />
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {hasOnlinePayment && (
                <OptionRow
                  icon={<Smartphone className="h-5 w-5" />}
                  title="Pagar agora"
                  subtitle="Pague agora pelo aplicativo"
                  onClick={() => selectPaymentWhen("agora")}
                />
              )}
              {hasManualPayment && (
                <OptionRow
                  icon={<DollarSign className="h-5 w-5" />}
                  title={mode === "entrega" ? "Pagar na entrega" : "Pagar na retirada"}
                  subtitle={
                    mode === "entrega"
                      ? "Pague no momento da entrega"
                      : "Pague no momento da retirada"
                  }
                  onClick={() => selectPaymentWhen("na_retirada")}
                />
              )}
              {!hasOnlinePayment && !hasManualPayment && (
                <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground bg-muted/10 space-y-1">
                  <p className="font-semibold text-sm">Nenhuma forma de pagamento disponível</p>
                  <p className="text-xs">Consulte o estabelecimento para acertar a forma de pagamento.</p>
                </div>
              )}
            </div>
            <StickySubtotal />
          </>
        )}

        {/* PAYMENT - METHOD */}
        {step === "payment-method" && (
          <>
            <Header title="Método de pagamento" />
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {pixRefused && (
                <div className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
                  <p className="text-sm font-semibold text-destructive">Pix recusado pelo Mercado Pago</p>
                  <p className="text-xs text-muted-foreground">{pixRefused}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => { setPixRefused(null); void handleSelectMethod("pix_online"); }}>
                      Tentar novamente
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setPixRefused(null); setSelectedMethod(null); }}>
                      Escolher outra forma de pagamento
                    </Button>
                  </div>
                </div>
              )}
              <PaymentMethodSelector
                settings={settings}
                paymentWhen={paymentWhen || "na_retirada"}
                selectedMethod={selectedMethod}
                onSelectMethod={(m) => {
                  if (methodBusyRef.current) return;
                  methodBusyRef.current = true;
                  void handleSelectMethod(m).finally(() => {
                    methodBusyRef.current = false;
                  });
                }}
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
                storeSlug={effectiveSlug}
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
              {(() => {
                const keyTypeLabel: Record<string, string> = {
                  cpf: "CPF",
                  cnpj: "CNPJ",
                  email: "E-mail",
                  phone: "Telefone",
                  random: "Aleatória",
                };
                const pixKey = settings?.pix_manual_key?.trim();
                const receiver = settings?.pix_manual_receiver?.trim();
                const kt = settings?.pix_manual_key_type;
                const ktLabel = kt ? keyTypeLabel[kt] ?? kt : null;
                if (!pixKey) {
                  return (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
                      Esta loja ainda não configurou a chave PIX. Escolha outra forma de pagamento.
                    </div>
                  );
                }
                return (
                  <div className="rounded-2xl border bg-card p-5">
                    <p className="text-sm text-muted-foreground">
                      Chave PIX{ktLabel ? ` (${ktLabel})` : ""}
                    </p>
                    <p className="mt-1 break-all font-mono text-primary">{pixKey}</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 h-9"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(pixKey);
                          // toast.success("Chave PIX copiada");
                        } catch {
                          toast.error("Não foi possível copiar");
                        }
                      }}
                    >
                      Copiar chave
                    </Button>
                    {receiver && (
                      <p className="mt-3 text-xs text-muted-foreground">Recebedor: {receiver}</p>
                    )}
                    <p className="mt-3 text-xs">
                      Envie o comprovante pelo WhatsApp após finalizar o pedido.
                    </p>
                  </div>
                );
              })()}
            </div>
            <StickySubtotal cta="Continuar" onCta={() => goTo("review")} />
          </>
        )}


        {/* PAYMENT - CASH */}
        {step === "payment-cash" && (
          <>
            <Header title="Pagamento em dinheiro" />
            <div className="flex-1 overflow-y-auto p-4">
              <CashChangePicker
                total={total}
                value={cashChange}
                onChange={setCashChange}
                rules={{ accepts100: settings?.cash_accepts_100 ?? true, accepts200: settings?.cash_accepts_200 ?? true }}
              />
            </div>
            <StickySubtotal
              cta="Continuar"
              disabled={!!cashChangeError(total, cashChange, { accepts100: settings?.cash_accepts_100 ?? true, accepts200: settings?.cash_accepts_200 ?? true })}
              onCta={() => goTo("review")}
            />
          </>
        )}

        {/* CUSTOMER */}
        {step === "customer" && (
          <>
            <Header title="Insira seus dados" right={<ClearBtn />} />
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {usingSavedProfile && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">
                    Usando seus dados salvos neste dispositivo.
                  </span>
                  <button
                    type="button"
                    onClick={forgetSavedProfile}
                    className="shrink-0 font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Não sou eu
                  </button>
                </div>
              )}
              <div>
                <Label>
                  Nome <span className="text-primary">*</span>
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Insira seu nome"
                  className="mt-1.5 h-11"
                />
              </div>
              <div>
                <Label>
                  Telefone <span className="text-primary">*</span>
                </Label>
                <div className="mt-1.5 flex gap-2">
                  <div className="flex h-11 items-center gap-1 rounded-md border bg-card px-3 text-sm">
                    🇧🇷 +55
                  </div>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(maskPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    inputMode="tel"
                    maxLength={15}
                    className="h-11 flex-1"
                  />
                </div>
              </div>
              <div>
                <Label>Observação geral</Label>
                <Textarea
                  value={generalNote}
                  onChange={(e) => setGeneralNote(e.target.value)}
                  placeholder="Alguma observação para o pedido?"
                  className="mt-1.5"
                />
              </div>
              <Button className="h-12 w-full text-base font-semibold" onClick={confirmCustomer}>
                Confirmar
              </Button>
            </div>
          </>
        )}

        {/* WHEN (agora / agendar) */}
        {step === "when" && mode && (
          <>
            <Header title={mode === "entrega" ? "Entregar meu pedido" : mode === "retirada" ? "Retirar meu pedido" : "Consumir no local"} />
            <ScheduleStep
              mode={mode}
              storeName={tenant?.name ?? ""}
              addressLines={
                mode === "entrega"
                  ? [`${street}${number ? ", " + number : ""}`, neighborhood, [city, state].filter(Boolean).join(", ") + (cep ? ` - ${cep}` : "")]
                  : [
                    `${tenantAddress}${storefrontTenant?.addressNumber ? ", " + storefrontTenant.addressNumber : ""}`,
                    storefrontTenant?.neighborhood ?? "",
                    [storefrontTenant?.city, storefrontTenant?.state].filter(Boolean).join(", ") + (storefrontTenant?.cep ? ` - ${storefrontTenant.cep}` : ""),
                  ]
              }
              storeOpen={storeOpen}
              nowLabel={(mode === "entrega" ? storefrontTenant?.deliveryTime : storefrontTenant?.takeoutTime) ?? storefrontTenant?.prepTime ?? null}
              hoursSchedule={storefrontTenant?.hoursSchedule ?? []}
              slotMinutes={storefrontTenant?.schedulingSlotMinutes ?? 10}
              daysAhead={storefrontTenant?.schedulingDaysAhead ?? 7}
              leadMinutes={(mode === "entrega" ? storefrontTenant?.deliveryTimeMin : storefrontTenant?.takeoutTimeMin) ?? 30}
              value={scheduledFor}
              onChange={setScheduledFor}
              onChangeMode={() => goTo("mode")}
              onContinue={confirmWhen}
            />
          </>
        )}

        {/* REVIEW */}
        {step === "review" && (
          <>
            <Header
              title="Revisar pedido"
              right={
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-destructive gap-1"
                    onClick={requestClearForm}
                    title="Limpar formulário"
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    <span>Limpar</span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Voltar ao início"
                    onClick={() => {
                      onOpenChange(false);
                      resetAll();
                    }}
                  >
                    <Home className="h-4 w-4" />
                  </Button>
                </div>
              }
            />
            <div className="flex-1 space-y-3.5 overflow-y-auto bg-muted/20 dark:bg-zinc-950/40 p-4 pb-8">
              <UpsellSuggestions onViewAll={() => onOpenChange(false)} />

              {/* Items */}
              <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">Itens do pedido</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {items.reduce((s, i) => s + i.qty, 0)} {items.reduce((s, i) => s + i.qty, 0) === 1 ? "item" : "itens"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setStep("cart")}
                    className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors py-1 px-2.5 rounded-lg hover:bg-primary/5 active:scale-95"
                  >
                    Alterar itens
                  </button>
                </div>

                <div className="mt-3 divide-y divide-border/40">
                  {items.map((i) => {
                    const unit = computeUnitPrice(i);
                    const detailParts: string[] = [];
                    if (i.size) detailParts.push(i.size.name);
                    if (i.flavors && i.flavors.length)
                      detailParts.push(i.flavors.map((f) => f.name).join(" + "));
                    if (i.groupOptions && i.groupOptions.length)
                      detailParts.push(i.groupOptions.map((o) => o.name).join(", "));
                    if (i.addons.length) detailParts.push(i.addons.map((a) => a.name).join(", "));
                    const isFreeGift = i.note === "🎁 Brinde";

                    return (
                      <div key={i.uid} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded bg-primary/10 px-1 text-xs font-bold text-primary">
                              {i.qty}x
                            </span>
                            <span className="font-semibold text-foreground leading-tight">
                              {i.product.name}
                            </span>
                            {isFreeGift && (
                              <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                                Brinde
                              </span>
                            )}
                          </div>
                          {detailParts.length > 0 && (
                            <p className="mt-0.5 text-xs text-muted-foreground pl-6">
                              {detailParts.join(" · ")}
                            </p>
                          )}
                          {i.note && !isFreeGift && (
                            <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400 pl-6 italic">
                              Obs: {i.note}
                            </p>
                          )}
                        </div>
                        <span className="font-bold text-foreground tabular-nums whitespace-nowrap">
                          {isFreeGift ? "Grátis" : brl(unit * i.qty)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mode & Address */}
              <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                      {mode === "entrega" ? (
                        <Truck className="h-4 w-4" />
                      ) : mode === "retirada" ? (
                        <StoreIcon className="h-4 w-4" />
                      ) : (
                        <Utensils className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-foreground">
                        {mode === "entrega" ? "Entrega" : mode === "retirada" ? "Retirada" : "Consumo no local"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setStep("mode")}
                    className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors py-1 px-2.5 rounded-lg hover:bg-primary/5 active:scale-95"
                  >
                    Alterar
                  </button>
                </div>

                {scheduledFor && (
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-3 py-2 text-xs font-semibold text-primary">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span>Agendado: {formatScheduledLong(scheduledFor, storefrontTenant?.schedulingSlotMinutes ?? 10)}</span>
                    </div>
                    <button
                      onClick={() => setStep("when")}
                      className="text-[11px] underline underline-offset-2 hover:opacity-80"
                    >
                      Alterar
                    </button>
                  </div>
                )}

                {mode === "entrega" && (
                  <div className="mt-3 text-sm space-y-1.5">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground leading-snug">
                          {street}, {number}
                          {complement ? ` · ${complement}` : ""}
                        </p>
                        {neighborhood && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Bairro: <span className="font-medium text-foreground">{neighborhood}</span>
                            {cep ? ` · CEP ${cep}` : ""}
                          </p>
                        )}
                        {reference && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Ponto de ref.: <span className="italic text-foreground/80">{reference}</span>
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          {deliveryFee > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                              Taxa de entrega: <strong className="text-primary">{brl(deliveryFee)}</strong>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              Taxa de entrega: Grátis
                            </span>
                          )}
                          {deliveryMinOrder > 0 && (
                            <span className="text-[11px] text-muted-foreground">
                              (Mínimo: {brl(deliveryMinOrder)})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {mode === "retirada" && (
                  <div className="mt-3 text-sm space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                      <div>
                        <p className="font-semibold text-foreground">{tenantAddress || "Endereço do estabelecimento"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Retirada direta no balcão</p>
                      </div>
                    </div>
                    {tenantAddress && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenantAddress)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline pt-1"
                      >
                        <Map className="h-3.5 w-3.5" /> Ver rota no Google Maps
                      </a>
                    )}
                  </div>
                )}

                {mode === "consumo_local" && (
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Mesa ou Comanda:</span>
                    <span className="font-bold text-foreground text-base bg-muted px-2.5 py-0.5 rounded-lg">{table}</span>
                  </div>
                )}
              </div>

              {/* Customer */}
              <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-bold text-foreground">Identificação do cliente</span>
                  </div>
                  <button
                    onClick={() => setStep("customer")}
                    className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors py-1 px-2.5 rounded-lg hover:bg-primary/5 active:scale-95"
                  >
                    Alterar
                  </button>
                </div>

                <div className="mt-3 text-sm space-y-1.5">
                  <p className="font-semibold text-foreground">{name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                      <Phone className="h-3.5 w-3.5 text-primary" /> +55 {phone}
                    </span>
                    {email && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        · <Mail className="h-3.5 w-3.5" /> {email}
                      </span>
                    )}
                  </div>

                  {generalNote ? (
                    <div className="mt-2.5 rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-xs">
                      <p className="flex items-center gap-1.5 font-semibold text-primary">
                        <FileText className="h-3.5 w-3.5" /> Observação para o pedido:
                      </p>
                      <p className="mt-1 text-foreground/90 whitespace-pre-wrap">{generalNote}</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStep("customer")}
                      className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar observação ao pedido
                    </button>
                  )}
                </div>
              </div>

              {/* Payment */}
              <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                      {selectedMethod === "cash" ? (
                        <DollarSign className="h-4 w-4" />
                      ) : selectedMethod === "pix_online" || selectedMethod === "pix_manual" ? (
                        <Smartphone className="h-4 w-4" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-foreground">
                        {isPresencaOnly ? "Pagamento" : (paymentWhenLabel || "Pagamento")}
                      </span>
                    </div>
                  </div>
                  {!isPresencaOnly && (
                    <button
                      onClick={() => setStep(hasOnlinePayment && hasManualPayment ? "payment-when" : "payment-method")}
                      className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors py-1 px-2.5 rounded-lg hover:bg-primary/5 active:scale-95"
                    >
                      Alterar
                    </button>
                  )}
                </div>

                {isPresencaOnly ? (
                  <div className="mt-3 text-sm space-y-1">
                    <p className="font-semibold text-foreground">Finalização pelo WhatsApp</p>
                    <p className="text-xs text-muted-foreground">
                      Ao enviar, abriremos o WhatsApp da loja com todos os dados do pedido preenchidos.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 text-sm space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">{paymentMethod}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {paymentWhen === "agora"
                        ? "Pagamento online aprovado no aplicativo"
                        : mode === "entrega"
                          ? "Pagamento presencial no ato da entrega"
                          : mode === "consumo_local"
                            ? "Pagamento presencial na finalização da comanda"
                            : "Pagamento presencial no ato da retirada"}
                    </p>
                    {selectedMethod === "cash" && (
                      <div className="mt-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-900 dark:text-amber-300">
                        {cashChange.noChange ? (
                          <span className="font-medium">💵 Sem troco (valor exato)</span>
                        ) : cashChange.paid ? (
                          <div className="space-y-0.5">
                            <p>💵 Pagamento com: <strong>{brl(cashChange.paid)}</strong></p>
                            <p>Troco a devolver: <strong className="text-primary">{brl(changeDue(total, cashChange.paid))}</strong></p>
                          </div>
                        ) : (
                          <span className="font-medium">💵 Pagamento em dinheiro</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Resumo de valores */}
              <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
                <div className="flex items-center gap-2.5 pb-3 border-b border-border/40">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-foreground">Resumo de valores</span>
                </div>

                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-2 text-muted-foreground">
                    <span>Subtotal dos itens</span>
                    <span className="tabular-nums font-medium text-foreground">{brl(subtotal)}</span>
                  </div>
                  {discount > 0 && appliedCoupon && (
                    <div className="flex justify-between gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="min-w-0 flex-1">Desconto ({appliedCoupon.code})</span>
                      <span className="tabular-nums whitespace-nowrap">− {brl(discount)}</span>
                    </div>
                  )}
                  {deliveryFee > 0 ? (
                    <div className="flex justify-between gap-2 text-muted-foreground">
                      <span className="min-w-0 flex-1">
                        Taxa de entrega{neighborhood ? ` (${neighborhood})` : ""}
                      </span>
                      <span className="tabular-nums font-medium text-foreground">{brl(deliveryFee)}</span>
                    </div>
                  ) : mode === "entrega" ? (
                    <div className="flex justify-between gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                      <span>Taxa de entrega</span>
                      <span className="font-semibold">Grátis</span>
                    </div>
                  ) : null}
                  <div className="flex items-baseline justify-between gap-2 border-t border-border/80 pt-2.5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Total
                      </p>
                    </div>
                    <span className="text-2xl font-extrabold text-primary tabular-nums tracking-tight">
                      {brl(total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <StickySubtotal
              compact
              cta={isPresencaOnly ? "Enviar pelo WhatsApp" : "Fazer pedido"}
              onCta={finalize}
              loading={submitting}
              disabled={submitting}
            />
          </>
        )}
      </SheetContent>
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar formulário?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai apagar endereço, dados do cliente, cupom e observações. Os itens do carrinho
              serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={clearForm}>Limpar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={cpfPromptOpen} onOpenChange={setCpfPromptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Informe seu CPF</DialogTitle>
            <DialogDescription>O Mercado Pago exige o CPF do pagador para aprovar o Pix.</DialogDescription>
          </DialogHeader>
          <Input
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpfDraft}
            onChange={(e) => setCpfDraft(e.target.value.replace(/[^\d.-]/g, "").slice(0, 14))}
            autoFocus
          />
          {cpfDraft.replace(/\D/g, "").length === 11 && !isValidCpf(cpfDraft) && (
            <p className="text-xs text-destructive">CPF inválido.</p>
          )}
          <DialogFooter>
            <Button
              disabled={!isValidCpf(cpfDraft)}
              onClick={() => {
                setDoc(cpfDraft);
                setCpfPromptOpen(false);
                pendingPixRef.current = true;
              }}
            >
              Gerar Pix
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
