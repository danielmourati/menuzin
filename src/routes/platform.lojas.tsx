import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ExternalLink, Loader2 } from "lucide-react";
import { listPlatformStores } from "@/lib/platform.functions";
import { brl } from "@/lib/format";
import { PlatformLayout } from "./platform.dashboard";

export const Route = createFileRoute("/platform/lojas")({ component: PlatformStores });

const statusTone: Record<string, string> = {
  ativa: "bg-success/15 text-success",
  teste: "bg-warning/20 text-warning-foreground",
  suspensa: "bg-destructive/15 text-destructive",
};

function PlatformStores() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform", "stores"],
    queryFn: () => listPlatformStores(),
  });
  const stores = data?.stores ?? [];

  return (
    <PlatformLayout title="Lojas">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{stores.length} estabelecimentos cadastrados</p>
        <Button asChild>
          <Link to="/platform/tenants/novo">+ Novo estabelecimento</Link>
        </Button>
      </div>

      {isLoading && (
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      )}
      {error && (
        <p className="rounded-xl border bg-destructive/10 p-4 text-destructive">{(error as Error).message}</p>
      )}

      <div className="grid gap-3">
        {!isLoading && !error && stores.length === 0 && (
          <p className="rounded-xl border bg-card p-8 text-center text-muted-foreground">Nenhuma loja cadastrada.</p>
        )}
        {stores.map((s) => (
          <Card key={s.id}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold">{s.name}</p>
                <Badge variant="secondary" className={statusTone[s.status] ?? ""}>{s.status}</Badge>
                <Badge variant="outline">{s.plan}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {s.city}{s.state ? `/${s.state}` : ""} · /{s.slug} · cadastrada em {new Date(s.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm">{s.orders_month} pedidos (30d)</p>
                <p className="text-xs text-muted-foreground">{brl(s.revenue_month)}</p>
              </div>
              <Button asChild size="icon" variant="outline">
                <Link to="/$slug" params={{ slug: s.slug }} target="_blank"><ExternalLink className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="icon" variant="outline">
                <Link to="/admin/dashboard"><Eye className="h-4 w-4" /></Link>
              </Button>
            </div>
          </CardContent></Card>
        ))}
      </div>
    </PlatformLayout>
  );
}
