import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { store } from "@/lib/mock-data";
import { whatsappLink } from "@/lib/whatsapp";

const timeline = [
  { key: "novo", label: "Pedido recebido" },
  { key: "confirmado", label: "Confirmado pela loja" },
  { key: "preparo", label: "Em preparo" },
  { key: "saiu_entrega", label: "Saiu para entrega" },
  { key: "finalizado", label: "Entregue" },
];

export const Route = createFileRoute("/loja/$slug/acompanhar/$orderId")({
  component: TrackPage,
});

function TrackPage() {
  const { slug, orderId } = Route.useParams();
  const currentIdx = 2; // mocked: em preparo

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-lg px-4 py-10">
        <h1 className="text-2xl font-bold">Pedido #{orderId}</h1>
        <p className="text-sm text-muted-foreground">Acompanhe o status em tempo real</p>

        <div className="mt-6 rounded-2xl border bg-card p-6">
          <ol className="relative space-y-6 border-l border-border pl-6">
            {timeline.map((step, idx) => {
              const done = idx <= currentIdx;
              const current = idx === currentIdx;
              return (
                <li key={step.key} className="relative">
                  <span className={`absolute -left-[33px] grid h-6 w-6 place-items-center rounded-full border-2 ${
                    done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                  }`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  </span>
                  <p className={`font-semibold ${current ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </p>
                  {current && <p className="text-xs text-muted-foreground">Agora mesmo</p>}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-6 space-y-2">
          <Button asChild className="h-12 w-full bg-success text-success-foreground hover:bg-success/90">
            <a href={whatsappLink(store.whatsapp, `Olá! Pedido #${orderId}, tenho uma dúvida.`)} target="_blank" rel="noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" /> Falar com a loja
            </a>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/loja/$slug" params={{ slug }}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao catálogo</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
