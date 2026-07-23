import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, CheckCircle2, MessageCircle, Rocket, ShieldCheck,
  Smartphone, Sparkles, Store, Zap,
} from "lucide-react";
import { QuickSignupModal } from "@/components/landing/QuickSignupModal";
import { LandingFooter } from "@/components/landing/LandingSections";
import menuzinLogo from "@/assets/menuzin-logo.png";

const TITLE = "Crie seu cardápio digital grátis — Menuzin";
const DESC = "Monte seu cardápio online em minutos, receba pedidos direto no WhatsApp. Sem taxas, sem comissão sobre as vendas.";

export const Route = createFileRoute("/comece-agora")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: "https://menuzin.app/comece-agora" }],
  }),
  component: ComeceAgora,
});

function ComeceAgora() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={menuzinLogo} alt="Menuzin" className="h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/admin/login" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">
              Entrar
            </Link>
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Criar grátis
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* animated gradient blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="animate-blob-pulse absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
          <div className="animate-blob-pulse absolute right-0 top-40 h-96 w-96 rounded-full bg-orange-400/25 blur-3xl" style={{ animationDelay: "3s" }} />
          <div className="animate-blob-pulse absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-yellow-300/20 blur-3xl" style={{ animationDelay: "6s" }} />
        </div>

        <div className="container mx-auto grid gap-12 px-4 py-16 md:py-24 lg:grid-cols-2 lg:items-center">
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Zap className="h-3 w-3" /> Plano Presença · 100% grátis
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] text-balance md:text-6xl">
              Seu cardápio digital no ar em{" "}
              <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">2 minutos</span>.
            </h1>
            <p className="mt-4 text-2xl font-semibold text-foreground/90 md:text-3xl">
              Sem taxas. Sem comissão sobre as vendas.
            </p>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Monte seu cardápio, compartilhe o link e receba pedidos direto no WhatsApp.
              Você fica com <strong>100% do que vender</strong>.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => setOpen(true)} className="gap-2 shadow-lg">
                <Rocket className="h-4 w-4" /> Criar meu cardápio grátis
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <Link to="/">Ver como funciona <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>

            <ul className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Sem cartão</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> 0% de comissão</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Cancele quando quiser</li>
            </ul>
          </div>

          {/* Right: floating mockup */}
          <div className="relative mx-auto flex h-[520px] w-full max-w-md items-center justify-center lg:h-[560px]">
            {/* phone frame */}
            <div className="animate-float-slow relative h-[480px] w-[240px] rounded-[2.5rem] border-8 border-foreground/90 bg-card shadow-2xl">
              <div className="absolute left-1/2 top-1.5 h-4 w-20 -translate-x-1/2 rounded-full bg-foreground/90" />
              <div className="h-full w-full overflow-hidden rounded-[2rem] bg-gradient-to-b from-primary/10 to-orange-100">
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-orange-500 text-white font-bold">
                      P
                    </div>
                    <div>
                      <p className="text-[11px] font-bold">Pizzaria Napoli</p>
                      <p className="text-[9px] text-emerald-600 font-semibold">● Aberto agora</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-1.5 overflow-hidden">
                    {["Pizzas", "Bebidas", "Doces"].map((c, i) => (
                      <span key={c} className={`whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-semibold ${i === 0 ? "bg-primary text-primary-foreground" : "bg-white/80 text-foreground"}`}>{c}</span>
                    ))}
                  </div>
                  <div className="mt-3 space-y-2">
                    {[
                      { n: "Margherita", p: "R$ 45,90" },
                      { n: "Calabresa", p: "R$ 48,90" },
                      { n: "Portuguesa", p: "R$ 52,90" },
                    ].map((it) => (
                      <div key={it.n} className="flex items-center gap-2 rounded-xl bg-white/90 p-2 shadow-sm">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-200 to-yellow-100" />
                        <div className="flex-1">
                          <p className="text-[10px] font-semibold leading-tight">{it.n}</p>
                          <p className="text-[9px] text-muted-foreground">Molho, muçarela</p>
                        </div>
                        <span className="text-[10px] font-bold text-primary">{it.p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* floating chips */}
            <div className="animate-float-delayed absolute -left-4 top-8 hidden items-center gap-2 rounded-full bg-white px-3 py-2 shadow-xl sm:flex">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="text-left leading-tight">
                <p className="text-[10px] font-bold">Novo pedido #1058</p>
                <p className="text-[9px] text-muted-foreground">R$ 64,80</p>
              </div>
            </div>

            <div className="animate-float-slow absolute -right-2 top-32 flex items-center gap-2 rounded-full bg-[#25D366] px-3 py-2 text-white shadow-xl" style={{ animationDelay: "0.7s" }}>
              <MessageCircle className="h-4 w-4" />
              <span className="text-[11px] font-semibold">Pedido no WhatsApp</span>
            </div>

            <div className="animate-float-delayed absolute -right-6 bottom-16 hidden items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-xl sm:flex">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
                <Zap className="h-4 w-4" />
              </div>
              <div className="text-left leading-tight">
                <p className="text-[10px] font-bold">0% de taxa</p>
                <p className="text-[9px] text-muted-foreground">100% seu</p>
              </div>
            </div>

            <div className="animate-float-slow absolute -left-4 bottom-6 hidden items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-xl sm:flex" style={{ animationDelay: "2s" }}>
              <span className="text-2xl">⭐</span>
              <div className="text-left leading-tight">
                <p className="text-[10px] font-bold">4.9 · 210 lojas</p>
                <p className="text-[9px] text-muted-foreground">satisfeitas</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Do zero ao primeiro pedido em 3 passos</h2>
            <p className="mt-3 text-muted-foreground">Simples, rápido e sem enrolação.</p>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-3">
            {[
              { icon: Store, t: "1. Cadastre sua loja", d: "Nome, WhatsApp e senha. Só isso. Sua vitrine já está no ar." },
              { icon: Smartphone, t: "2. Monte o cardápio", d: "Adicione categorias, produtos e fotos com um assistente guiado." },
              { icon: MessageCircle, t: "3. Receba pelo WhatsApp", d: "Cada pedido chega formatado direto no seu WhatsApp, pronto para atender." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-2xl border bg-card p-6 shadow-sm transition hover:shadow-md">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Por que <span className="text-primary">grátis de verdade</span>?</h2>
            <p className="mt-3 text-muted-foreground">O plano Presença não cobra mensalidade nem comissão sobre suas vendas.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              "0% de comissão sobre pedidos",
              "Link público + QR code prontos",
              "Vitrine no Guia Menuzin",
              "Até 20 produtos e 4 categorias",
              "Botão de WhatsApp integrado",
              "Estatísticas básicas",
            ].map((b) => (
              <div key={b} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                <span className="text-sm font-medium">{b}</span>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> LGPD &amp; dados protegidos</span>
            <span className="flex items-center gap-2"><Store className="h-4 w-4 text-primary" /> Já usado por lojas em todo Brasil</span>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative overflow-hidden border-y bg-gradient-to-br from-primary via-orange-500 to-orange-400 text-white">
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Pronto para começar a vender?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/90">
            Sua loja pode estar no ar em menos de 2 minutos. Sem cartão, sem letra miúda.
          </p>
          <Button size="lg" variant="secondary" onClick={() => setOpen(true)} className="mt-6 gap-2 shadow-xl">
            <Sparkles className="h-4 w-4" /> Criar meu cardápio grátis
          </Button>
        </div>
      </section>

      <LandingFooter />

      <QuickSignupModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
