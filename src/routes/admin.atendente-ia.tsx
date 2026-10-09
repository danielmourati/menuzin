import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlanGate } from "@/components/subscription/PlanGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ChefHat } from "lucide-react";
import { toast } from "sonner";
import {
  getMyAgentSettings, saveMyAgentSettings, listMyAgentConversations, getMyAgentConversationMessages,
} from "@/lib/ai-agent.functions";

export const Route = createFileRoute("/admin/atendente-ia")({
  head: () => ({
    meta: [
      { title: "Atendente IA — Menuzin" },
      { name: "description", content: "Configure o atendente com IA que recebe pedidos conversando no cardápio da loja." },
      { property: "og:title", content: "Atendente IA — Menuzin" },
      { property: "og:description", content: "Pedidos por conversa direto para a cozinha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PlanGate min="pro" title="Atendente IA" featureLabel="Atendente IA">
      <AdminLayout title="Atendente IA">
        <Tabs defaultValue="config" className="space-y-4">
          <TabsList>
            <TabsTrigger value="config">Configurações</TabsTrigger>
            <TabsTrigger value="conversas">Conversas</TabsTrigger>
          </TabsList>
          <TabsContent value="config"><SettingsTab /></TabsContent>
          <TabsContent value="conversas"><ConversationsTab /></TabsContent>
        </Tabs>
      </AdminLayout>
    </PlanGate>
  ),
});

function SettingsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["ai-agent-settings"], queryFn: () => getMyAgentSettings() });
  const [form, setForm] = useState({ enabled: false, agent_name: "Zinho", tone: "descontraido" as "descontraido" | "formal", greeting: "", extra_instructions: "" });
  useEffect(() => {
    if (data) setForm({ enabled: data.enabled, agent_name: data.agent_name, tone: data.tone as "descontraido" | "formal", greeting: data.greeting, extra_instructions: data.extra_instructions });
  }, [data]);
  const save = useMutation({
    mutationFn: () => saveMyAgentSettings({ data: form }),
    onSuccess: () => { toast.success("Atendente salvo!"); qc.invalidateQueries({ queryKey: ["ai-agent-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ChefHat className="h-5 w-5 text-primary" /> Pedidos por conversa</CardTitle>
        <CardDescription>
          Seus clientes tocam em "Pedir conversando" no cardápio e fazem o pedido escrevendo. O atendente usa seu cardápio, cupons e itens em falta,
          monta o resumo e só envia para a cozinha depois que o cliente confirma. Os preços sempre vêm do seu cardápio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-xl border p-3">
          <div>
            <p className="font-medium">Atendente ligado</p>
            <p className="text-xs text-muted-foreground">Mostra o botão "Pedir conversando" na sua loja.</p>
          </div>
          <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Nome do atendente</Label>
            <Input value={form.agent_name} maxLength={40} onChange={(e) => setForm({ ...form, agent_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Jeito de falar</Label>
            <div className="flex gap-2">
              {(["descontraido", "formal"] as const).map((t) => (
                <Button key={t} type="button" variant={form.tone === t ? "default" : "outline"} className="flex-1" onClick={() => setForm({ ...form, tone: t })}>
                  {t === "descontraido" ? "Descontraído" : "Formal"}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Mensagem de boas-vindas</Label>
          <Input value={form.greeting} maxLength={300} placeholder="Oi! Sou o Zinho 👋 O que vai ser hoje?" onChange={(e) => setForm({ ...form, greeting: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Recados para o atendente</Label>
          <Textarea rows={4} maxLength={1500} value={form.extra_instructions}
            placeholder="Ex.: Não fazemos troca de recheio. Sempre ofereça o suco de laranja natural."
            onChange={(e) => setForm({ ...form, extra_instructions: e.target.value })} />
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
        </Button>
      </CardContent>
    </Card>
  );
}

function ConversationsTab() {
  const { data, isLoading } = useQuery({ queryKey: ["ai-agent-conversations"], queryFn: () => listMyAgentConversations(), refetchInterval: 30000 });
  const [selected, setSelected] = useState<string | null>(null);
  const msgs = useQuery({
    queryKey: ["ai-agent-conv", selected],
    queryFn: () => getMyAgentConversationMessages({ data: { id: selected! } }),
    enabled: !!selected,
  });
  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
  if (!data?.length) return <p className="text-sm text-muted-foreground">Nenhuma conversa ainda.</p>;
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="space-y-2">
        {data.map((c) => (
          <button key={c.id} onClick={() => setSelected(c.id)}
            className={`w-full rounded-xl border p-3 text-left text-sm transition hover:border-primary ${selected === c.id ? "border-primary bg-primary/5" : "bg-card"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{c.customer_name || "Cliente"}</span>
              {c.status === "ordered" ? <Badge>Pedido #{c.order_number ?? "—"}</Badge> : <Badge variant="outline">Sem pedido</Badge>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {c.customer_phone || "sem WhatsApp"} · {new Date(c.updated_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </p>
          </button>
        ))}
      </div>
      <Card>
        <CardContent className="max-h-[70vh] space-y-2 overflow-y-auto p-4">
          {!selected ? <p className="text-sm text-muted-foreground">Escolha uma conversa.</p>
            : msgs.isLoading ? <Loader2 className="h-5 w-5 animate-spin" />
            : (msgs.data ?? []).filter((m) => m.text).map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{m.text}</div>
              </div>
            ))}
          {selected && data.find((c) => c.id === selected)?.order_id && (
            <Link to="/admin/pedidos" className="block pt-2 text-xs text-primary underline">Ver nos pedidos</Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
