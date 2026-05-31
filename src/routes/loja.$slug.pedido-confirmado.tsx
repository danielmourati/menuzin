import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { CheckCircle2, MessageCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { store } from "@/lib/mock-data";
import { brl, modeLabel } from "@/lib/format";
import { buildWhatsAppMessage, whatsappLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/loja/$slug/pedido-confirmado")({
  validateSearch: (s: Record<string, unknown>) => ({ n: Number(s.n) || 0 }),
  component: ConfirmedPage,
});

function ConfirmedPage() {
  const { slug } = Route.useParams();
  const { n } = Route.useSearch();

  const order = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(`order:${n}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [n]);

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-muted-foreground">Pedido não encontrado.</p>
          <Button asChild className="mt-4"><Link to="/loja/$slug" params={{ slug }}>Voltar ao catálogo</Link></Button>
        </div>
      </div>
    );
  }

  const message = buildWhatsAppMessage({
    ...order,
    items: order.items.map((it: never) => ({ product: { name: (it as { name: string }).name }, ...(it as object) })),
  } as never);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-lg px-4 py-10">
        <div className="rounded-3xl border bg-card p-6 text-center shadow-[var(--shadow-soft)]">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Pedido recebido!</h1>
          <p className="mt-1 text-muted-foreground">Pedido nº <span className="font-semibold text-foreground">#{order.number}</span></p>

          <div className="mt-6 rounded-2xl border bg-muted/30 p-4 text-left">
            <p className="text-sm text-muted-foreground">Modalidade</p>
            <p className="font-semibold">{modeLabel[order.mode as string]}</p>
            <div className="mt-3 space-y-1 text-sm">
              {order.items.map((i: { qty: number; name: string }, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <span>{i.qty}x {i.name}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{brl(order.subtotal)}</span></div>
              {order.deliveryFee > 0 && <div className="flex justify-between text-muted-foreground"><span>Entrega</span><span>{brl(order.deliveryFee)}</span></div>}
              <div className="mt-1 flex justify-between font-bold"><span>Total</span><span>{brl(order.total)}</span></div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <Button asChild className="h-12 w-full bg-success hover:bg-success/90 text-success-foreground">
              <a href={whatsappLink(store.whatsapp, message)} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> Enviar pelo WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" className="h-12 w-full">
              <Link to="/loja/$slug/acompanhar/$orderId" params={{ slug, orderId: String(order.number) }}>
                Acompanhar pedido
              </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/loja/$slug" params={{ slug }}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao catálogo</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
