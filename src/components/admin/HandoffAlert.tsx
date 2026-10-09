import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { listMyHandoffCount } from "@/lib/ai-agent.functions";

/** Avisa no painel quando um cliente pede atendimento humano no chat da IA. */
export function HandoffAlert() {
  const navigate = useNavigate();
  const seen = useRef<Set<string> | null>(null);
  const { data } = useQuery({ queryKey: ["ai-handoffs"], queryFn: () => listMyHandoffCount(), refetchInterval: 15000, retry: false });
  useEffect(() => {
    if (!data) return;
    if (!seen.current) { seen.current = new Set(data.map((d) => d.id)); return; }
    for (const d of data) {
      if (seen.current.has(d.id)) continue;
      seen.current.add(d.id);
      try {
        const ctx = new AudioContext(); const o = ctx.createOscillator(); const g = ctx.createGain();
        o.frequency.value = 880; g.gain.value = 0.15; o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.35);
      } catch { /* sem áudio */ }
      toast.warning(`${d.customer_name || "Um cliente"} pediu atendimento humano`, {
        duration: 15000,
        action: { label: "Responder", onClick: () => navigate({ to: "/admin/atendente-ia", search: { tab: "conversas" } as never }) },
      });
    }
  }, [data, navigate]);
  return null;
}
