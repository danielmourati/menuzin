import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, MessageCircle } from "lucide-react";
import { PlatformLayout } from "@/routes/platform.dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { listSupportMessages, updateSupportMessage, type SupportMessage } from "@/lib/support.functions";

export const Route = createFileRoute("/platform/suporte")({ component: PlatformSupport });

const STATUS_LABEL: Record<string, string> = {
  nova: "Nova",
  andamento: "Em andamento",
  respondida: "Respondida",
};

function PlatformSupport() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["platform-support"],
    queryFn: () => listSupportMessages(),
  });

  const items = data?.items ?? [];

  return (
    <PlatformLayout title="Suporte">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Mensagens recebidas pelo formulário público de contato.
        </p>
        {isLoading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhuma mensagem por enquanto.</CardContent></Card>
        ) : (
          items.map((m) => <MessageCard key={m.id} m={m} onSaved={() => qc.invalidateQueries({ queryKey: ["platform-support"] })} />)
        )}
      </div>
    </PlatformLayout>
  );
}

function MessageCard({ m, onSaved }: { m: SupportMessage; onSaved: () => void }) {
  const [status, setStatus] = useState(m.status);
  const [note, setNote] = useState(m.internal_note ?? "");

  const mut = useMutation({
    mutationFn: async () =>
      updateSupportMessage({
        data: { id: m.id, status: status as "nova" | "andamento" | "respondida", internal_note: note },
      }),
    onSuccess: () => {
      toast.success("Mensagem atualizada.");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{m.subject}</p>
            <p className="text-sm text-muted-foreground">
              {m.name} · {new Date(m.created_at).toLocaleString("pt-BR")}
            </p>
          </div>
          <Badge variant={m.status === "nova" ? "default" : "secondary"}>{STATUS_LABEL[m.status] ?? m.status}</Badge>
        </div>

        <p className="whitespace-pre-wrap rounded-xl bg-muted/40 p-3 text-sm">{m.message}</p>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`}>
              <Mail className="mr-2 h-4 w-4" /> {m.email}
            </a>
          </Button>
          {m.whatsapp && (
            <Button asChild size="sm" variant="outline">
              <a href={`https://wa.me/55${m.whatsapp}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
              </a>
            </Button>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nova">Nova</SelectItem>
              <SelectItem value="andamento">Em andamento</SelectItem>
              <SelectItem value="respondida">Respondida</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota interna (opcional)"
            className="min-h-10"
            maxLength={1000}
          />
        </div>

        <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </CardContent>
    </Card>
  );
}
