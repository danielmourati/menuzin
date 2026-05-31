import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ExternalLink } from "lucide-react";
import { platformStores } from "@/lib/mock-data";
import { brl } from "@/lib/format";
import { PlatformLayout } from "./platform.dashboard";

export const Route = createFileRoute("/platform/lojas")({ component: PlatformStores });

const statusTone: Record<string, string> = {
  ativa: "bg-success/15 text-success",
  teste: "bg-warning/20 text-warning-foreground",
  suspensa: "bg-destructive/15 text-destructive",
};

function PlatformStores() {
  return (
    <PlatformLayout title="Lojas">
      <div className="grid gap-3">
        {platformStores.map((s) => (
          <Card key={s.id}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold">{s.name}</p>
                <Badge variant="secondary" className={statusTone[s.status]}>{s.status}</Badge>
                <Badge variant="outline">{s.plan}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{s.city} · /{s.slug} · cadastrada em {s.createdAt}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm">{s.ordersMonth} pedidos</p>
                <p className="text-xs text-muted-foreground">{brl(s.revenue)}</p>
              </div>
              <Button asChild size="icon" variant="outline">
                <Link to="/loja/$slug" params={{ slug: s.slug }} target="_blank"><ExternalLink className="h-4 w-4" /></Link>
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
