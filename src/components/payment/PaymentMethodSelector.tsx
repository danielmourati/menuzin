import { ReactNode } from "react";
import { DollarSign, Smartphone, Landmark, Wallet, ChevronRight } from "lucide-react";
import type { StorePaymentSettingsSafe, PaymentMethod } from "@/lib/payment-types";

interface PaymentMethodSelectorProps {
  settings: StorePaymentSettingsSafe | null;
  paymentWhen: "agora" | "na_retirada";
  selectedMethod: PaymentMethod | null;
  onSelectMethod: (method: PaymentMethod) => void;
}

export function PaymentMethodSelector({
  settings,
  paymentWhen,
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
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm sm:text-base text-foreground leading-tight">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </button>
  );

  return (
    <div className="space-y-3">
      {paymentWhen === "agora" ? (
        // PAGAMENTO AGORA (ONLINE)
        <div className="space-y-3">
          {isMpConnected && config.pix_enabled && (
            <OptionRow
              method="pix_online"
              icon={<Landmark className="h-5 w-5" />}
              title="Pix Online"
              subtitle="Confirmação e liberação automática e instantânea"
              active={selectedMethod === "pix_online"}
            />
          )}

          {isMpConnected && config.credit_card_enabled && (
            <OptionRow
              method="credit_card"
              icon={<Smartphone className="h-5 w-5" />}
              title="Cartão de Crédito Online"
              subtitle="Pague agora de forma segura em até 6x"
              active={selectedMethod === "credit_card"}
            />
          )}

          {isMpConnected && config.debit_card_enabled && (
            <OptionRow
              method="debit_card"
              icon={<Smartphone className="h-5 w-5" />}
              title="Cartão de Débito Online"
              subtitle="Pague agora usando seu saldo bancário"
              active={selectedMethod === "debit_card"}
            />
          )}

          {(!isMpConnected || (!config.pix_enabled && !config.credit_card_enabled && !config.debit_card_enabled)) && (
            <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground bg-muted/10 space-y-1">
              <p className="font-semibold text-sm">Nenhum método online ativado</p>
              <p className="text-xs">Este estabelecimento não aceita pagamentos online no momento.</p>
            </div>
          )}
        </div>
      ) : (
        // PAGAMENTO NA ENTREGA/RETIRADA (MANUAIS)
        <div className="space-y-3">
          {config.cash_enabled && (
            <OptionRow
              method="cash"
              icon={<DollarSign className="h-5 w-5" />}
              title="Dinheiro"
              subtitle="Pague com cédulas físicas no momento da entrega/retirada"
              active={selectedMethod === "cash"}
            />
          )}

          {config.pix_manual_enabled && (
            <OptionRow
              method="pix_manual"
              icon={<Wallet className="h-5 w-5" />}
              title="Pix Manual"
              subtitle="Transfira para a chave Pix e envie o comprovante"
              active={selectedMethod === "pix_manual"}
            />
          )}

          {config.card_on_delivery_enabled && (
            <OptionRow
              method="card_on_delivery"
              icon={<Smartphone className="h-5 w-5" />}
              title="Cartão na maquininha"
              subtitle="Crédito ou Débito direto com o entregador/balcão"
              active={selectedMethod === "card_on_delivery"}
            />
          )}

          {!config.cash_enabled && !config.pix_manual_enabled && !config.card_on_delivery_enabled && (
            <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground bg-muted/10 space-y-1">
              <p className="font-semibold text-sm">Nenhum método manual disponível</p>
              <p className="text-xs">Consulte o estabelecimento para acertar a forma de pagamento.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
