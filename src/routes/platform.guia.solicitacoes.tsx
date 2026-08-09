import { confirmDialog } from "@/hooks/useConfirm";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, X, Trash2, Loader2 } from "lucide-react";
import {
  listPromoRequests,
  markRequestPaid,
  rejectRequest,
  deletePromoRequest,
} from "@/lib/guia-admin.functions";
import { SLOT_KIND_LABELS, type GuiaPromoRequest } from "@/lib/guia-types";
import { brl } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/platform/guia/solicitacoes")({
  component: PlatformGuiaRequests,
});

const KEY = ["guia-admin", "requests"];

const statusMap: Record<GuiaPromoRequest["status"], { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending_payment: { label: "Aguardando pagamento", variant: "outline" },
  paid: { label: "Pago", variant: "default" },
  rejected: { label: "Rejeitado", variant: "destructive" },
};

function PlatformGuiaRequests() {
  const qc = useQueryClient();
  const { data: requests = [], isLoading } = useQuery({
    queryKey: KEY,
    queryFn: () => listPromoRequests(),
  });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: KEY });
    qc.invalidateQueries({ queryKey: ["guia-admin", "slots"] });
  };

  const pay = useMutation({
    mutationFn: (id: string) => markRequestPaid({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Pagamento confirmado. Slot criado no Guia."); },
    onError: (e: Error) => toast.error(e.message),
  });
  const reject = useMutation({
    mutationFn: (id: string) => rejectRequest({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Solicitação rejeitada."); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deletePromoRequest({ data: { id } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <h2 className="text-lg font-bold">Solicitações de destaque</h2>
          <p className="text-sm text-muted-foreground">
            Pedidos feitos pelos lojistas via <code>/admin/diretorio</code>. Ao marcar como pago, um slot correspondente é criado automaticamente no Guia.
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card><CardContent className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </CardContent></Card>
      ) : requests.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
          Nenhuma solicitação ainda.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const st = statusMap[r.status];
            return (
              <Card key={r.id}>
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">{r.tenantName}</p>
                      <Badge variant={st.variant}>{st.label}</Badge>
                      <Badge variant="outline">{SLOT_KIND_LABELS[r.slotKind]}</Badge>
                      <Badge variant="secondary">{r.durationDays} dias</Badge>
                    </div>
                    {r.note && <p className="mt-1 text-sm text-muted-foreground">{r.note}</p>}
                    {(r.productHref || r.productSlug || r.productId) && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <code className="max-w-full truncate rounded bg-muted px-2 py-0.5 text-xs">
                          {r.productHref ?? `/guia/produto/${r.productSlug ?? r.productId}`}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            const path = r.productHref ?? `/guia/produto/${r.productSlug ?? r.productId}`;
                            navigator.clipboard.writeText(`https://menuzin.app${path}`);
                            toast.success("Link do produto copiado.");
                          }}
                        >
                          <Copy className="mr-1 h-3 w-3" /> Copiar link
                        </Button>
                      </div>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Criado em {new Date(r.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-primary">{brl(r.amount)}</p>
                  </div>
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    {r.status === "pending_payment" && r.pixCode && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(r.pixCode!);
                          toast.success("Código PIX copiado.");
                        }}
                      >
                        <Copy className="mr-1 h-3 w-3" /> PIX
                      </Button>
                    )}
                    {r.status === "pending_payment" && (
                      <>
                        <Button size="sm" onClick={() => pay.mutate(r.id)}>
                          <Check className="mr-1 h-3 w-3" /> Marcar pago
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => reject.mutate(r.id)}>
                          <X className="mr-1 h-3 w-3" /> Rejeitar
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" onClick={async () => {
                      if (await confirmDialog({ title: "Excluir esta solicitação?", variant: "destructive", confirmText: "Excluir" })) {
                        remove.mutate(r.id);
                      }
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
