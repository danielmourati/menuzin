import { createFileRoute, Link } from "@tanstack/react-router";
import { Utensils, Smartphone, MessageCircle, BarChart3, ArrowRight, CheckCircle2, ShoppingBag, ShieldCheck, Headphones, Store, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { listActiveTenants } from "@/lib/catalog.functions";
import landingBurgerArtesanal from "@/assets/demo-burger-artesanal.jpg";
import landingComboSmash from "@/assets/demo-combo-smash.jpg";
import landingBurgerBacon from "@/assets/demo-burger-bacon.jpg";
import landingComboFamilia from "@/assets/demo-combo-familia.jpg";
import landingBatataRefri from "@/assets/demo-batata-refri.jpg";
import landingHeroPhone from "@/assets/landing-hero-phone.png";

const demoProducts = [
  { name: "Burger Artesanal", desc: "Blend bovino, queijo, alface, brioche", price: 32.9, img: landingBurgerArtesanal },
  { name: "Combo Smash", desc: "Smash + batata + refri", price: 38.9, img: landingComboSmash },
  { name: "Burger Bacon", desc: "Bacon crocante, cheddar, brioche", price: 34.9, img: landingBurgerBacon },
  { name: "Batata + Refri", desc: "Porção de batata com refri 350ml", price: 18.5, img: landingBatataRefri },
];

const pricingPlans = [
  {
    id: "start",
    name: "Essencial",
    price: 89,
    priceLabel: "R$ 89",
    tagline: "Para vendedores autônomos (MEI) que vendem pelo WhatsApp e Instagram.",
    features: [
      "1 usuário com acesso",
      "Produtos ilimitados",
      "Dashboard completo",
      "Gestão de status de pedidos",
      "Pedidos direto no WhatsApp",
      "Relatórios básicos de gestão",
    ],
    cta: "Começar agora",
  },
  {
    id: "pro",
    name: "Controle",
    price: 159,
    priceLabel: "R$ 159",
    tagline: "Para quem tem loja física e quer controle total da operação.",
    features: [
      "Até 3 usuários ou vendedores",
      "Tudo do Plano Essencial",
      "Pagamento online com Mercado Pago",
      "Múltiplas impressoras (cozinha, bar, balcão)",
      "Suporte personalizado",
    ],
    cta: "Assinar Controle",
    highlighted: true,
  },
] as const;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Menuzin — Cardápio digital e pedidos por WhatsApp" },
      { name: "description", content: "Catálogo digital com pedidos pelo WhatsApp, pagamento online e gestão completa para restaurantes, lanchonetes, pizzarias, marmitarias e cafeterias." },
      { property: "og:title", content: "Menuzin" },
      { property: "og:description", content: "A vitrine digital do seu negócio food." },
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
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/__l5e/assets-v1/8bccd988-a267-40f1-ae97-10934cea3aac/menuzin-logo.png" alt="Menuzin" className="h-9 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features">Recursos</a>
            <a href="#plans">Planos</a>
            {demoSlug && <Link to="/$slug" params={{ slug: demoSlug }}>Demo da loja</Link>}
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/admin/login">Entrar</Link></Button>
            <Button asChild size="sm"><Link to="/admin/dashboard">Acessar painel</Link></Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="container mx-auto grid gap-8 px-4 pt-16 md:pt-24 lg:grid-cols-2 lg:items-end lg:gap-4">
          <div className="pb-12 md:pb-20 lg:pb-32">
            <h1 className="text-4xl font-bold leading-tight text-balance md:text-6xl">
              A vitrine digital do seu <span className="text-primary">negócio food</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground text-balance">
              Cardápio online, carrinho, checkout e pedidos direto no WhatsApp. Tudo personalizável, em um link só, pronto para vender hoje.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {demoSlug && (
                <Button asChild size="lg" className="gap-2">
                  <Link to="/$slug" params={{ slug: demoSlug }}>
                    Ver loja demo <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" size="lg">
                <Link to="/admin/dashboard">Entrar no painel</Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Sem cartão</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Pronto em minutos</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Mobile first</span>
            </div>
          </div>

          <div className="relative flex items-end justify-center self-end lg:justify-end">
            <div className="pointer-events-none absolute inset-x-4 bottom-0 -z-10 h-2/3 rounded-[50%] gradient-brand opacity-25 blur-3xl" />
            <img
              src={landingHeroPhone}
              alt="Cliente fazendo pedido pelo cardápio digital Menuzin no celular"
              width={1280}
              height={1280}
              className="block h-auto w-full max-w-sm object-contain object-bottom drop-shadow-2xl sm:max-w-md md:max-w-lg lg:max-w-none lg:h-[640px] lg:w-auto xl:h-[760px]"
            />
          </div>
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold md:text-3xl">Pré-visualização do cardápio</h2>
            <p className="mt-2 text-sm text-muted-foreground">Veja como seus clientes vão pedir.</p>
          </div>
          <div className="mx-auto mt-8 max-w-2xl rounded-3xl border bg-card p-2 shadow-[var(--shadow-pop)]">
            <div className="rounded-2xl bg-gradient-to-b from-primary/10 to-transparent p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground font-bold text-xl">B</div>
                <div className="flex-1">
                  <p className="font-semibold">Burger Prime</p>
                  <p className="text-xs"><span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 font-semibold text-success">● Aberta agora</span> <span className="ml-2 text-muted-foreground">35–45 min</span></p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {demoProducts.map((p) => (
                  <div key={p.name} className="flex flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm">
                    <img src={p.img} alt={p.name} loading="lazy" width={768} height={768} className="aspect-square w-full object-cover" />
                    <div className="flex flex-1 flex-col gap-1 p-2.5">
                      <p className="text-sm font-semibold leading-tight">{p.name}</p>
                      <p className="line-clamp-1 text-[11px] text-muted-foreground">{p.desc}</p>
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <span className="text-sm font-bold text-primary">{brl(p.price)}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">+ Adicionar</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between rounded-2xl bg-primary px-4 py-3 text-primary-foreground">
                <span className="flex items-center gap-2 text-sm font-medium"><ShoppingBag className="h-4 w-4" /> 4 itens no carrinho</span>
                <span className="font-bold">{brl(125.2)}</span>
              </div>
            </div>
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

      <section id="plans" className="container mx-auto px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Planos do Menuzin</h2>
          <p className="mt-3 text-muted-foreground">Comece grátis no Start e desbloqueie pagamento online e múltiplas impressoras no Pro.</p>
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          {pricingPlans.map((p) => {
            const highlighted = "highlighted" in p && p.highlighted;
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
                <p className="mt-5 text-4xl font-bold">
                  {p.priceLabel}
                  {p.price > 0 && <span className="text-base font-normal text-muted-foreground">/mês</span>}
                </p>
                <ul className="mt-6 space-y-3 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${highlighted ? "text-primary" : "text-success"}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="mt-8 w-full"
                  size="lg"
                  variant={highlighted ? "default" : "outline"}
                >
                  <Link to="/admin/login">{p.cta}</Link>
                </Button>
              </div>
            );
          })}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Sem fidelidade. Você pode mudar de plano quando quiser.
        </p>
      </section>

      <footer className="border-t bg-card">
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Menuzin. Vitrine digital para negócios food.</p>
          <div className="flex gap-4">
            <Link to="/platform/dashboard">Painel da plataforma</Link>
            <Link to="/admin/dashboard">Painel do lojista</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
