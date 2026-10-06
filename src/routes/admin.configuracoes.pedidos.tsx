import { useEffect, useRef, useState } from "react";
import { isIOSDevice, getBluefyPref, setBluefyPref, bluefyLink } from "@/lib/bluefy";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SettingsBreadcrumb } from "@/components/admin/SettingsBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { useOrdersRealtime, playNotificationSound } from "@/hooks/useOrdersRealtime";
import { uploadTenantAudio } from "@/lib/storage";
import { updateMyTenant, getMyTenant } from "@/lib/tenants.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWebPush } from "@/hooks/useWebPush";
import { CalendarClock, ArrowLeft, Volume2, Bell, Upload, Music, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/configuracoes/pedidos")({
  component: OrderSettingsPage,
});

// Limite generoso — o arquivo agora é hospedado no Storage, não no localStorage
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;

function OrderSettingsPage() {
  const { prefs, updatePrefs } = useNotificationPrefs();
  useOrdersRealtime();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  
  const { data: tenantData } = useQuery({
    queryKey: ["my-tenant"],
    queryFn: () => getMyTenant()
  });
  
  const push = useWebPush();
  const [isIOS, setIsIOS] = useState(false);
  const [bluefyOn, setBluefyOn] = useState(false);
  useEffect(() => {
    setIsIOS(isIOSDevice());
    setBluefyOn(getBluefyPref());
  }, []);

  const handlePushSubscribe = async () => {
    if (!tenantData?.tenant?.id) {
      toast.error("Erro ao identificar o tenant atual.");
      return;
    }
    const success = await push.subscribe(tenantData.tenant.id);
    if (success) {
      toast.success("Inscrição para notificações em segundo plano realizada!");
    }
  };

  const handleTestSound = () => {
    playNotificationSound();
    toast.success("Som de teste reproduzido!");
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
      backTo="/admin/configuracoes"
    >
      <SettingsBreadcrumb current="Pedidos" />
      <div className="max-w-2xl mx-auto space-y-6">
        <SchedulingCard tenant={tenantData?.tenant as SchedTenant | undefined} />
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
            
            {/* Notificações Push (Plano de Fundo) */}
            <div className="flex items-center justify-between rounded-xl border p-4 hover:bg-muted/10 transition">
              <div className="space-y-0.5">
                <Label htmlFor="push-enabled" className="text-sm font-semibold flex items-center gap-1.5">
                  <Bell className="h-4 w-4 text-primary" /> Notificações em Segundo Plano
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receba alertas no sistema operacional mesmo se o navegador estiver em segundo plano ou a tela estiver desligada.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {push.isSupported ? (
                  push.isSubscribed ? (
                    <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">Inscrito</span>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="default"
                      className="h-8 text-xs font-semibold"
                      disabled={push.isLoading || push.permission === 'denied'}
                      onClick={handlePushSubscribe}
                    >
                      {push.isLoading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : push.permission === 'denied' ? "Bloqueado no navegador" : "Ativar"}
                    </Button>
                  )
                ) : (
                  <span className="max-w-[220px] text-right text-xs text-muted-foreground">{push.unsupportedReason || "Navegador não suporta"}</span>
                )}
              </div>
            </div>

            {isIOS && (
              <div className="flex items-center justify-between rounded-xl border p-4 hover:bg-muted/10 transition">
                <div className="space-y-0.5">
                  <Label htmlFor="open-bluefy" className="text-sm font-semibold">
                    Sempre abrir no Bluefy
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Ao tocar no aviso de um pedido, abrir o pedido no navegador Bluefy (para usar a impressora Bluetooth).
                  </p>
                </div>
                <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold"
                  onClick={() => { window.location.href = bluefyLink(`${window.location.origin}/admin/pedidos`); }}
                >
                  Testar
                </Button>
                <Switch
                  id="open-bluefy"
                  checked={bluefyOn}
                  onCheckedChange={(c) => { setBluefyPref(c); setBluefyOn(c); }}
                />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </AdminLayout>
  );
}

type SchedTenant = { scheduling_enabled?: boolean | null; scheduling_slot_minutes?: number | null; scheduling_days_ahead?: number | null; plan?: string };

function SchedulingCard({ tenant }: { tenant?: SchedTenant }) {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [slot, setSlot] = useState(10);
  const [days, setDays] = useState(7);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!tenant) return;
    setEnabled(!!tenant.scheduling_enabled);
    setSlot(tenant.scheduling_slot_minutes ?? 10);
    setDays(tenant.scheduling_days_ahead ?? 7);
  }, [tenant]);
  const save = async () => {
    setSaving(true);
    try {
      await updateMyTenant({ data: { scheduling_enabled: enabled, scheduling_slot_minutes: slot, scheduling_days_ahead: days } });
      await qc.invalidateQueries({ queryKey: ["my-tenant"] });
      toast.success("Agendamento salvo.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <CalendarClock className="h-5 w-5 text-primary" /> Pedidos agendados
        </CardTitle>
        <CardDescription>
          O cliente escolhe o dia e a faixa de horário para receber ou retirar, inclusive com a loja fechada. Os horários seguem o seu horário de funcionamento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="sched-on">Permitir pedidos agendados</Label>
          <Switch id="sched-on" checked={enabled} onCheckedChange={setEnabled} />
        </div>
        {enabled && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Intervalo entre horários</Label>
              <select value={slot} onChange={(e) => setSlot(Number(e.target.value))} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm">
                {[10, 15, 20, 30, 60].map((n) => <option key={n} value={n}>{n} min</option>)}
              </select>
            </div>
            <div>
              <Label>Dias à frente</Label>
              <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm">
                {[0, 1, 2, 3, 5, 7, 14].map((n) => <option key={n} value={n}>{n === 0 ? "Só hoje" : `${n} dias`}</option>)}
              </select>
            </div>
          </div>
        )}
        <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
      </CardContent>
    </Card>
  );
}
