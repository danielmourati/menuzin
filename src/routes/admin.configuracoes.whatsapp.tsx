import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SettingsBreadcrumb } from "@/components/admin/SettingsBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, ShieldCheck, CheckCircle2, XCircle, RefreshCw, Send, Zap, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { getEvolutionConfigStatus, sendEvolutionTestMessage } from "@/lib/whatsapp/whatsapp-config.functions";
import { maskPhone } from "@/lib/masks";
import { formatErrorMessage } from "@/lib/error-translator";

export const Route = createFileRoute("/admin/configuracoes/whatsapp")({
  component: WhatsappSettingsPage,
});

function WhatsappSettingsPage() {
  const [testNumber, setTestNumber] = useState("");
  const [testMessage, setTestMessage] = useState(
    "👋 Olá! Esta é uma mensagem de teste enviada via Evolution API no Menuzin.",
  );

  const { data: status, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["evolution-status"],
    queryFn: () => getEvolutionConfigStatus(),
    refetchInterval: 30_000,
  });

  const sendTestMutation = useMutation({
    mutationFn: () =>
      sendEvolutionTestMessage({
        data: {
          number: testNumber,
          message: testMessage,
        },
      }),
    onSuccess: () => {
      toast.success("Mensagem de teste enviada com sucesso via Evolution API!");
    },
    onError: (err: Error) => {
      toast.error(formatErrorMessage(err, "Falha ao enviar mensagem de teste."));
    },
  });

  const handleTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (testNumber.replace(/\D/g, "").length < 10) {
      return toast.error("Informe um número de telefone com DDD válido.");
    }
    if (!testMessage.trim()) {
      return toast.error("Digite a mensagem de teste.");
    }
    sendTestMutation.mutate();
  };

  const isConnected = status?.connected ?? false;
  const connectionState = status?.state ?? "close";

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl mx-auto pb-10">
        <SettingsBreadcrumb current="WhatsApp API" />

        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              Integração WhatsApp API (Evolution API)
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Envio automatizado de códigos OTP, atualizações de pedidos e despacho de entregadores sem risco de banimento.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="shrink-0"
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1.5" />
            )}
            Atualizar Status
          </Button>
        </div>

        {/* Banner de Aviso de Manutenção Provisória */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                Módulo Desabilitado Provisoriamente
              </h4>
              <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                A integração via WhatsApp API (Evolution API) está temporariamente suspensa para melhorias de infraestrutura.
                O envio automático de OTPs e notificações por API direta está desabilitado. O sistema continuará operando com fallback manual via links <code className="font-mono bg-amber-500/20 px-1 rounded">wa.me</code> quando necessário.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card de Status da Instância */}
        <Card className="border-amber-500/30 overflow-hidden">
          <CardHeader className="bg-amber-500/10 border-b border-amber-500/20 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Status da Instância Evolution API</CardTitle>
                  <CardDescription className="text-xs">
                    Instância de mensageria em manutenção
                  </CardDescription>
                </div>
              </div>

              <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-500/10 gap-1 px-3 py-1 text-xs font-bold">
                <XCircle className="h-3.5 w-3.5 text-amber-600" /> Desabilitado Provisoriamente
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border space-y-1">
                <span className="text-muted-foreground font-medium">Instância:</span>
                <p className="font-mono font-bold text-sm">{status?.instance || "menuzin"}</p>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border space-y-1">
                <span className="text-muted-foreground font-medium">Status API:</span>
                <p className="font-bold text-sm text-amber-600 dark:text-amber-400">
                  ⏸ Pausado Provisoriamente
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border space-y-1">
                <span className="text-muted-foreground font-medium">Fallback (Plano B):</span>
                <p className="font-bold text-sm text-blue-600 dark:text-blue-400">
                  ✔ Ativo (Link wa.me)
                </p>
              </div>
            </div>

            {status?.error && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200">
                <strong>Observação:</strong> {status.error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card de Disparo de Teste */}
        <Card className="opacity-75">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Send className="h-4 w-4 text-muted-foreground" /> Enviar Mensagem de Teste (Indisponível)
            </CardTitle>
            <CardDescription className="text-xs">
              O disparo de mensagens de teste está desabilitado enquanto o módulo estiver em manutenção.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleTestSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Número de WhatsApp com DDD *
                </Label>
                <Input
                  id="test-phone"
                  placeholder="(86) 99999-9999"
                  value={testNumber}
                  onChange={(e) => setTestNumber(maskPhone(e.target.value))}
                  className="h-11 rounded-xl bg-background max-w-sm"
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="test-msg" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Conteúdo da Mensagem *
                </Label>
                <Textarea
                  id="test-msg"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="rounded-xl bg-background min-h-[90px]"
                  disabled
                />
              </div>

              <Button
                type="submit"
                disabled
                className="h-11 px-6 bg-muted text-muted-foreground font-bold rounded-xl cursor-not-allowed"
              >
                <Send className="mr-2 h-4 w-4" /> Módulo Indisponível
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Card Informativo Anti-Banimento */}
        <Card className="bg-muted/30 border-muted">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="h-5 w-5" />
            </div>
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-sm text-foreground">
                Manutenção Preventiva
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                Assim que a manutenção for concluída, a simulação de digitação humana (
                <code className="text-amber-600 font-bold">presence: composing</code>) e o atraso randômico inteligente voltarão a operar automaticamente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
