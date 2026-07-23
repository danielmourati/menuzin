import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Utensils, Smartphone, MessageCircle, BarChart3, ArrowRight, CheckCircle2, ShoppingBag, ShieldCheck, Headphones, Store, Bell, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { listActiveTenants } from "@/lib/catalog.functions";
import landingBurgerArtesanal from "@/assets/demo-burger-artesanal.jpg";
import landingComboSmash from "@/assets/demo-combo-smash.jpg";
import landingBurgerBacon from "@/assets/demo-burger-bacon.jpg";
import landingBatataRefri from "@/assets/demo-batata-refri.jpg";
import landingHeroDevices from "@/assets/landing-hero-devices.png";
import couplePhoneAsset from "@/assets/couple-ordering.png.asset.json";
import { WhatsAppFloatingButton, WHATSAPP_CONTACT_URL } from "@/components/WhatsAppFloatingButton";
import { QuickSignupModal } from "@/components/landing/QuickSignupModal";
import {
  FeatureShowcaseSection,
  CTABanner,
  ContactSpecialistSection,
  FaqSection,
  LandingFooter,
  faqs,
} from "@/components/landing/LandingSections";

const demoProducts = [
  { name: "Burger Artesanal", desc: "Blend bovino, queijo, alface, brioche", price: 32.9, img: landingBurgerArtesanal },
  { name: "Combo Smash", desc: "Smash + batata + refri", price: 38.9, img: landingComboSmash },
  { name: "Burger Bacon", desc: "Bacon crocante, cheddar, brioche", price: 34.9, img: landingBurgerBacon },
  { name: "Batata + Refri", desc: "Porção de batata com refri 350ml", price: 18.5, img: landingBatataRefri },
];

const pricingPlans = [
  {
    id: "presenca",
    name: "Presença",
    price: 0,
    priceLabel: "Grátis",
    tagline: "Sua vitrine no Guia Menuzin, sem pagar nada.",
    features: [
      "Página no Guia Menuzin",
      "Até 20 produtos e 4 categorias",
      "QR Code e link público",
      "Botão de WhatsApp",
      "Estatísticas básicas",
      "Marca Menuzin visível",
    ],
    cta: "Cadastrar grátis",
  },
  {
    id: "start",
    name: "Start",
    price: 57.9,
    priceLabel: "R$ 57,90",
    tagline: "Pedidos organizados no painel, prontos para vender.",
    features: [
      "Tudo do Presença",
      "Produtos e categorias ilimitados",
      "Painel de pedidos (entrega e retirada)",
      "Status do pedido em tempo real",
      "Cadastro de clientes e cupons básicos",
      "Impressão manual e relatórios básicos",
      "Até 2 usuários",
    ],
    cta: "Começar a vender",
    highlighted: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: 127.9,
    priceLabel: "R$ 127,90",
    tagline: "Automação completa e pagamento online.",
    features: [
      "Tudo do Start",
      "Pagamento online (Mercado Pago)",
      "Impressão automática (cozinha + entrega)",
      "Adicionais avançados, combos e pizza multi-sabor",
      "Cupons avançados, upsell e recuperação",
      "Taxa de entrega por distância",
      "Relatórios completos e múltiplos usuários",
      "Destaque no Guia • suporte prioritário",
    ],
    cta: "Profissionalizar meu delivery",
  },
] as const;


const HOME_TITLE = "Menuzin — Cardápio digital e pedidos por WhatsApp";
const HOME_DESC =
  "Catálogo digital com pedidos pelo WhatsApp, pagamento online e gestão completa para restaurantes, lanchonetes, pizzarias, marmitarias e cafeterias.";
const HOME_OG_TITLE = "Menuzin — Vitrine digital para o seu negócio food";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: HOME_TITLE },
      { name: "description", content: HOME_DESC },
      { property: "og:title", content: HOME_OG_TITLE },
      { property: "og:description", content: HOME_DESC },
      { property: "og:url", content: "https://menuzin.app/" },
      { name: "twitter:title", content: HOME_OG_TITLE },
      { name: "twitter:description", content: HOME_DESC },
    ],
    links: [{ rel: "canonical", href: "https://menuzin.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Menuzin",
          url: "https://menuzin.app",
          description: HOME_DESC,
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { data: tenantsData } = useQuery({
    queryKey: ["public", "active-tenants"],
    queryFn: () => listActiveTenants(),
    staleTime: 60_000,
  });
  const demoSlug = tenantsData?.tenants?.[0]?.slug;
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [signupOpen, setSignupOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/__l5e/assets-v1/8bccd988-a267-40f1-ae97-10934cea3aac/menuzin-logo.png" alt="Logo Menuzin" className="h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-3 md:gap-4">
            <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#features">Recursos</a>
              <a href="#plans">Planos</a>
              <a href="#faq">Dúvidas</a>
              <a href="#contato">Contato</a>
              {demoSlug && <Link to="/$slug" params={{ slug: demoSlug }}>Demo da loja</Link>}
              <Link to="/admin/login">Entrar</Link>
            </nav>
            <div className="relative group">
              <span
                className="absolute -inset-1 -z-10 rounded-full bg-gradient-to-r from-primary via-primary/70 to-primary opacity-60 blur-md transition duration-300 group-hover:opacity-100 group-hover:blur-lg"
                aria-hidden
              />
              <Button
                asChild
                className="relative h-10 px-5 text-sm shadow-lg transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:shadow-xl"
              >
                <a href="#plans">Começar Agora</a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="container mx-auto grid gap-12 px-4 py-16 md:py-24 lg:grid-cols-2 lg:items-center lg:gap-8">
          <div>
            <h1 className="text-4xl font-bold leading-tight text-balance md:text-6xl">
              A vitrine digital do seu <span className="text-primary">negócio food</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground text-balance">
              Cardápio online, carrinho, checkout e pedidos direto no WhatsApp. Tudo personalizável, em um link só, pronto para vender hoje.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="gap-2" onClick={() => setSignupOpen(true)}>
                <Rocket className="h-4 w-4" /> Criar meu cardápio grátis
              </Button>
              {demoSlug && (
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <Link to="/$slug" params={{ slug: demoSlug }}>
                    Ver loja demo <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Sem cartão</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Pronto em minutos</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Mobile first</span>
            </div>
          </div>

          <div className="relative flex items-center justify-center lg:justify-end">
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-[50%] gradient-brand opacity-20 blur-3xl" />
            <img
              src={landingHeroDevices}
              alt="Painel administrativo Menuzin no notebook e cardápio digital no celular"
              width={1536}
              height={1024}
              className="block h-auto w-full max-w-md object-contain drop-shadow-2xl sm:max-w-lg md:max-w-xl lg:max-w-none lg:w-[620px] xl:w-[720px]"
            />

            {/* Floating elements — sem cards/bordas */}
            <div className="pointer-events-none absolute left-0 top-4 hidden items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 shadow-xl backdrop-blur-sm dark:bg-card/90 sm:flex md:left-2">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-primary">
                <ShoppingBag className="h-3.5 w-3.5" />
              </div>
              <div className="text-left leading-tight">
                <p className="text-[11px] font-semibold">Novo pedido #1058</p>
                <p className="text-[10px] text-muted-foreground">R$ 64,80 · Delivery</p>
              </div>
            </div>

            <div className="pointer-events-none absolute right-0 top-14 hidden items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 shadow-xl backdrop-blur-sm dark:bg-card/90 sm:flex md:right-2">
              <div className="relative">
                <Bell className="h-4 w-4 text-primary" />
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-white dark:ring-card" />
              </div>
              <span className="text-[11px] font-semibold">3 novas notificações</span>
            </div>

            <div className="pointer-events-none absolute bottom-6 right-0 hidden items-center gap-2 rounded-full bg-[#25D366] px-3 py-1.5 text-white shadow-xl sm:flex md:right-2">
              <MessageCircle className="h-4 w-4" />
              <span className="text-[11px] font-semibold">Pedido enviado ao WhatsApp</span>
            </div>
          </div>
        </div>
      </section>

      <section
        className="relative border-y bg-muted/30 bg-cover bg-center"
        style={{ backgroundImage: `url(${couplePhoneAsset.url})` }}
        aria-label="Casal feliz fazendo pedido pelo celular"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-background/10 md:from-background/95 md:via-background/40 md:to-transparent" />
        <div className="relative container mx-auto px-4 py-24 md:py-32 lg:py-40">
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold md:text-4xl">Pré-visualização do cardápio</h2>
            <p className="mt-3 text-base text-muted-foreground md:text-lg">
              Veja como seus clientes vão pedir — direto do celular, em poucos toques.
            </p>
            {demoSlug && (
              <div className="relative mt-8 inline-flex">
                <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/60" aria-hidden />
                <Button asChild size="lg" className="relative gap-2 shadow-lg">
                  <Link to="/$slug" params={{ slug: demoSlug }}>
                    Ver demo da loja <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 py-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><Store className="h-4 w-4 text-primary" /> Multi-loja</span>
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> LGPD &amp; pagamentos seguros</span>
          <span className="flex items-center gap-2"><Headphones className="h-4 w-4 text-primary" /> Suporte em português</span>
        </div>
      </section>

      <section id="features" className="border-y bg-muted/40">
        <div className="container mx-auto grid gap-8 px-4 py-16 md:grid-cols-4">
          {[
            { icon: Utensils, t: "Cardápio digital", d: "Categorias, adicionais, variações e destaques com fotos." },
            { icon: Smartphone, t: "Pedidos em tempo real", d: "Receba e gerencie pedidos com notificações instantâneas." },
            { icon: MessageCircle, t: "Integração WhatsApp", d: "Pedido enviado direto, formatado e pronto para imprimir." },
            { icon: BarChart3, t: "Painel de gestão", d: "Métricas, produtos, cupons, taxas e equipe — tudo em um lugar." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Deep features (mostra valor antes do preço) */}
      <FeatureShowcaseSection products={demoProducts} />

      {/* Planos — posicionados após a demonstração de valor */}
      <section id="plans" className="relative overflow-hidden bg-gradient-to-b from-muted/40 via-background to-background">
        <div className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Planos &amp; preços
            </span>
            <h2 className="mt-4 text-3xl font-bold md:text-4xl">Escolha o plano ideal para o seu negócio</h2>
            <p className="mt-3 text-muted-foreground">
              Comece grátis no Presença, evolua para o Start quando quiser gerenciar pedidos e vá para o Pro quando precisar de pagamento online e automação. Sem fidelidade.
            </p>


            {/* Toggle mensal / anual */}
            <div className="mt-8 flex flex-col items-center gap-2">
              <div className="inline-flex items-center rounded-full border bg-card p-1 shadow-[var(--shadow-soft)]">
                <button
                  type="button"
                  onClick={() => setBilling("monthly")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    billing === "monthly" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setBilling("annual")}
                  className={`relative rounded-full px-4 py-2 text-sm font-medium transition ${
                    billing === "annual" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Anual
                  <span className="ml-2 inline-flex items-center rounded-full bg-success px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success-foreground">
                    2 meses grátis
                  </span>
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {billing === "annual" ? "Economize ~17% pagando anualmente" : "Cobrado mensalmente, sem fidelidade"}
              </p>
            </div>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
            {pricingPlans.map((p) => {
              const highlighted = "highlighted" in p && p.highlighted;
              const monthly = p.price;
              const annualMonthly = Math.round(p.price * 10) / 12; // 2 meses grátis
              const displayed = billing === "annual" ? annualMonthly : monthly;
              const annualTotal = p.price * 10;
              return (
                <div
                  key={p.id}
                  className={`relative flex flex-col rounded-3xl border bg-card p-8 transition ${
                    highlighted
                      ? "border-primary shadow-[var(--shadow-pop)] ring-2 ring-primary/20"
                      : "shadow-[var(--shadow-soft)]"
                  }`}
                >
                  {highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
                      MAIS ESCOLHIDO
                    </span>
                  )}
                  <h3 className="text-2xl font-bold">{p.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground min-h-[2.5rem]">{p.tagline}</p>
                  <div className="mt-5">
                    {billing === "annual" && (
                      <p className="text-sm text-muted-foreground line-through">
                        De R$ {monthly}/mês
                      </p>
                    )}
                    <p className="text-4xl font-bold">
                      R$ {displayed.toLocaleString("pt-BR", { minimumFractionDigits: billing === "annual" ? 2 : 0, maximumFractionDigits: 2 })}
                      <span className="text-base font-normal text-muted-foreground">/mês</span>
                    </p>
                    {billing === "annual" ? (
                      <p className="mt-1 text-xs font-medium text-success">
                        R$ {annualTotal.toLocaleString("pt-BR")} por ano · 2 meses grátis
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">Cobrado mensalmente</p>
                    )}
                  </div>
                  <ul className="mt-6 space-y-3 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${highlighted ? "text-primary" : "text-success"}`} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {p.id === "presenca" ? (
                    <Button
                      className="mt-8 w-full gap-2"
                      size="lg"
                      variant={highlighted ? "default" : "outline"}
                      onClick={() => setSignupOpen(true)}
                    >
                      <Rocket className="h-4 w-4" /> Criar meu cardápio grátis
                    </Button>
                  ) : (
                    <Button
                      asChild
                      className="mt-8 w-full gap-2"
                      size="lg"
                      variant={highlighted ? "default" : "outline"}
                    >
                      <a href={WHATSAPP_CONTACT_URL} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-4 w-4" /> {p.cta}
                      </a>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Sem fidelidade. Você pode mudar de plano quando quiser.
          </p>
        </div>
      </section>

      {/* FAQ — quebra objeções imediatamente após o preço */}
      <FaqSection />

      {/* CTA final + contato */}
      <CTABanner onCTAClick={() => setSignupOpen(true)} />
      <ContactSpecialistSection />
      <LandingFooter />

      <QuickSignupModal open={signupOpen} onOpenChange={setSignupOpen} />
      <WhatsAppFloatingButton />
    </div>
  );
}
