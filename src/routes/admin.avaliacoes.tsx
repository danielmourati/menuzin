import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star, MessageSquare, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listMyTenantRatings } from "@/lib/ratings.functions";

import { PlanGate } from "@/components/subscription/PlanGate";

export const Route = createFileRoute("/admin/avaliacoes")({
  component: () => (
    <PlanGate min="start" title="Avaliações" featureLabel="Avaliações de clientes">
      <RatingsPage />
    </PlanGate>
  ),
});


function RatingsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "ratings"],
    queryFn: () => listMyTenantRatings({ data: { limit: 100 } }),
  });

  return (
    <AdminLayout title="Avaliações">
      <div className="space-y-6">
        {isLoading && (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <Card><CardContent className="p-6 text-destructive">{(error as Error).message}</CardContent></Card>
        )}

        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard label="Total de avaliações" value={String(data.summary.count)} />
              <SummaryCard
                label="Média de estrelas"
                value={data.summary.count > 0 ? data.summary.avgStars.toFixed(2) : "—"}
                accent="text-amber-500"
              />
              <SummaryCard
                label="NPS"
                value={data.summary.npsScore != null ? `${data.summary.npsScore}` : "—"}
                accent="text-primary"
              />
              <SummaryCard
                label="Promotores"
                value={`${data.summary.promoters}`}
                hint={`Passivos: ${data.summary.passives} · Detratores: ${data.summary.detractors}`}
                accent="text-success"
              />
            </div>

            <Card>
              <CardContent className="p-0">
                {data.ratings.length === 0 ? (
                  <p className="p-10 text-center text-muted-foreground">
                    Nenhuma avaliação ainda. Quando seus clientes finalizarem pedidos, as avaliações aparecerão aqui.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {data.ratings.map((r) => (
                      <li key={r.id} className="p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star
                                key={n}
                                className={`h-4 w-4 ${
                                  n <= r.stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                          {r.nps != null && (
                            <Badge variant="secondary">NPS {r.nps}</Badge>
                          )}
                          {r.customer_phone && (
                            <span className="text-xs text-muted-foreground">{r.customer_phone}</span>
                          )}
                          <span className="ml-auto text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        {r.comment && (
                          <p className="mt-2 flex items-start gap-2 text-sm text-foreground/80">
                            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <span>{r.comment}</span>
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${accent ?? ""}`}>{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
