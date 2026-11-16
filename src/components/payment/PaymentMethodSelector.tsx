import type { ReactNode } from "react";
import { DollarSign, Smartphone, Landmark, Wallet, ChevronRight } from "lucide-react";
import type { StorePaymentSettingsSafe, PaymentMethod } from "@/lib/payment-types";

interface PaymentMethodSelectorProps {
  settings: StorePaymentSettingsSafe | null;
  paymentWhen?: "agora" | "na_retirada" | "all";
  mode?: "entrega" | "retirada" | "consumo_local";
  selectedMethod: PaymentMethod | null;
  onSelectMethod: (method: PaymentMethod) => void;
}

export function PaymentMethodSelector({
  settings,
  paymentWhen = "all",
  mode = "entrega",
  selectedMethod,
  onSelectMethod,
}: PaymentMethodSelectorProps) {
  // Configurações padrão caso o tenant não tenha definições no banco
  const config = settings || {
    mp_connected: false,
    cash_enabled: true,
    pix_manual_enabled: true,
    card_on_delivery_enabled: true,
    pix_enabled: false,
    credit_card_enabled: false,
    debit_card_enabled: false,
  };

  const isMpConnected = config.mp_connected;

  const OptionRow = ({
    method,
    icon,
    title,
    subtitle,
    active,
  }: {
    method: PaymentMethod;
    icon: ReactNode;
    title: string;
    subtitle?: string;
    active: boolean;
  }) => (
    <button
      type="button"
      onClick={() => onSelectMethod(method)}
      className={`flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left transition hover:border-primary/40 ${
        active ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border"
      }`}
    >
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition ${
          active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm sm:text-base leading-tight text-foreground">{title}</p>
        {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </button>
  );

  const onlineOptions: { method: PaymentMethod; icon: ReactNode; title: string; subtitle: string }[] = [];
  if (isMpConnected && config.pix_enabled) {
    onlineOptions.push({
      method: "pix_online",
      icon: <Landmark className="h-5 w-5" />,
      title: "Pix Online",
      subtitle: "Confirmação e liberação automática e instantânea",
    });
  }
  if (isMpConnected && config.credit_card_enabled) {
    onlineOptions.push({
      method: "credit_card",
      icon: <Smartphone className="h-5 w-5" />,
      title: "Cartão de Crédito Online",
      subtitle: "Pague agora à vista no cartão de crédito",
    });
  }
  if (isMpConnected && config.debit_card_enabled) {
    onlineOptions.push({
      method: "debit_card",
      icon: <Smartphone className="h-5 w-5" />,
      title: "Cartão de Débito Online",
      subtitle: "Pague agora usando seu saldo bancário",
    });
  }

  const whenNoun =
    mode === "entrega" ? "entrega" : mode === "consumo_local" ? "consumo no local" : "retirada";

  const manualOptions: { method: PaymentMethod; icon: ReactNode; title: string; subtitle: string }[] = [];
  if (config.cash_enabled) {
    manualOptions.push({
      method: "cash",
      icon: <DollarSign className="h-5 w-5" />,
      title: "Dinheiro",
      subtitle: `Pague com cédulas no momento da ${whenNoun}`,
    });
  }
  if (config.card_on_delivery_enabled) {
    manualOptions.push({
      method: "card_on_delivery",
      icon: <Smartphone className="h-5 w-5" />,
      title: "Cartão na maquininha",
      subtitle:
        mode === "entrega"
          ? "Crédito ou Débito direto com o entregador"
          : "Crédito ou Débito direto no balcão/atendimento",
    });
  }
  if (config.pix_manual_enabled) {
    manualOptions.push({
      method: "pix_manual",
      icon: <Wallet className="h-5 w-5" />,
      title: "Pix Manual",
      subtitle: "Transfira para a chave Pix e envie o comprovante",
    });
  }

  const manualSectionLabel =
    mode === "entrega"
      ? "Pagar na entrega"
      : mode === "consumo_local"
        ? "Pagar no local"
        : "Pagar na retirada";

  if (paymentWhen === "agora") {
    const legacyOnline = config.pix_manual_enabled
      ? [
          ...onlineOptions,
          {
            method: "pix_manual" as PaymentMethod,
            icon: <Wallet className="h-5 w-5" />,
            title: "Pix Manual",
            subtitle: "Transfira para a chave Pix e envie o comprovante",
          },
        ]
      : onlineOptions;

    if (legacyOnline.length === 0) {
      return (
        <div className="space-y-1 rounded-2xl border border-dashed bg-muted/10 p-6 text-center text-muted-foreground">
          <p className="text-sm font-semibold">Nenhum método online ativado</p>
          <p className="text-xs">Este estabelecimento não aceita pagamentos online no momento.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {legacyOnline.map((o) => (
          <OptionRow
            key={o.method}
            method={o.method}
            icon={o.icon}
            title={o.title}
            subtitle={o.subtitle}
            active={selectedMethod === o.method}
          />
        ))}
      </div>
    );
  }

  if (paymentWhen === "na_retirada") {
    if (manualOptions.length === 0) {
      return (
        <div className="space-y-1 rounded-2xl border border-dashed bg-muted/10 p-6 text-center text-muted-foreground">
          <p className="text-sm font-semibold">Nenhum método manual disponível</p>
          <p className="text-xs">Consulte o estabelecimento para acertar a forma de pagamento.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {manualOptions.map((o) => (
          <OptionRow
            key={o.method}
            method={o.method}
            icon={o.icon}
            title={o.title}
            subtitle={o.subtitle}
            active={selectedMethod === o.method}
          />
        ))}
      </div>
    );
  }

  // Modo unificado ("all")
  if (onlineOptions.length === 0 && manualOptions.length === 0) {
    return (
      <div className="space-y-1 rounded-2xl border border-dashed bg-muted/10 p-6 text-center text-muted-foreground">
        <p className="text-sm font-semibold">Nenhuma forma de pagamento disponível</p>
        <p className="text-xs">Consulte o estabelecimento para acertar a forma de pagamento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {onlineOptions.length > 0 && (
        <div className="space-y-2.5">
          <p className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Pagar online agora (aprovação imediata)
          </p>
          <div className="space-y-2.5">
            {onlineOptions.map((o) => (
              <OptionRow
                key={o.method}
                method={o.method}
                icon={o.icon}
                title={o.title}
                subtitle={o.subtitle}
                active={selectedMethod === o.method}
              />
            ))}
          </div>
        </div>
      )}

      {manualOptions.length > 0 && (
        <div className="space-y-2.5">
          <p className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {manualSectionLabel}
          </p>
          <div className="space-y-2.5">
            {manualOptions.map((o) => (
              <OptionRow
                key={o.method}
                method={o.method}
                icon={o.icon}
                title={o.title}
                subtitle={o.subtitle}
                active={selectedMethod === o.method}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
