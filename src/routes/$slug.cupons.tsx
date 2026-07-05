import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listPublicCoupons, type PublicCoupon } from "@/lib/coupons.functions";
import { getCatalog } from "@/lib/catalog.functions";
import { ArrowLeft, Copy, Ticket, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/$slug/cupons")({
  head: ({ params }) => ({
    meta: [
      { title: `Cupons de desconto — ${params.slug}` },
      { name: "description", content: "Veja os cupons de desconto ativos e economize no seu pedido." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CouponsPage,
});

function CouponsPage() {
  const { slug } = Route.useParams();
  const tenantQ = useQuery({
    queryKey: ["catalog-tenant", slug],
    queryFn: async () => (await getCatalog({ data: { slug } })).tenant,
    staleTime: 60_000,
  });
  const couponsQ = useQuery({
    queryKey: ["public-coupons", slug],
    queryFn: async () => (await listPublicCoupons({ data: { slug } })).coupons,
    staleTime: 30_000,
  });

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur">
        <Link
          to="/$slug"
          params={{ slug }}
          className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-bold">Cupons de Desconto</h1>
      </header>

      <div className="container mx-auto max-w-2xl px-4 pt-6">
        {tenantQ.data && (
          <p className="mb-4 text-sm text-muted-foreground">
            Cupons ativos em <span className="font-semibold text-foreground">{tenantQ.data.name}</span>. Toque para copiar e use no carrinho.
          </p>
        )}

        {couponsQ.isLoading && (
          <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Carregando cupons…
          </div>
        )}

        {couponsQ.data && couponsQ.data.length === 0 && (
          <div className="rounded-2xl border bg-card p-10 text-center">
            <Ticket className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-semibold">Nenhum cupom ativo no momento</p>
            <p className="mt-1 text-xs text-muted-foreground">Volte em breve — novas promoções aparecem aqui.</p>
          </div>
        )}

        <div className="space-y-3">
          {couponsQ.data?.map((c) => <CouponCard key={c.code} coupon={c} />)}
        </div>
      </div>
    </div>
  );
}

function CouponCard({ coupon }: { coupon: PublicCoupon }) {
  const [copied, setCopied] = useState(false);
  const discountLabel =
    coupon.discount_type === "percent"
      ? `${coupon.discount_value}% OFF`
      : `${brl(coupon.discount_value)} OFF`;
  const validity = coupon.valid_until
    ? `Válido até ${new Date(coupon.valid_until).toLocaleDateString("pt-BR")}`
    : "Sem prazo de validade";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      toast.success(`Cupom ${coupon.code} copiado!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };
  return (
    <div className="flex items-stretch overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)]">
      <div className="grid w-24 shrink-0 place-items-center bg-primary/10 p-3 text-center">
        <div>
          <Ticket className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-1 text-xs font-bold text-primary">{discountLabel}</p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-base font-bold">{coupon.code}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{validity}</p>
          {coupon.min_order_total > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Pedido mínimo {brl(coupon.min_order_total)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          {copied ? (
            <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Copiado</span>
          ) : (
            <span className="inline-flex items-center gap-1"><Copy className="h-3.5 w-3.5" /> Copiar</span>
          )}
        </button>
      </div>
    </div>
  );
}
