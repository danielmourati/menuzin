import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, MessageCircle, Smartphone, ShoppingBag, Printer, BarChart3, Rocket } from "lucide-react";
import {
  WHATSAPP_CONTACT_URL,
  WHATSAPP_PHONE_DISPLAY,
  buildWhatsAppUrl,
} from "@/components/WhatsAppFloatingButton";
import { brl } from "@/lib/format";

type DemoProduct = { name: string; desc: string; price: number; img: string };

export function FeatureShowcaseSection({ products }: { products: DemoProduct[] }) {
  const features = [
    {
      icon: Smartphone,
      title: "Sua vitrine virtual, sempre atualizada",
      desc:
        "Transforme seu cardápio em vendas com um catálogo que atualiza a disponibilidade automaticamente e recebe pedidos pelo WhatsApp.",
      visual: <CatalogMockup products={products.slice(0, 4)} />,
    },
    {
      icon: ShoppingBag,
      title: "Pedidos organizados em um só lugar",
      desc:
        "Acompanhe pedidos em tempo real, atualize status e envie confirmação automática para o cliente — sem caderno, sem planilha.",
      visual: <OrdersMockup />,
      reverse: true,
    },
    {
      icon: Printer,
      title: "Imprima na cozinha em segundos",
      desc:
        "Pedidos saem direto na impressora térmica da cozinha, do bar ou do balcão. Sua equipe trabalha sem atraso, mesmo na hora do rush.",
      visual: <PrintMockup />,
    },
  ];

  return (
    <section className="bg-muted/40 py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold leading-tight md:text-4xl">
            Tudo que sua loja precisa para vender e crescer
          </h2>
          <p className="mt-4 text-muted-foreground">
            Recursos pensados para a rotina de quem trabalha com food — do cadastro do produto ao
            fechamento do caixa.
          </p>
        </div>

        <div className="mt-14 space-y-8">
          {features.map(({ icon: Icon, title, desc, visual, reverse }) => (
            <div
              key={title}
              className="overflow-hidden rounded-3xl border bg-card shadow-[var(--shadow-soft)]"
            >
              <div
                className={`grid items-center gap-8 p-6 md:gap-12 md:p-12 lg:grid-cols-2 ${
                  reverse ? "lg:[&>div:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <div className="inline-grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-2xl font-bold md:text-3xl">{title}</h3>
                  <p className="mt-3 text-muted-foreground">{desc}</p>
                </div>
                <div className="flex justify-center">{visual}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CatalogMockup({ products }: { products: DemoProduct[] }) {
  return (
    <div className="relative w-full max-w-xl">
      <div className="rounded-t-2xl bg-foreground/90 p-2">
        <div className="flex items-center gap-1.5 px-1">
          <span className="h-2 w-2 rounded-full bg-white/30" />
          <span className="h-2 w-2 rounded-full bg-white/30" />
          <span className="h-2 w-2 rounded-full bg-white/30" />
        </div>
      </div>
      <div className="rounded-b-2xl border-x border-b bg-background p-4 shadow-[var(--shadow-pop)]">
        <div className="mb-3 flex gap-2 overflow-hidden">
          {["Todos", "Burgers", "Combos", "Bebidas"].map((c, i) => (
            <span
              key={c}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                i === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {c}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {products.map((p) => (
            <div key={p.name} className="overflow-hidden rounded-lg border bg-card">
              <img src={p.img} alt={p.name} className="aspect-square w-full object-cover" />
              <div className="p-2">
                <p className="truncate text-xs font-semibold">{p.name}</p>
                <p className="text-xs font-bold text-primary">{brl(p.price)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrdersMockup() {
  const orders = [
    { id: "#1042", name: "Ana M.", status: "Em preparo", color: "bg-amber-500" },
    { id: "#1041", name: "João P.", status: "A caminho", color: "bg-blue-500" },
    { id: "#1040", name: "Carla S.", status: "Entregue", color: "bg-success" },
    { id: "#1039", name: "Rafael L.", status: "Novo pedido", color: "bg-primary" },
  ];
  return (
    <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-[var(--shadow-pop)]">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold">Pedidos de hoje</p>
        <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
          ● ao vivo
        </span>
      </div>
      <ul className="space-y-2">
        {orders.map((o) => (
          <li
            key={o.id}
            className="flex items-center justify-between rounded-xl border bg-background px-3 py-2.5"
          >
            <div className="flex items-center gap-3">
              <span className={`h-2 w-2 rounded-full ${o.color}`} />
              <div>
                <p className="text-sm font-semibold">
                  {o.id} <span className="font-normal text-muted-foreground">· {o.name}</span>
                </p>
                <p className="text-xs text-muted-foreground">{o.status}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PrintMockup() {
  return (
    <div className="relative w-full max-w-sm">
      <div className="mx-auto w-full rounded-xl bg-white p-5 font-mono text-[11px] leading-relaxed text-foreground shadow-[0_20px_50px_-20px_rgba(0,0,0,0.25)] ring-1 ring-black/5"
        style={{
          backgroundImage:
            "repeating-linear-gradient(transparent 0 22px, rgba(0,0,0,0.04) 22px 23px)",
        }}
      >
        <p className="text-center font-bold tracking-wider">*** BURGER PRIME ***</p>
        <p className="mt-1 text-center">Pedido #1042 — 19:42</p>
        <hr className="my-2 border-dashed border-foreground/30" />
        <p>1x Burger Artesanal</p>
        <p className="pl-3 text-foreground/70">+ Bacon extra</p>
        <p>2x Combo Smash</p>
        <p>1x Batata + Refri</p>
        <hr className="my-2 border-dashed border-foreground/30" />
        <p className="flex justify-between font-bold">
          <span>TOTAL</span>
          <span>R$ 125,20</span>
        </p>
        <p className="mt-1">Entrega · R. das Flores, 120</p>
      </div>
      <div className="absolute -left-3 top-3 h-3 w-[calc(100%+24px)] rounded-t-lg bg-foreground/80" />
    </div>
  );
}

export function CTABanner() {
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 px-6 py-14 text-center text-primary-foreground shadow-[var(--shadow-pop)] md:px-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <h2 className="relative text-3xl font-bold md:text-4xl">
          Comece a organizar sua loja hoje mesmo
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-primary-foreground/90">
          Suba seu cardápio em minutos. Sem cartão de crédito e com acesso a todos os recursos para
          começar a vender pelo WhatsApp.
        </p>
        <div className="relative mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" variant="secondary" className="gap-2">
            <a href={WHATSAPP_CONTACT_URL} target="_blank" rel="noopener noreferrer">
              Falar com a gente <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function ContactSpecialistSection() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10)
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message =
      `Olá! Meu nome é ${name || "[seu nome]"} (${phone || "WhatsApp"}). ` +
      "Quero falar com um especialista do Menuzin.";
    window.open(buildWhatsAppUrl(message), "_blank", "noopener,noreferrer");
  }

  return (
    <section id="contato" className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-xl rounded-3xl border bg-card p-8 shadow-[var(--shadow-soft)]">
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <MessageCircle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold md:text-3xl">Fale com um especialista</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Quer entender como o Menuzin se encaixa na sua loja? Deixe seu contato e um
            especialista fala com você pelo WhatsApp.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="contact-name">Nome *</Label>
            <Input
              id="contact-name"
              required
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-phone">WhatsApp (com DDD) *</Label>
            <Input
              id="contact-phone"
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(86) 91234-5678"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
            />
          </div>
          <Button type="submit" size="lg" className="w-full gap-2">
            Solicitar contato <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Seus dados são usados apenas para entrarmos em contato.
          </p>
        </form>
      </div>
    </section>
  );
}

export const faqs = [
  {
    q: "O que é o Menuzin?",
    a: "O Menuzin é uma vitrine digital para negócios food. Com ele você cria um cardápio online, recebe pedidos pelo WhatsApp e gerencia tudo em um painel simples.",
  },
  {
    q: "Posso acessar de qualquer lugar?",
    a: "Sim. O Menuzin funciona 100% no navegador, em celular, tablet ou computador. Não precisa instalar nada.",
  },
  {
    q: "Quanto custa o Menuzin?",
    a: "Temos dois planos: Essencial por R$ 89/mês e Controle por R$ 159/mês. Sem fidelidade — você pode mudar de plano quando quiser.",
  },
  {
    q: "Como começo a usar?",
    a: "Fale com a gente pelo WhatsApp. Em poucos minutos seu cardápio está no ar, pronto para receber pedidos.",
  },
  {
    q: "Como funciona o suporte?",
    a: "Atendimento humano em português, direto pelo WhatsApp. No plano Controle o suporte é personalizado.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="container mx-auto px-4 py-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold md:text-4xl">Perguntas frequentes</h2>
        <p className="mt-3 text-muted-foreground">
          As principais dúvidas de quem está conhecendo o Menuzin.
        </p>
      </div>
      <div className="mx-auto mt-10 max-w-3xl">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base font-semibold">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-1">
          <img
          src="/__l5e/assets-v1/8bccd988-a267-40f1-ae97-10934cea3aac/menuzin-logo.png"
          alt="Logo Menuzin"
          className="h-9 w-auto"
          />
          <p className="mt-4 text-sm text-muted-foreground">
            Vitrine digital para restaurantes, lanchonetes, pizzarias, marmitarias e cafeterias.
            Cardápio, pedidos pelo WhatsApp e gestão em um só lugar.
          </p>
          <a
            href={WHATSAPP_CONTACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <MessageCircle className="h-4 w-4" /> {WHATSAPP_PHONE_DISPLAY}
          </a>
        </div>

        <FooterCol
          title="Produto"
          links={[
            { label: "Recursos", href: "#features" },
            { label: "Planos", href: "#plans" },
            { label: "Perguntas frequentes", href: "#faq" },
          ]}
        />
        <FooterCol
          title="Empresa"
          links={[
            { label: "Sobre o Menuzin", href: "#features" },
            { label: "Guia Menuzin", href: "/guia" },
            { label: "Fale com um especialista", href: "#contato" },
          ]}
        />
        <FooterCol
          title="Contato"
          links={[
            { label: "WhatsApp", href: WHATSAPP_CONTACT_URL, external: true },
            { label: "Entrar", href: "/admin/login" },
          ]}
        />
      </div>
      <div className="border-t">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Menuzin. Todos os direitos reservados.</p>
          <p className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Vitrine digital para negócios food.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              target={l.external ? "_blank" : undefined}
              rel={l.external ? "noopener noreferrer" : undefined}
              className="hover:text-foreground"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
