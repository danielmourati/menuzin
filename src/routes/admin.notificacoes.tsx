import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { confirmDialog } from "@/hooks/useConfirm";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlanGate } from "@/components/subscription/PlanGate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, Send, Users, Ticket, Smartphone, AlertTriangle, Trash2, Loader2, Plus, RefreshCw, ShoppingBag, RotateCw, Pencil } from "lucide-react";
import { toast } from "sonner";
import { getPushStatsAdmin, createPushCampaign, dispatchPushCampaignNow, deletePushCampaign } from "@/lib/push-campaigns.functions";
import { listMyCoupons } from "@/lib/coupons.functions";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/notificacoes")({
  component: () => (
    <PlanGate min="pro" title="Notificações Push" featureLabel="Envio de Notificações Push para Clientes">
      <PushNotificationsPage />
    </PlanGate>
  ),
});

function PushNotificationsPage() {
  const qc = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [couponId, setCouponId] = useState<string | null>(null);
  const [targetType, setTargetType] = useState<"all" | "customers_with_orders">("all");
  const [customUrl, setCustomUrl] = useState("");

  const { data: statsData, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ["push-stats-admin"],
    queryFn: () => getPushStatsAdmin(),
  });

  const { data: couponsData } = useQuery({
    queryKey: ["my-coupons"],
    queryFn: async () => (await listMyCoupons()).coupons,
  });

  const coupons = (couponsData ?? []).filter((c) => c.active);

  const createMut = useMutation({
    mutationFn: () =>
      createPushCampaign({
        data: {
          id: editingId,
          title,
          body,
          couponId,
          targetType,
          url: customUrl || null,
        },
      }),
    onSuccess: () => {
      toast.success(editingId ? "Notificação atualizada com sucesso!" : "Notificação salva no rascunho!");
      qc.invalidateQueries({ queryKey: ["push-stats-admin"] });
      resetForm();
      setIsCreating(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao salvar campanha de notificação.");
    },
  });

  const dispatchMut = useMutation({
    mutationFn: (campaignId: string) =>
      dispatchPushCampaignNow({ data: { campaignId } }),
    onSuccess: (res) => {
      if (res.failed > 0 && res.success === 0) {
        toast.error(
          `Disparo realizado, mas ${res.failed} assinatura(s) foram recusadas pelo servidor de push. Peça ao cliente para reativar as notificações no navegador.${res.lastError ? ` Detalhe: ${String(res.lastError).slice(0, 180)}` : ""}`,
          { duration: 8000 }
        );
      } else {
        toast.success(
          `Envio concluído! ${res.success} mensagem(ns) entregue(s) com sucesso de ${res.total} tentativas.`
        );
      }
      qc.invalidateQueries({ queryKey: ["push-stats-admin"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao enviar notificação push.");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (campaignId: string) =>
      deletePushCampaign({ data: { campaignId } }),
    onSuccess: () => {
      toast.success("Campanha removida.");
      qc.invalidateQueries({ queryKey: ["push-stats-admin"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao remover campanha.");
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
    setCouponId(null);
    setTargetType("all");
    setCustomUrl("");
  };

  const handleEditCampaign = (camp: any) => {
    setEditingId(camp.id);
    setTitle(camp.title || "");
    setBody(camp.body || "");
    setCouponId(camp.coupon_id || null);
    setTargetType(camp.target_type || "all");
    setCustomUrl(camp.url || "");
    setIsCreating(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleCouponSelect = (id: string) => {
    if (id === "__none__") {
      setCouponId(null);
      return;
    }
    setCouponId(id);
    const found = coupons.find((c) => c.id === id);
    if (found) {
      if (!title) {
        setTitle(`🔥 Cupom ${found.code}: Desconto especial para você!`);
      }
      if (!body) {
        setBody(`Use o cupom ${found.code} no seu carrinho e aproveite essa oferta imperdível hoje.`);
      }
    }
  };

  const handleSimulateLocalPush = async () => {
    if (typeof window === "undefined") return;

    if (!("Notification" in window)) {
      toast.error("Seu navegador atual não possui suporte nativo a Notificações Web.");
      return;
    }

    try {
      let perm = Notification.permission;
      if (perm !== "granted") {
        perm = await Notification.requestPermission();
      }

      if (perm !== "granted") {
        toast.error("Permissão de notificação não foi concedida no seu navegador.");
        return;
      }

      const notifTitle = title || "🔥 Teste de Notificação Push!";
      const notifBody = body || "Esta é uma simulação de notificação enviada para o seu dispositivo.";

      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration("/sw-push.js") || await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(notifTitle, {
            body: notifBody,
            icon: "/icon-192.png",
            data: { url: window.location.href },
          });
          toast.success("Notificação enviada com sucesso para o seu navegador!");
          return;
        }
      }

      new Notification(notifTitle, {
        body: notifBody,
        icon: "/icon-192.png",
      });
      toast.success("Notificação enviada com sucesso!");
    } catch (err: any) {
      console.error("[SimulatePush] Erro:", err);
      toast.error(err.message || "Não foi possível disparar a notificação.");
    }
  };

  const subscriberCount = statsData?.subscriberCount ?? 0;
  const campaigns = statsData?.campaigns ?? [];

  return (
    <AdminLayout
      title="Notificações Push aos Clientes"
      action={
        <Button
          onClick={() => {
            resetForm();
            setIsCreating(true);
          }}
          className="gap-2 font-semibold shadow-xs"
        >
          <Plus className="h-4 w-4" /> Nova Notificação
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Banner Tabela Ausente (Se SQL pendente) */}
        {statsData?.tableMissing && (
          <Card className="border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-sm">Tabela de notificações push pendente no Supabase</h4>
                  <p>
                    Execute o script SQL da migração <code className="font-mono font-semibold">20260920200000_push_notifications.sql</code> no painel do Supabase para ativar este recurso.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* MÉTRICAS E CARDS */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card className="shadow-xs border border-border">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inscritos na Loja</p>
                <p className="text-2xl font-extrabold text-foreground">{subscriberCount}</p>
                <p className="text-[11px] text-muted-foreground">Clientes com push ativo no celular/PC</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Users className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border border-border">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mensagens Entregues</p>
                <p className="text-2xl font-extrabold text-foreground">{statsData?.totalSuccessMessages ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">Notificações recebidas nos navegadores</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Send className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border border-border">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Campanhas Criadas</p>
                <p className="text-2xl font-extrabold text-foreground">{campaigns.length}</p>
                <p className="text-[11px] text-muted-foreground">Notificações promocionais enviadas</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <Bell className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CRIADOR DE CAMPANHA / EDITOR */}
        {isCreating && (
          <Card className="border border-primary/30 shadow-md">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" /> {editingId ? "Editar Notificação Push" : "Nova Notificação Push"}
                  </CardTitle>
                  <CardDescription>
                    Configure a mensagem que será enviada diretamente aos celulares dos seus clientes.
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
                  Cancelar
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                {/* FORMULÁRIO DE CONFIGURAÇÃO */}
                <div className="space-y-5">
                  {/* Título */}
                  <div className="space-y-1.5">
                    <Label htmlFor="push-title" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Título da Notificação *
                    </Label>
                    <Input
                      id="push-title"
                      placeholder="Ex: 🔥 Cupom SEXTOU15: R$ 15 OFF no seu pedido!"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={60}
                      className="h-11 rounded-xl text-sm font-semibold"
                    />
                    <p className="text-[11px] text-muted-foreground text-right">{title.length}/60 caracteres</p>
                  </div>

                  {/* Mensagem */}
                  <div className="space-y-1.5">
                    <Label htmlFor="push-body" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Mensagem / Texto Principal *
                    </Label>
                    <Textarea
                      id="push-body"
                      placeholder="Ex: Aproveite 15% de desconto em qualquer pedido hoje! Use o cupom SEXTOU15 ao finalizar o carrinho."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      maxLength={150}
                      rows={3}
                      className="rounded-xl text-sm leading-relaxed"
                    />
                    <p className="text-[11px] text-muted-foreground text-right">{body.length}/150 caracteres</p>
                  </div>

                  {/* Vincular Cupom */}
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Ticket className="h-3.5 w-3.5 text-primary" /> Vincular Cupom de Desconto (Opcional)
                    </Label>
                    <Select value={couponId ?? "__none__"} onValueChange={handleCouponSelect}>
                      <SelectTrigger className="h-11 rounded-xl font-medium">
                        <SelectValue placeholder="Selecione um cupom para aplicar automaticamente..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum cupom vinculado</SelectItem>
                        {coupons.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            🏷️ Cupom {c.code} ({c.discount_type === "fixed" ? `R$ ${c.discount_value}` : `${c.discount_value}% OFF`})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Público Alvo */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <Label className="font-semibold text-xs uppercase tracking-wider text-muted-foreground block">
                      Público-Alvo
                    </Label>
                    <RadioGroup
                      value={targetType}
                      onValueChange={(val) => setTargetType(val as "all" | "customers_with_orders")}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                    >
                      <label className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                        targetType === "all" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:bg-muted/30"
                      }`}>
                        <RadioGroupItem value="all" className="mt-0.5" />
                        <div>
                          <p className="font-bold text-xs text-foreground flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-primary" /> Todos os inscritos
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Envia para todos os navegadores/dispositivos que autorizaram notificações.
                          </p>
                        </div>
                      </label>

                      <label className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                        targetType === "customers_with_orders" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:bg-muted/30"
                      }`}>
                        <RadioGroupItem value="customers_with_orders" className="mt-0.5" />
                        <div>
                          <p className="font-bold text-xs text-foreground flex items-center gap-1.5">
                            <ShoppingBag className="h-3.5 w-3.5 text-emerald-600" /> Apenas quem já comprou
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Filtra clientes inscritos que já realizaram ao menos 1 pedido na sua loja.
                          </p>
                        </div>
                      </label>
                    </RadioGroup>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => createMut.mutate()}
                      disabled={!title || !body || createMut.isPending}
                      className="rounded-xl font-semibold"
                    >
                      {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar como Rascunho
                    </Button>

                    <Button
                      type="button"
                      onClick={async () => {
                        if (!title || !body) return;
                        // Cria a campanha e dispara imediatamente
                        const res = await createMut.mutateAsync();
                        if (res?.campaign?.id) {
                          dispatchMut.mutate(res.campaign.id);
                        }
                      }}
                      disabled={!title || !body || createMut.isPending || dispatchMut.isPending}
                      className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                    >
                      {(createMut.isPending || dispatchMut.isPending) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Disparando...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" /> Disparar Notificação Agora ({subscriberCount} inscritos)
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* PRÉ-VISUALIZAÇÃO NO CELULAR */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-primary" /> Prévia no Celular do Cliente
                  </Label>
                  <div className="rounded-3xl border border-zinc-300 dark:border-zinc-800 bg-zinc-950 p-4 shadow-xl text-white space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-zinc-800 pb-2">
                      <span className="font-semibold text-zinc-200">Menuzin Delivery</span>
                      <span>Agora</span>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/30">
                          <Bell className="h-4 w-4" />
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className="font-bold text-xs leading-snug text-zinc-100 truncate">
                            {title || "🔥 Título da Notificação"}
                          </p>
                          <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-3">
                            {body || "Sua mensagem promocional ou aviso de cupom aparecerá aqui na tela do celular do cliente."}
                          </p>
                        </div>
                      </div>

                      {couponId && (
                        <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <Ticket className="h-3 w-3" /> Cupom Aplicado
                          </span>
                          <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                            {coupons.find((c) => c.id === couponId)?.code}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 space-y-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleSimulateLocalPush}
                      className="w-full h-10 rounded-xl text-xs font-bold gap-2 border border-border"
                    >
                      <Bell className="h-3.5 w-3.5 text-primary" /> Testar Notificação Neste Navegador
                    </Button>

                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed space-y-1">
                      <p className="font-bold flex items-center gap-1 text-amber-700 dark:text-amber-300">
                        📱 Observação sobre iPhone / iOS:
                      </p>
                      <p>
                        No iOS (iPhone/iPad), a Apple exige iOS 16.4+ e que o cliente adicione o site à <strong>Tela de Início</strong> (via menu Compartilhar do Safari ou Chrome) para autorizar notificações push em segundo plano.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* HISTÓRICO DE CAMPANHAS */}
        <Card className="shadow-xs border border-border">
          <CardHeader className="bg-muted/20 border-b border-border pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" /> Histórico de Campanhas
              </CardTitle>
              <CardDescription>
                Acompanhe o envio e os resultados das notificações push enviadas aos clientes.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8 gap-1.5 text-xs font-semibold">
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {statsLoading ? (
              <div className="py-12 flex items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" /> Carregando estatísticas...
              </div>
            ) : campaigns.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-3">
                <Bell className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="text-base font-medium">Nenhuma notificação enviada ainda.</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Clique no botão &quot;Nova Notificação&quot; para enviar cupons e mensagens promocionais aos seus clientes.
                </p>
                <Button onClick={() => setIsCreating(true)} variant="outline" size="sm" className="mt-2">
                  <Plus className="mr-1.5 h-4 w-4" /> Criar Primeira Notificação
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Notificação</TableHead>
                      <TableHead>Público-Alvo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Entregues / Tentativas</TableHead>
                      <TableHead>Data do Envio</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((camp: any) => {
                      const isDraft = camp.status === "draft";
                      const isSending = camp.status === "sending";
                      const isSent = camp.status === "sent";

                      return (
                        <TableRow key={camp.id}>
                          <TableCell>
                            <div className="space-y-0.5 max-w-xs sm:max-w-md">
                              <p className="font-bold text-sm text-foreground truncate">{camp.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{camp.body}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[11px] font-medium">
                              {camp.target_type === "customers_with_orders" ? "🛒 Já compraram" : "🌐 Todos os inscritos"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={isSent ? "default" : isSending ? "secondary" : "outline"}
                              className={isSent ? "bg-emerald-600 hover:bg-emerald-700" : isSending ? "bg-blue-600 text-white" : ""}
                            >
                              {isSent ? "Enviado" : isSending ? "Enviando..." : "Rascunho"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {isSent ? (
                              <div className="text-xs font-semibold">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{camp.success_count}</span>
                                <span className="text-muted-foreground"> / {camp.sent_count} entregues</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-medium">
                            {camp.sent_at ? formatDateTime(camp.sent_at) : formatDateTime(camp.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isDraft ? (
                                <Button
                                  size="sm"
                                  onClick={() => dispatchMut.mutate(camp.id)}
                                  disabled={dispatchMut.isPending}
                                  className="h-8 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  {dispatchMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                  Disparar
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    if (
                                      await confirmDialog({
                                        title: `Reenviar a notificação "${camp.title}"?`,
                                        description: `Esta mensagem será disparada novamente para os ${subscriberCount} clientes/dispositivos inscritos na sua loja.`,
                                        confirmText: "Reenviar Notificação",
                                        cancelText: "Cancelar",
                                      })
                                    ) {
                                      dispatchMut.mutate(camp.id);
                                    }
                                  }}
                                  disabled={dispatchMut.isPending}
                                  className="h-8 gap-1 text-xs font-semibold border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                                >
                                  {dispatchMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
                                  Reenviar
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditCampaign(camp)}
                                title="Editar notificação"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  if (
                                    await confirmDialog({
                                      title: `Excluir notificação "${camp.title}"?`,
                                      description: "Esta ação é permanente e a notificação será removida do histórico.",
                                      confirmText: "Excluir Notificação",
                                      cancelText: "Cancelar",
                                      variant: "destructive",
                                    })
                                  ) {
                                    deleteMut.mutate(camp.id);
                                  }
                                }}
                                title="Excluir"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* LISTA DE INSCRITOS DO TENANT */}
        <Card className="shadow-xs border border-border">
          <CardHeader className="bg-muted/20 border-b border-border pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Clientes & Dispositivos Inscritos ({subscriberCount})
            </CardTitle>
            <CardDescription>
              Lista dos aparelhos e clientes que autorizaram receber notificações push da sua loja.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {statsLoading ? (
              <div className="py-12 flex items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" /> Carregando inscritos...
              </div>
            ) : (statsData?.subscribers ?? []).length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="text-base font-medium">Nenhum cliente inscrito no momento.</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Quando os clientes acessarem seu catálogo no celular ou confirmarem um pedido, um aviso solicitará a permissão de notificações para envio de promoções e cupons.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Telefone / Cliente</TableHead>
                      <TableHead>Navegador / Dispositivo</TableHead>
                      <TableHead>Data de Inscrição</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(statsData?.subscribers ?? []).map((sub: any) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-semibold text-sm">
                          {sub.customer_phone ? (
                            <span className="text-foreground">{sub.customer_phone}</span>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">Não vinculado a pedido (Visitante)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={sub.user_agent}>
                          {sub.user_agent ? (
                            sub.user_agent.includes("iPhone") || sub.user_agent.includes("iPad") ? "📱 iOS Mobile" :
                            sub.user_agent.includes("Android") ? "📱 Android Mobile" :
                            sub.user_agent.includes("Chrome") ? "💻 Chrome Browser" :
                            sub.user_agent.includes("Firefox") ? "💻 Firefox Browser" :
                            "📱 Navegador Web"
                          ) : "Dispositivo Web"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-medium">
                          {formatDateTime(sub.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px]">
                            Push Ativo
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
