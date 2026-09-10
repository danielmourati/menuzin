import { ArrowRight, CheckCircle2, Megaphone, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SmartStrategySectionProps {
  className?: string;
}

export function SmartStrategySection({ className = "" }: SmartStrategySectionProps) {
  return (
    <section className={`border-y bg-muted/30 ${className}`}>
      <div className="container mx-auto px-4 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-primary">Venda com estratégia</p>
          <h2 className="mt-2 text-3xl font-bold text-balance md:text-4xl">
            A estratégia dos restaurantes mais lucrativos
          </h2>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
          <article className="border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-muted text-muted-foreground">
              <Megaphone className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-5 text-xl font-bold">1. A Vitrine (Apps Tradicionais)</h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Use para ser descoberto por novos clientes. Pague a comissão como custo de marketing.
            </p>
          </article>

          <article className="relative border-2 border-primary bg-primary/5 p-6 shadow-[var(--shadow-pop)] md:p-8">
            <span className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              Sua margem fica aqui
            </span>
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary text-primary-foreground">
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-5 pr-20 text-xl font-bold">2. O Lucro (Menuzin)</h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              O cliente gostou e quer pedir de novo? Envie seu link Menuzin. Você não paga taxas por
              pedido, apenas uma mensalidade fixa super acessível, e lucra muito mais na fidelização.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

interface PricingTableProps {
  proPrice?: number | null;
  onCTAClick: () => void;
}

const presenceFeatures = [
  "0% de comissão",
  "Até 20 produtos",
  "Link + QR Code",
  "Botão de WhatsApp",
];

const proFeatures = ["Produtos ilimitados", "Gestão completa", "Sem taxas por pedido"];

function formatPrice(price: number) {
  return price.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function PricingTable({ proPrice, onCTAClick }: PricingTableProps) {
  return (
    <section className="container mx-auto px-4 py-16 md:py-20" aria-labelledby="pricing-title">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-primary">Preços transparentes</p>
          <h2 id="pricing-title" className="mt-2 text-3xl font-bold text-balance md:text-4xl">
            Comece grátis. Evolua quando fizer sentido.
          </h2>
          <p className="mt-3 text-muted-foreground">Sem comissão por pedido e sem surpresas.</p>
        </div>

        <div className="mt-10 grid items-stretch gap-5 md:grid-cols-2">
          <article className="flex flex-col border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
            <p className="text-sm font-semibold text-muted-foreground">Plano Presença</p>
            <p className="mt-3 text-4xl font-bold">Grátis</p>
            <p className="mt-2 text-sm text-muted-foreground">Para colocar sua vitrine no ar hoje.</p>
            <ul className="mt-6 space-y-3">
              {presenceFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button variant="outline" size="lg" className="mt-8 w-full gap-2" onClick={onCTAClick}>
              Criar Meu Cardápio Grátis <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </article>

          <article className="relative flex flex-col border-2 border-primary bg-primary/5 p-6 shadow-[var(--shadow-pop)] md:p-8">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground shadow-sm">
              Melhor Custo-Benefício
            </span>
            <p className="text-sm font-semibold text-primary">Plano Pro</p>
            <div className="mt-3 flex items-end gap-1">
              {typeof proPrice === "number" && proPrice > 0 ? (
                <>
                  <p className="text-4xl font-bold">R$ {formatPrice(proPrice)}</p>
                  <span className="pb-1 text-sm text-muted-foreground">/mês</span>
                </>
              ) : (
                <p className="text-3xl font-bold">Plano mensal</p>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Para profissionalizar e escalar sua operação.</p>
            <ul className="mt-6 space-y-3">
              {proFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button size="lg" className="mt-8 w-full gap-2" onClick={onCTAClick}>
              Começar Grátis <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </article>
        </div>
      </div>
    </section>
  );
}