import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickSignupModal } from "@/components/landing/QuickSignupModal";
import { FaqSection, LandingFooter } from "@/components/landing/LandingSections";
import {
  AuthorityStrip,
  PainSolutionGrid,
  PricingTable,
  ProductDeepDive,
  ProductHeroVisual,
} from "@/components/landing/CroSections";
import { listPlans } from "@/lib/subscriptions.functions";
import menuzinLogoAsset from "@/assets/menuzin-logo.png.asset.json";

const TITLE = "Plataforma de gestão para delivery — Menuzin";
const DESC = "Gestão Kanban, impressão automática e rastreio em tempo real, sem comissão por pedido. Teste o Menuzin Pro grátis por 14 dias.";

const fallbackPlans = [
  {
    id: "presenca",
    name: "Presença",
    price: 0,
    description: "Sua vitrine digital gratuita para continuar vendendo sem comissão.",
    features: ["Até 20 produtos", "Link e QR Code", "Pedidos pelo WhatsApp", "0% de comissão"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 79.8,
    description: "Gestão completa, automação e produtos ilimitados para profissionalizar seu delivery.",
    features: ["Painel Kanban de pedidos", "Impressão automática", "Rastreio para o cliente", "Produtos ilimitados", "Sem taxa por pedido"],
  },
];

const strategicFaqs = [
  {
    q: "O Menuzin cobra comissão por pedido?",
    a: "Não. O Menuzin não retém uma parte das suas vendas. No Pro, você paga somente a assinatura configurada e mantém o valor dos pedidos.",
  },
  {
    q: "Como funcionam os 14 dias grátis do Pro?",
    a: "O acesso completo é liberado no cadastro, sem pedir cartão. Ao final dos 14 dias, você pode assinar o Pro ou continuar gratuitamente no plano Presença.",
  },
  {
    q: "O cliente precisa instalar um aplicativo?",
    a: "Não. O cardápio, a confirmação e o acompanhamento do pedido funcionam direto no navegador do celular.",
  },
  {
    q: "A impressão na cozinha pode ser automática?",
    a: "Sim. No Pro, você pode configurar locais e impressoras para aceitar e imprimir pedidos automaticamente enquanto o painel estiver conectado.",
  },
  {
    q: "Como o cliente acompanha o pedido?",
    a: "Depois de comprar, ele recebe uma página de acompanhamento que mostra cada atualização, do aceite até a entrega ou retirada.",
  },
];

export const Route = createFileRoute("/comece-agora")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: "Menuzin — Gestão completa sem comissão" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Menuzin — Gestão completa sem comissão" },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: "https://menuzin.app/comece-agora" }],
  }),
  component: ComeceAgora,
});

function ComeceAgora() {
  const [signupOpen, setSignupOpen] = useState(false);
  const { data } = useQuery({ queryKey: ["plans"], queryFn: () => listPlans(), staleTime: 60_000 });
  const plans = useMemo(() => {
    const active = data?.plans
      ?.filter((plan) => plan.slug === "presenca" || plan.slug === "pro")
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((plan) => ({
        id: plan.slug,
        name: plan.name,
        price: Number(plan.monthly_price) || 0,
        description: plan.description ?? "",
        features: plan.features ?? [],
      }));
    return active?.length === 2 ? active : fallbackPlans;
  }, [data]);

  const openSignup = () => setSignupOpen(true);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="container mx-auto grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 sm:flex sm:justify-between">
          <Link to="/" className="min-w-0">
            <img src={menuzinLogoAsset.url} alt="Menuzin" className="h-9 w-auto" />
          </Link>
          <div className="flex shrink-0 items-center gap-3">
            <Button onClick={openSignup}><Rocket aria-hidden="true" /> Testar grátis</Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative border-b">
          <div className="container mx-auto grid items-center gap-12 px-4 py-14 md:py-20 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-10">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                <Rocket className="h-3.5 w-3.5" aria-hidden="true" /> 14 dias grátis do Plano Pro
              </span>
              <p className="mt-6 text-sm font-bold uppercase text-primary">Pare de dividir seu lucro.</p>
              <h1 className="mt-3 text-4xl font-bold leading-tight text-balance md:text-5xl lg:text-6xl">
                A experiência de um grande app de delivery, <span className="text-primary">sem pagar comissão por pedido.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Gestão de pedidos em Kanban, impressão automática na cozinha e rastreio em tempo real para o cliente. <strong className="text-foreground">Assuma o controle do seu delivery.</strong>
              </p>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Button size="lg" onClick={openSignup} className="w-full shadow-[var(--shadow-pop)] sm:w-auto">
                  Testar o Pro por 14 dias <ArrowRight aria-hidden="true" />
                </Button>
                <a href="#recursos" className="px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground">Ver como funciona</a>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {["Sem pedir cartão", "0% de comissão", "Retorno grátis ao Presença"].map((item) => (
                  <li key={item} className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />{item}</li>
                ))}
              </ul>
            </div>
            <ProductHeroVisual />
          </div>
        </section>

        <AuthorityStrip />
        <PainSolutionGrid />
        <ProductDeepDive />
        <PricingTable plans={plans} onCTAClick={openSignup} />
        <FaqSection
          plans={plans.map((plan) => ({ name: plan.name, price: plan.price }))}
          items={strategicFaqs}
        />

        <section className="border-y bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 py-20 text-center">
            <p className="text-sm font-bold uppercase text-primary-foreground/80">Pare de dividir seu lucro.</p>
            <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-bold text-balance md:text-5xl">Sua operação completa pode começar hoje.</h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/85">Teste todos os recursos do Pro por 14 dias. Sem cartão e sem comissão por pedido.</p>
            <Button size="lg" variant="secondary" onClick={openSignup} className="mt-7">
              Começar meus 14 dias grátis <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </section>
      </main>

      <LandingFooter />
      <QuickSignupModal open={signupOpen} onOpenChange={setSignupOpen} />
    </div>
  );
}