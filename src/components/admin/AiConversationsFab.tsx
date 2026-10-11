import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { Bot, Headset, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { listMyAgentConversations } from "@/lib/ai-agent.functions";
import { cn } from "@/lib/utils";

const ACTIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  return `há ${Math.floor(m / 60)} h`;
}

/** Atalho flutuante com as conversas ativas do Atendente IA. */
export function AiConversationsFab() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [open, setOpen] = useState(false);
  const hidden = pathname.startsWith("/admin/pdv") || pathname.startsWith("/admin/atendente-ia");
  const { data } = useQuery({
    queryKey: ["ai-agent-conversations"],
    queryFn: () => listMyAgentConversations(),
    refetchInterval: 15000,
    retry: false,
  });
  const active = (data ?? []).filter((c: any) =>
    c.status === "open" &&
    (c.handoff_status === "requested" || c.handoff_status === "human" || Date.now() - new Date(c.updated_at).getTime() < ACTIVE_WINDOW_MS),
  );
  if (hidden || active.length === 0) return null;
  const waiting = active.filter((c: any) => c.handoff_status === "requested").length;

  const go = (id: string) => {
    window.location.href = `/admin/atendente-ia?tab=conversas&conversa=${id}`;
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Conversas ativas do atendente IA: ${active.length}`}
        className={cn(
          "fixed bottom-24 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105",
          waiting > 0 && "animate-pulse ring-4 ring-destructive/50",
        )}
      >
        {waiting > 0 ? <Headset className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
        <span className={cn(
          "absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-bold",
          waiting > 0 ? "bg-destructive text-destructive-foreground" : "bg-background text-foreground border",
        )}>
          {active.length}
        </span>
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full max-w-sm p-0">
          <SheetHeader className="border-b p-4">
            <SheetTitle>Conversas ativas</SheetTitle>
          </SheetHeader>
          <ul className="divide-y overflow-y-auto">
            {active.map((c: any) => (
              <li key={c.id}>
                <button type="button" onClick={() => go(c.id)} className="flex w-full items-start gap-3 p-4 text-left hover:bg-muted/60">
                  <span className={cn(
                    "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full",
                    c.handoff_status === "requested" ? "bg-destructive/15 text-destructive" : c.handoff_status === "human" ? "bg-success/15 text-success" : "bg-primary/15 text-primary",
                  )}>
                    {c.handoff_status === "none" || !c.handoff_status ? <Bot className="h-5 w-5" /> : <Headset className="h-5 w-5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{c.customer_name || c.customer_phone || "Cliente"}</span>
                    <span className="block text-xs text-muted-foreground">
                      {c.handoff_status === "requested" ? "Pediu atendente humano" : c.handoff_status === "human" ? `Com ${c.handoff_staff_name || "atendente"}` : "Conversando com a IA"}
                      {c.order_number ? ` · Pedido #${c.order_number}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{ago(c.updated_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default X;
