import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listPublicCoupons, type PublicCoupon } from "@/lib/coupons.functions";
import { getCatalog } from "@/lib/catalog.functions";
import { useCart } from "@/lib/cart-context";
import { ArrowLeft, Copy, Ticket, Check, Sparkles, AlertCircle, ShoppingBag, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

const couponsSearchSchema = z.object({
  cupom: z.string().optional(),
  c: z.string().optional(),
});

export const Route = createFileRoute("/$slug/cupons")({
  validateSearch: (search: Record<string, unknown>) => couponsSearchSchema.parse(search),
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
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { activeCouponCode, setActiveCouponCode, count } = useCart();

  const requestedCode = (search.cupom || search.c || "").trim().toUpperCase();

  const tenantQ = useQuery({
    queryKey: ["catalog-tenant", slug],
    queryFn: async () => (await getCatalog({ data: { slug } })).tenant,
    staleTime: 60_000,
  });

  const couponsQ = useQuery({
    queryKey: ["public-coupons", slug, requestedCode],
    queryFn: async () =>
      await listPublicCoupons({
        data: { slug, requestedCode: requestedCode || null },
      }),
    staleTime: 30_000,
  });

  const coupons = couponsQ.data?.coupons ?? [];
  const requestedInfo = couponsQ.data?.requestedCoupon;

  // Se o cupom requisitado for válido e o usuário ainda não tiver cupom ativo, podemos ativá-lo ou destacá-lo
  const sortedCoupons = [...coupons].sort((a, b) => {
    if (a.code.toUpperCase() === requestedCode) return -1;
    if (b.code.toUpperCase() === requestedCode) return 1;
    if (a.code.toUpperCase() === activeCouponCode) return -1;
    if (b.code.toUpperCase() === activeCouponCode) return 1;
    return 0;
  });

  const handleApply = (code: string) => {
    setActiveCouponCode(code);
    toast.success(`Cupom ${code} ativado!`, {
      description: "O desconto será aplicado automaticamente no checkout.",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <header
        className="sticky top-0 z-10 flex items-center gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur"
        style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
      >
        <Link
          to="/$slug"
          params={{ slug }}
          className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          aria-label="Voltar para o cardápio"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold leading-tight">Cupons de Desconto</h1>
          {tenantQ.data && (
            <p className="truncate text-xs text-muted-foreground">{tenantQ.data.name}</p>
          )}
        </div>
      </header>

      <div className="container mx-auto max-w-2xl px-4 pt-6 space-y-4">
        {/* Banner de diagnóstico caso o link direto tenha sido desativado ou inválido */}
        {requestedInfo && requestedInfo.status !== "valid" && (
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                {requestedInfo.status === "inactive" && `O cupom ${requestedInfo.code} foi desativado temporariamente pela loja.`}
                {requestedInfo.status === "expired" && `O cupom ${requestedInfo.code} expirou.`}
                {requestedInfo.status === "exhausted" && `O cupom ${requestedInfo.code} atingiu o limite máximo de utilizações.`}
                {requestedInfo.status === "not_found" && `O cupom ${requestedInfo.code} não foi encontrado nesta loja.`}
              </p>
              <p className="mt-1 text-xs opacity-90">
                Confira abaixo os cupons ativos e aproveite outros descontos disponíveis!
              </p>
            </div>
          </div>
        )}

        {/* Banner de boas-vindas do link personalizado */}
        {requestedInfo && requestedInfo.status === "valid" && (
          <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm shadow-xs">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground">Você recebeu um cupom exclusivo!</p>
              <p className="text-xs text-muted-foreground">
                Toque em <strong>Usar cupom</strong> para ativá-lo automaticamente no seu checkout.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {sortedCoupons.length === 1 ? "1 cupom disponível" : `${sortedCoupons.length} cupons disponíveis`}
          </p>
          {activeCouponCode && (
            <Badge variant="outline" className="gap-1 border-primary/40 bg-primary/5 text-primary text-[11px] font-mono">
              <Check className="h-3 w-3" /> Ativo: {activeCouponCode}
            </Badge>
          )}
        </div>

        {couponsQ.isLoading && (
          <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
            Carregando cupons disponíveis…
          </div>
        )}

        {!couponsQ.isLoading && sortedCoupons.length === 0 && (
          <div className="rounded-2xl border bg-card p-12 text-center shadow-[var(--shadow-soft)]">
            <Ticket className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="mt-3 text-base font-semibold">Nenhum cupom ativo no momento</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
              Volte em breve ou acompanhe as redes sociais da loja para novas promoções.
            </p>
            <Button asChild className="mt-5 rounded-xl">
              <Link to="/$slug" params={{ slug }}>
                Ver cardápio completo
              </Link>
            </Button>
          </div>
        )}

        <div className="space-y-3.5">
          {sortedCoupons.map((c) => {
            const isTargeted = requestedCode === c.code.toUpperCase();
            const isApplied = activeCouponCode === c.code.toUpperCase();
            return (
              <CouponCard
                key={c.code}
                coupon={c}
                isTargeted={isTargeted}
                isApplied={isApplied}
                onApply={() => handleApply(c.code)}
              />
            );
          })}
        </div>
      </div>

      {/* Barra de ação flutuante inferior ao ter um cupom ativo */}
      {activeCouponCode && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-card/95 p-3.5 backdrop-blur shadow-lg">
          <div className="container mx-auto max-w-2xl flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Check className="h-3.5 w-3.5" />
                <span>Cupom <strong className="font-mono">{activeCouponCode}</strong> ativado</span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                O desconto será aplicado automaticamente no seu pedido.
              </p>
            </div>
            <Button
              size="sm"
              className="h-10 px-4 rounded-xl font-semibold gap-1.5 shrink-0"
              asChild
            >
              <Link to="/$slug" params={{ slug }}>
                {count > 0 ? (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    <span>Ver carrinho ({count})</span>
                  </>
                ) : (
                  <>
                    <span>Ir para o cardápio</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CouponCard({
  coupon,
  isTargeted,
  isApplied,
  onApply,
}: {
  coupon: PublicCoupon;
  isTargeted?: boolean;
  isApplied?: boolean;
  onApply: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const discountLabel =
    coupon.discount_type === "percent"
      ? `${coupon.discount_value}% OFF`
      : `${brl(coupon.discount_value)} OFF`;

  const validity = coupon.valid_until
    ? `Válido até ${new Date(coupon.valid_until).toLocaleDateString("pt-BR")}`
    : "Sem prazo de validade";

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
    <div
      className={`relative flex flex-col sm:flex-row items-stretch overflow-hidden rounded-2xl border bg-card transition-all shadow-[var(--shadow-soft)] ${
        isApplied
          ? "border-primary shadow-primary/10 ring-2 ring-primary/20"
          : isTargeted
            ? "border-primary/60 ring-2 ring-primary/20"
            : "hover:border-primary/40"
      }`}
    >
      {/* Banner / Badge superior no card se for o cupom do link */}
      {isTargeted && (
        <div className="absolute top-0 right-0 bg-primary px-3 py-0.5 rounded-bl-xl text-[10px] font-bold uppercase tracking-wider text-primary-foreground flex items-center gap-1 z-10">
          <Sparkles className="h-2.5 w-2.5" />
          <span>Oferta do seu link</span>
        </div>
      )}

      {/* Lado esquerdo com valor de desconto */}
      <div className="flex sm:w-28 shrink-0 flex-row sm:flex-col items-center justify-between sm:justify-center bg-primary/10 p-3.5 text-center border-b sm:border-b-0 sm:border-r border-border/40">
        <div className="flex sm:flex-col items-center gap-2 sm:gap-1">
          <Ticket className="h-6 w-6 text-primary" />
          <p className="text-sm font-extrabold text-primary leading-none">{discountLabel}</p>
        </div>
        <span className="sm:hidden font-mono font-bold text-sm text-foreground">{coupon.code}</span>
      </div>

      {/* Informações centrais e botões de ação */}
      <div className="flex flex-1 flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="hidden sm:block truncate font-mono text-base font-bold text-foreground">
            {coupon.code}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{validity}</p>
          {coupon.min_order_total > 0 ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Pedido mínimo de <strong>{brl(coupon.min_order_total)}</strong>
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">Sem valor mínimo de pedido</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copy}
            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            title="Copiar código"
          >
            {copied ? (
              <span className="inline-flex items-center gap-1 text-primary">
                <Check className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Copiado</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Copy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Copiar</span>
              </span>
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onApply}
            variant={isApplied ? "outline" : "default"}
            className={`h-9 px-4 text-xs font-semibold rounded-xl ${
              isApplied
                ? "border-primary text-primary bg-primary/10 hover:bg-primary/20"
                : "shadow-xs"
            }`}
          >
            {isApplied ? (
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" /> Cupom ativado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Ticket className="h-3.5 w-3.5" /> Usar cupom
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
