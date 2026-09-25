import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock3,
  MessageCircleOff,
  Percent,
  Printer,
  Route,
  ShoppingBag,
} from "lucide-react";
import { useState } from "react";
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
    <div className="relative mx-auto w-full max-w-2xl pb-12 pt-2 sm:pb-14 lg:pb-16 px-2 sm:px-4">
      <img
        src={(ordersAsset as Asset).url}
        alt="Painel Menuzin organizando pedidos novos, em preparo e prontos"
        width={1584}
        height={768}
        fetchPriority="high"
        className="h-auto w-full max-h-[350px] lg:max-h-[400px] xl:max-h-[480px] object-contain rounded-xl shadow-2xl border border-border/50"
      />
      <div className="absolute bottom-1 left-3 w-[33%] min-w-28 max-w-48 sm:max-w-56 drop-shadow-2xl sm:bottom-2 sm:left-6 md:left-8">
        <img
          src={(storefrontAsset as Asset).url}
          alt="Cardápio Menuzin no celular do cliente"
          width={430}
          height={868}
          fetchPriority="high"
          className="h-auto w-full drop-shadow-xl"
        />
      </div>
      <div className="absolute bottom-3 right-3 rounded-lg border bg-card/95 p-2.5 shadow-lg backdrop-blur-md sm:bottom-4 sm:right-6 sm:px-3.5 sm:py-2.5">
        <p className="text-xs font-bold text-primary sm:text-sm">Operação e cliente conectados</p>
        <p className="text-[11px] text-muted-foreground sm:text-xs">Do novo pedido até a entrega.</p>
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
  images: Array<{ asset: Asset; alt: string; mobile?: boolean; eager?: boolean; shadow?: boolean }>;
}

function FeatureVisual({ images }: FeatureVisualProps) {
  return (
    <div className={`grid items-center gap-4 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
      {images.map(({ asset, alt, mobile, eager, shadow = true }, index) => (
        <img
          key={alt}
          src={asset.url}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          className={`h-auto w-full ${shadow ? "shadow-[var(--shadow-soft)]" : ""} ${
            mobile ? "mx-auto max-w-64 rounded-[1.6rem]" : "rounded-lg"
          } ${index === 1 ? "mt-8" : "mb-8"}`}
        />
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
    wideImage: true,
    images: [
      { asset: autoPrintingAsset as Asset, alt: "Menuzin imprimindo automaticamente um novo pedido na cozinha", eager: true, shadow: false },
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
      {featureBlocks.map(({ eyebrow, title, copy, icon: Icon, images, reverse, wideImage }, index) => (
        <article key={title} className={index % 2 ? "border-y bg-muted/35" : "bg-background"}>
          <div className={`container mx-auto grid items-center gap-10 px-4 py-16 lg:gap-16 lg:py-24 ${
            reverse && wideImage
              ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
              : "lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
          }`}>
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
  const [proExpanded, setProExpanded] = useState(false);
  const proPlan = plans.find((p) => p.id === "pro");
  const visibleProCount = 4;

  return (
    <section id="planos" className="bg-muted/35">
      <div className="container mx-auto px-4 py-20 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase text-primary">14 dias de acesso completo</p>
          <h2 className="mt-3 text-3xl font-bold text-balance md:text-5xl">Experimente o Pro. Decida depois.</h2>
          <p className="mt-4 text-muted-foreground">Sem cartão. Se não assinar, sua loja continua gratuitamente no plano Presença.</p>
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl items-start gap-6 md:grid-cols-2">
          {plans.map((plan) => {
            const isPro = plan.id === "pro";
            const displayedFeatures = isPro && !proExpanded ? plan.features.slice(0, visibleProCount) : plan.features;
            return (
              <article key={plan.id} className={`relative flex flex-col rounded-lg border bg-card p-7 md:p-9 ${isPro ? "border-2 border-primary shadow-[var(--shadow-pop)]" : "shadow-[var(--shadow-soft)]"}`}>
                {isPro && <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">Melhor Custo-Benefício</span>}
                <p className={`text-sm font-bold ${isPro ? "text-primary" : "text-muted-foreground"}`}>Plano {plan.name}</p>
                <p className="mt-3 text-4xl font-bold">{plan.price > 0 ? `R$ ${formatPrice(plan.price)}` : "Grátis"}{plan.price > 0 && <span className="text-base font-normal text-muted-foreground">/mês</span>}</p>
                <p className="mt-3 min-h-12 text-sm leading-relaxed text-muted-foreground">{plan.description}</p>
                {isPro && <div className="mt-5 rounded-md bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">Primeiros 14 dias liberados no cadastro</div>}
                <ul className="mt-6 space-y-3 text-sm">
                  {displayedFeatures.map((feature) => <li key={feature} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><span>{feature}</span></li>)}
                </ul>
                {isPro && proPlan && proPlan.features.length > visibleProCount && (
                  <button
                    type="button"
                    onClick={() => setProExpanded((v) => !v)}
                    className="mt-4 flex items-center gap-1 self-start text-sm font-semibold text-primary hover:underline"
                  >
                    {proExpanded ? "Ver menos funcionalidades" : "Ver todas as funcionalidades"}
                    {proExpanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                  </button>
                )}
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
const pushBars = [
  { day: "Seg", h: 45 }, { day: "Ter", h: 58 }, { day: "Qua", h: 66 },
  { day: "Qui", h: 76 }, { day: "Sex", h: 90 }, { day: "Sáb", h: 100 },
];
const pushItems = [
  { t: "1. Campanhas ilimitadas", d: "Envie avisos para todos os clientes que ativaram as notificações da sua loja, quantas vezes quiser." },
  { t: "2. Cupom na notificação", d: "Anexe um cupom e o cliente abre direto pelo botão \"Ver cupom\" no aviso." },
  { t: "3. Mensagens personalizadas", d: "Título, texto e imagem com a cara da sua loja para chamar atenção na hora certa." },
];

export function PushNotificationsSection() {
  const [open, setOpen] = useState(0);
  return (
    <section className="border-b">
      <div className="container mx-auto grid items-center gap-12 px-4 py-20 lg:grid-cols-2">
        <div className="relative pb-16 sm:pb-0">
          <div className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between border-b pb-4">
              <p className="font-display text-lg font-bold">Disparo de notificações</p>
              <span className="text-sm font-semibold text-muted-foreground">Esta semana</span>
            </div>
            <div className="mt-6 flex h-56 items-end justify-between gap-3">
              {pushBars.map((b, i) => (
                <div key={b.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div className="w-full max-w-10 rounded-full bg-primary" style={{ height: `${b.h}%`, opacity: 0.3 + i * 0.14 }} />
                  <span className="text-xs text-muted-foreground">{b.day}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -bottom-2 right-2 w-56 rounded-2xl border bg-card p-5 text-center shadow-[var(--shadow-pop)] sm:-bottom-10 sm:-right-4 motion-safe:animate-float-badge-a">
            <BellRing className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
            <p className="mt-2 font-display text-2xl font-extrabold text-primary">+R$ 12.480</p>
            <p className="mt-1 text-sm text-muted-foreground">Vendas das campanhas de notificação</p>
            <span className="mt-2 inline-block rounded-md bg-success/10 px-2 py-0.5 text-xs font-bold text-success">↑ 32%</span>
          </div>
        </div>
        <div>
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">Notificações push</span>
          <h2 className="mt-4 text-3xl font-bold text-balance md:text-5xl">Traga o cliente de volta com um toque</h2>
          <p className="mt-4 text-lg text-muted-foreground">Avise sobre promoções e novidades direto no celular de quem já comprou com você. Sem custo por envio.</p>
          <div className="mt-8 space-y-3">
            {pushItems.map((it, i) => (
              <div key={it.t} className="rounded-xl bg-primary/5">
                <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between px-5 py-4 text-left font-semibold">
                  {it.t}
                  <ChevronDown className={`h-5 w-5 transition-transform ${open === i ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
                {open === i && <p className="px-5 pb-4 text-muted-foreground">{it.d}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
