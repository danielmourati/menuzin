import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Mail, MessageCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LandingFooter } from "@/components/landing/LandingSections";
import { WHATSAPP_CONTACT_URL, WHATSAPP_PHONE_DISPLAY } from "@/components/WhatsAppFloatingButton";
import { submitSupportMessage } from "@/lib/support.functions";
import menuzinLogoAsset from "@/assets/menuzin-logo.png.asset.json";

const menuzinLogo = menuzinLogoAsset.url;

const TITLE = "Contato e suporte — Menuzin";
const DESC = "Fale com o time do Menuzin: dúvidas sobre planos, cardápio digital, pedidos e o Guia Menuzin. Responderemos por e-mail ou WhatsApp.";

export const Route = createFileRoute("/contato")({
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
    links: [{ rel: "canonical", href: "https://menuzin.app/contato" }],
  }),
  component: ContatoPage,
});

function ContatoPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [sent, setSent] = useState(false);

  const mut = useMutation({
    mutationFn: async () =>
      submitSupportMessage({
        data: { name, email, whatsapp, subject, message, website },
      }),
    onSuccess: () => {
      setSent(true);
      toast.success("Mensagem enviada! Em breve entraremos em contato.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={menuzinLogo} alt="Menuzin" className="h-9 w-auto" />
          </Link>
          <Link to="/admin/login" className="text-sm text-muted-foreground hover:text-foreground">
            Entrar
          </Link>
        </div>
      </header>

      <main className="container mx-auto grid gap-10 px-4 py-12 lg:grid-cols-[1fr_420px]">
        <section>
          <h1 className="text-3xl font-bold md:text-4xl">Fale com a gente</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Dúvidas sobre planos, cardápio digital, pedidos ou o Guia Menuzin? Envie sua mensagem
            que respondemos no e-mail informado.
          </p>

          <div className="mt-6 space-y-3">
            <a
              href={WHATSAPP_CONTACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50"
            >
              <MessageCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">WhatsApp</p>
                <p className="text-sm text-muted-foreground">{WHATSAPP_PHONE_DISPLAY}</p>
              </div>
            </a>
            <div className="flex items-center gap-3 rounded-xl border p-4">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Suporte por e-mail</p>
                <p className="text-sm text-muted-foreground">Resposta em até 1 dia útil.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border p-5">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <h2 className="text-lg font-semibold">Mensagem recebida!</h2>
              <p className="text-sm text-muted-foreground">
                Enviamos uma confirmação para <strong>{email}</strong>. Nosso time responde em breve.
              </p>
              <Button variant="outline" onClick={() => { setSent(false); setSubject(""); setMessage(""); }}>
                Enviar outra mensagem
              </Button>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                mut.mutate();
              }}
            >
              <h2 className="text-lg font-semibold">Formulário de contato</h2>
              <div>
                <Label htmlFor="c-name">Nome</Label>
                <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" required maxLength={120} />
              </div>
              <div>
                <Label htmlFor="c-email">E-mail</Label>
                <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" required maxLength={160} />
              </div>
              <div>
                <Label htmlFor="c-wpp">WhatsApp (opcional)</Label>
                <Input id="c-wpp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="mt-1.5" maxLength={20} />
              </div>
              <div>
                <Label htmlFor="c-subject">Assunto</Label>
                <Input id="c-subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1.5" required maxLength={140} />
              </div>
              <div>
                <Label htmlFor="c-msg">Mensagem</Label>
                <Textarea id="c-msg" value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1.5 min-h-32" required maxLength={2000} />
              </div>
              {/* honeypot */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="hidden"
              />
              <Button type="submit" className="h-11 w-full" disabled={mut.isPending}>
                {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar mensagem
              </Button>
            </form>
          )}
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
