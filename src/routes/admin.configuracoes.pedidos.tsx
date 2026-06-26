import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { useOrdersRealtime, playNotificationSound } from "@/hooks/useOrdersRealtime";
import { uploadTenantAudio } from "@/lib/storage";
import { updateMyTenant } from "@/lib/tenants.functions";
import { ArrowLeft, Volume2, Bell, AlertCircle, Play, Upload, Music, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/configuracoes/pedidos")({
  component: OrderSettingsPage,
});

// Limite generoso — o arquivo agora é hospedado no Storage, não no localStorage
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;

function OrderSettingsPage() {
  const { prefs, updatePrefs } = useNotificationPrefs();
  const { isSimulating, toggleSimulation, simulateNewOrder } = useOrdersRealtime();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleTestSound = () => {
    playNotificationSound();
    toast.success("Som de teste reproduzido!");
  };

  const handleManualSimulate = () => {
    simulateNewOrder();
    toast.success("Novo pedido simulado!");
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      toast.error("Selecione um arquivo de áudio válido (mp3, wav, ogg).");
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      toast.error(`Arquivo muito grande. Máximo ${Math.round(MAX_AUDIO_BYTES / 1024)}KB.`);
      return;
    }
    setUploading(true);
    try {
      const url = await uploadTenantAudio(file);
      await updateMyTenant({ data: { notification_sound_url: url, notification_sound_name: file.name } });
      updatePrefs({ customAlertDataUrl: url, customAlertName: file.name });
      toast.success(`Som "${file.name}" salvo. Disponível em qualquer navegador.`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Falha ao enviar o arquivo de áudio.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveCustom = async () => {
    setRemoving(true);
    try {
      await updateMyTenant({ data: { notification_sound_url: null, notification_sound_name: null } });
      updatePrefs({ customAlertDataUrl: null, customAlertName: null });
      toast.success("Som customizado removido. Voltando ao padrão.");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Falha ao remover o som.");
    } finally {
      setRemoving(false);
    }
  };




  return (
    <AdminLayout
      title="Configurações de Pedidos"
      action={
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/configuracoes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Painel de Alertas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Bell className="h-5 w-5 text-primary" /> Alertas e Notificações
            </CardTitle>
            <CardDescription>
              Configure como a área administrativa reage à chegada de novos pedidos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Som Ativado */}
            <div className="flex items-center justify-between rounded-xl border p-4 hover:bg-muted/10 transition">
              <div className="space-y-0.5">
                <Label htmlFor="sound-enabled" className="text-sm font-semibold">
                  Alerta Sonoro
                </Label>
                <p className="text-xs text-muted-foreground">
                  Tocar um som sinalizador quando um novo pedido for recebido.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestSound}
                  disabled={!prefs.soundEnabled}
                  className="h-8 text-xs font-semibold"
                >
                  <Volume2 className="mr-1 h-3.5 w-3.5" /> Testar
                </Button>
                <Switch
                  id="sound-enabled"
                  checked={prefs.soundEnabled}
                  onCheckedChange={(checked) => updatePrefs({ soundEnabled: checked })}
                />
              </div>
            </div>

            {/* Upload de som customizado */}
            <div className="rounded-xl border p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Music className="h-4 w-4 text-primary" /> Som Personalizado
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Envie um arquivo de áudio (mp3, wav, ogg — máx. 2MB). Fica salvo na sua loja e funciona em qualquer navegador.
                  </p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {prefs.customAlertDataUrl ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-muted/30 border rounded-lg p-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Music className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs font-medium truncate">
                      {prefs.customAlertName ?? "Som customizado"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={handleTestSound} className="h-8 text-xs" disabled={uploading || removing}>
                      <Volume2 className="mr-1 h-3.5 w-3.5" /> Testar
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleUploadClick} className="h-8 text-xs" disabled={uploading || removing}>
                      {uploading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1 h-3.5 w-3.5" />}
                      Trocar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleRemoveCustom} className="h-8 text-xs text-destructive hover:text-destructive" disabled={uploading || removing}>
                      {removing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <X className="mr-1 h-3.5 w-3.5" />}
                      Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUploadClick}
                  className="h-9 text-xs font-semibold"
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
                  {uploading ? "Enviando..." : "Enviar arquivo de áudio"}
                </Button>
              )}
            </div>




            {/* Toast Ativado */}
            <div className="flex items-center justify-between rounded-xl border p-4 hover:bg-muted/10 transition">
              <div className="space-y-0.5">
                <Label htmlFor="toast-enabled" className="text-sm font-semibold">
                  Notificação na Tela (Toast)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Exibir balão flutuante no canto superior direito com atalhos de ação rápida.
                </p>
              </div>
              <Switch
                id="toast-enabled"
                checked={prefs.toastEnabled}
                onCheckedChange={(checked) => updatePrefs({ toastEnabled: checked })}
              />
            </div>

            {/* Destaque Visual */}
            <div className="flex items-center justify-between rounded-xl border p-4 hover:bg-muted/10 transition">
              <div className="space-y-0.5">
                <Label htmlFor="highlight-new" className="text-sm font-semibold">
                  Destacar Novos Pedidos
                </Label>
                <p className="text-xs text-muted-foreground">
                  Aplicar borda pulsante vermelha e marcador luminoso em pedidos aguardando aceite.
                </p>
              </div>
              <Switch
                id="highlight-new"
                checked={prefs.highlightNew}
                onCheckedChange={(checked) => updatePrefs({ highlightNew: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Simulador de Pedidos para Demos */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Play className="h-5 w-5 text-primary" /> Simulador de Fluxo (Demos)
            </CardTitle>
            <CardDescription>
              Simule a atividade de clientes fazendo pedidos no catálogo digital.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="bg-card border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-semibold text-sm">Simulação Automática</h4>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Cria um pedido aleatório com status "Novo" no banco a cada 45 segundos para simular fluxo de clientes.
                </p>
              </div>
              <Switch
                checked={isSimulating}
                onCheckedChange={toggleSimulation}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <Button
                onClick={handleManualSimulate}
                className="w-full sm:w-auto font-bold bg-primary text-primary-foreground hover:bg-primary/95 shadow-md"
              >
                Simular Novo Pedido Agora
              </Button>
              
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-card border px-3 py-1.5 rounded-lg w-full sm:w-auto">
                <AlertCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Os pedidos simulados aparecem no painel e na aba do sino em tempo real.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
