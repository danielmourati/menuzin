import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  MessageCircleOff,
  Percent,
  Printer,
  Route,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ordersAsset from "@/assets/menuzin-orders-kanban.png.asset.json";
import deliveryFeesAsset from "@/assets/menuzin-delivery-fees.png.asset.json";
import printersAsset from "@/assets/menuzin-printers.png.asset.json";
import storefrontAsset from "@/assets/menuzin-storefront.png.asset.json";
import addressAsset from "@/assets/menuzin-address.png.asset.json";
import confirmedAsset from "@/assets/menuzin-order-confirmed.png.asset.json";
import trackingAsset from "@/assets/menuzin-order-tracking.png.asset.json";
import detailsAsset from "@/assets/menuzin-order-details.png.asset.json";
import ordersKanbanV2Asset from "@/assets/menuzin-orders-kanban-v2.png.asset.json";
import autoPrintingAsset from "@/assets/menuzin-auto-printing.png.asset.json";


type Asset = { url: string };

interface SignupAction {
  onCTAClick: () => void;
}

export function ProductHeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-2xl pb-10 pt-4 lg:pb-14">
      <div className="overflow-hidden rounded-lg border bg-card p-1.5 shadow-[var(--shadow-pop)] sm:p-2">
        <img
          src={(ordersAsset as Asset).url}
          alt="Painel Menuzin organizando pedidos novos, em preparo e prontos"
          width={1584}
          height={768}
          fetchPriority="high"
          className="h-auto w-full rounded-md"
        />
      </div>
      <div className="absolute -bottom-1 left-2 w-[31%] min-w-28 max-w-52 drop-shadow-2xl sm:-bottom-3 sm:left-8">
        <img
          src={(storefrontAsset as Asset).url}
          alt="Cardápio Menuzin no celular do cliente"
          width={430}
          height={868}
          fetchPriority="high"
          className="h-auto w-full"
        />
      </div>
      <div className="absolute bottom-2 right-2 rounded-md border bg-card/95 px-3 py-2 shadow-[var(--shadow-soft)] backdrop-blur-sm sm:bottom-4 sm:right-6">
        <p className="text-xs font-bold text-primary sm:text-sm">Operação e cliente conectados</p>
        <p className="hidden text-xs text-muted-foreground sm:block">Do novo pedido até a entrega.</p>
      </div>
    </div>
  );
}

export function AuthorityStrip() {
  return (
    <section className="border-y bg-card" aria-label="Negócios atendidos">
      <div className="container mx-auto flex items-center justify-center gap-3 px-4 py-6 text-center">
        <ShoppingBag className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <p className="font-semibold">Usado por hamburguerias, pizzarias e restaurantes que não dividem lucro.</p>
      </div>
    </section>
  );
}

const painPoints = [
  {
    icon: Percent,
    pain: "Taxas que levam sua margem",
    answer: "Zero comissão por pedido. Seu lucro continua sendo seu.",
  },
  {
    icon: ClipboardCheck,
    pain: "Pedidos perdidos nas mensagens",
    answer: "Tudo organizado por etapa, modalidade e horário em uma tela.",
  },
  {
    icon: MessageCircleOff,
    pain: "Cliente perguntando onde está",
    answer: "Acompanhamento em tempo real, sem precisar instalar aplicativo.",
  },
];

export function PainSolutionGrid() {
  return (
    <section className="bg-muted/35">
      <div className="container mx-auto px-4 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase text-primary">Pare de dividir seu lucro</p>
          <h2 className="mt-3 text-3xl font-bold text-balance md:text-4xl">Menos atrito. Mais controle em cada pedido.</h2>
        </div>
        <div className="mt-10 grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-3">
          {painPoints.map(({ icon: Icon, pain, answer }) => (
            <article key={pain} className="bg-card p-6 md:p-8">
              <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
              <h3 className="mt-5 text-lg font-bold">{pain}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

interface FeatureVisualProps {
  images: Array<{ asset: Asset; alt: string; mobile?: boolean; eager?: boolean }>;
}

function FeatureVisual({ images }: FeatureVisualProps) {
  return (
    <div className={`grid items-center gap-4 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
      {images.map(({ asset, alt, mobile, eager }, index) => (
        <div
          key={alt}
          className={`overflow-hidden border bg-card shadow-[var(--shadow-pop)] ${
            mobile ? "mx-auto max-w-64 rounded-[2rem] border-4" : "rounded-lg p-1.5"
          } ${index === 1 ? "mt-8" : "mb-8"}`}
        >
          <img
            src={asset.url}
            alt={alt}
            loading={eager ? "eager" : "lazy"}
            className={`h-auto w-full ${mobile ? "rounded-[1.6rem]" : "rounded-md"}`}
          />
        </div>
      ))}
    </div>
  );
}

const featureBlocks = [
  {
    eyebrow: "Venda sem atrito",
    title: "Um cardápio moderno e um endereço preenchido sem esforço",
    copy: "O cliente escolhe com poucos toques, informa o CEP e o Menuzin completa rua e bairro. A taxa configurada por você aparece na hora, reduzindo erros e abandono.",
    icon: Route,
    images: [
      { asset: storefrontAsset as Asset, alt: "Cardápio digital da Burguer Prime no celular", mobile: true },
      { asset: addressAsset as Asset, alt: "Endereço preenchido automaticamente pelo CEP", mobile: true },
    ],
  },
  {
    eyebrow: "Experiência premium",
    title: "O cliente acompanha tudo sem perguntar “cadê meu pedido?”",
    copy: "Confirmação clara e rastreio em tempo real no próprio navegador. Menos mensagens no WhatsApp para sua equipe e mais segurança para quem compra.",
    icon: Clock3,
    reverse: true,
    images: [
      { asset: confirmedAsset as Asset, alt: "Confirmação do pedido no celular", mobile: true },
      { asset: trackingAsset as Asset, alt: "Acompanhamento do pedido em tempo real", mobile: true },
    ],
  },
  {
    eyebrow: "Fim da confusão",
    title: "O coração da operação em uma única tela",
    copy: "Do pedido novo à entrega final, o painel organiza delivery, retirada e consumo no local. Abra os detalhes, confira pagamento e endereço e avance cada etapa com segurança.",
    icon: ClipboardCheck,
    images: [
      { asset: ordersKanbanV2Asset as Asset, alt: "Gestão visual de pedidos no painel Menuzin" },
    ],
  },
  {
    eyebrow: "Automação",
    title: "O pedido chega e a cozinha já começa a preparar",
    copy: "Ative a impressão automática para aceitar cada novo pedido e enviar o cupom direto à cozinha, sem cliques, gritos ou papelzinho levado pelo salão. Mais agilidade no preparo e menos chance de erro.",
    icon: Printer,
    reverse: true,
    images: [
      { asset: autoPrintingAsset as Asset, alt: "Menuzin imprimindo automaticamente um novo pedido na cozinha", eager: true },
    ],
  },
];

export function ProductDeepDive() {
  return (
    <section id="recursos">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase text-primary">Veja o Menuzin trabalhando</p>
          <h2 className="mt-3 text-3xl font-bold text-balance md:text-5xl">Tecnologia de ponta para quem vive a rotina do delivery</h2>
        </div>
      </div>
      {featureBlocks.map(({ eyebrow, title, copy, icon: Icon, images, reverse }, index) => (
        <article key={title} className={index % 2 ? "border-y bg-muted/35" : "bg-background"}>
          <div className="container mx-auto grid items-center gap-10 px-4 py-16 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16 lg:py-24">
            <div className={reverse ? "lg:order-2" : ""}>
              <div className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="mt-5 text-sm font-bold uppercase text-primary">{eyebrow}</p>
              <h3 className="mt-2 text-3xl font-bold leading-tight text-balance md:text-4xl">{title}</h3>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">{copy}</p>
            </div>
            <div className={reverse ? "lg:order-1" : ""}>
              <FeatureVisual images={images} />
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

interface PricingTableProps extends SignupAction {
  plans: Array<{
    id: string;
    name: string;
    price: number;
    description: string;
    features: string[];
  }>;
}

function formatPrice(price: number) {
  return price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PricingTable({ plans, onCTAClick }: PricingTableProps) {
  return (
    <section id="planos" className="bg-muted/35">
      <div className="container mx-auto px-4 py-20 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase text-primary">14 dias de acesso completo</p>
          <h2 className="mt-3 text-3xl font-bold text-balance md:text-5xl">Experimente o Pro. Decida depois.</h2>
          <p className="mt-4 text-muted-foreground">Sem cartão. Se não assinar, sua loja continua gratuitamente no plano Presença.</p>
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl items-stretch gap-6 md:grid-cols-2">
          {plans.map((plan) => {
            const isPro = plan.id === "pro";
            return (
              <article key={plan.id} className={`relative flex flex-col rounded-lg border bg-card p-7 md:p-9 ${isPro ? "border-2 border-primary shadow-[var(--shadow-pop)]" : "shadow-[var(--shadow-soft)]"}`}>
                {isPro && <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">Melhor Custo-Benefício</span>}
                <p className={`text-sm font-bold ${isPro ? "text-primary" : "text-muted-foreground"}`}>Plano {plan.name}</p>
                <p className="mt-3 text-4xl font-bold">{plan.price > 0 ? `R$ ${formatPrice(plan.price)}` : "Grátis"}{plan.price > 0 && <span className="text-base font-normal text-muted-foreground">/mês</span>}</p>
                <p className="mt-3 min-h-12 text-sm leading-relaxed text-muted-foreground">{plan.description}</p>
                {isPro && <div className="mt-5 rounded-md bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">Primeiros 14 dias liberados no cadastro</div>}
                <ul className="mt-6 space-y-3 text-sm">
                  {plan.features.map((feature) => <li key={feature} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><span>{feature}</span></li>)}
                </ul>
                <Button size="lg" variant={isPro ? "default" : "outline"} className="mt-8 w-full" onClick={onCTAClick}>
                  {isPro ? "Testar o Pro por 14 dias" : "Começar grátis"}<ArrowRight aria-hidden="true" />
                </Button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}