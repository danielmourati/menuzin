import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitOrderRating, getOrderRatingStatus } from "@/lib/ratings.functions";

type Props = {
  orderId: string;
};

export function OrderRatingCard({ orderId }: Props) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["order-rating-status", orderId],
    queryFn: () => getOrderRatingStatus({ data: { order_id: orderId } }),
    staleTime: 60_000,
  });

  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [nps, setNps] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  // pré-popula com avaliação existente, se houver
  useEffect(() => {
    if (data?.rating) {
      setStars(data.rating.stars);
      setNps(data.rating.nps ?? null);
      setComment(data.rating.comment ?? "");
    }
  }, [data?.rating]);

  const mut = useMutation({
    mutationFn: () =>
      submitOrderRating({
        data: { order_id: orderId, stars, nps: nps ?? null, comment },
      }),
    onSuccess: (res) => {
      if (res.alreadyRated) {
        toast.info("Você já avaliou este pedido.");
      } else {
        toast.success("Obrigado pela avaliação!");
      }
      qc.invalidateQueries({ queryKey: ["order-rating-status", orderId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return null;

  const already = data?.rated;

  return (
    <Card className="border-primary/30">
      <CardContent className="space-y-4 p-5">
        <div>
          <h3 className="text-base font-bold">Como foi sua experiência com o pedido?</h3>
          <p className="text-xs text-muted-foreground">
            Sua avaliação ajuda a loja a melhorar.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = (hover || stars) >= n;
            return (
              <button
                key={n}
                type="button"
                onMouseEnter={() => !already && setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => !already && setStars(n)}
                disabled={already}
                className="p-0.5 transition-transform disabled:cursor-default active:scale-95"
                aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
              >
                <Star
                  className={`h-8 w-8 ${filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
                />
              </button>
            );
          })}
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">
            De 0 a 10, o quanto você indicaria esta loja para um amigo? (opcional)
          </Label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Array.from({ length: 11 }, (_, i) => i).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => !already && setNps(nps === n ? null : n)}
                disabled={already}
                className={`h-9 min-w-[36px] rounded-md border text-sm font-semibold transition disabled:opacity-70 ${
                  nps === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/60"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Comentário (opcional)</Label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={already}
            maxLength={1000}
            placeholder="Conte como foi sua experiência…"
            className="mt-1.5"
          />
        </div>

        {already ? (
          <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            <Check className="h-4 w-4" /> Avaliação enviada. Obrigado!
          </div>
        ) : (
          <Button
            className="h-11 w-full"
            disabled={stars === 0 || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar avaliação
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
