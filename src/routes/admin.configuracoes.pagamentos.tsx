import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MercadoPagoStatus } from "@/components/payment/MercadoPagoStatus";
import {
  getStorePaymentSettings,
  disconnectMercadoPago,
  updatePaymentSettings,
  testPayment,
  saveMpCredentials,
} from "@/lib/payment-service";
import { SettingsBreadcrumb } from "@/components/admin/SettingsBreadcrumb";
import type { StorePaymentSettingsSafe, MpConnectionStatus } from "@/lib/payment-types";
import { toast } from "sonner";
import { AlertCircle, CreditCard, Landmark, Wallet, DollarSign, HelpCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useActiveTenantId } from "@/lib/active-tenant";
import { useTenantPlan, UpgradeNotice } from "@/lib/plan-features";

import { PlanGate } from "@/components/subscription/PlanGate";

export const Route = createFileRoute("/admin/configuracoes/pagamentos")({
  component: () => (
    <PlanGate min="start" title="Pagamentos" featureLabel="Configurações de pagamento" backTo="/admin/configuracoes">
      <AdminPaymentSettingsPage />
    </PlanGate>
  ),
});


function AdminPaymentSettingsPage() {
  const { profile } = useAuth();
  const activeTenantId = useActiveTenantId();
  const storeId = activeTenantId ?? profile?.tenant_id ?? "";
  const { can } = useTenantPlan();
  const canMP = can("mercadoPago");
  const [settings, setSettings] = useState<StorePaymentSettingsSafe | null>(null);
  const [mpStatus, setMpStatus] = useState<MpConnectionStatus>("loading");
  const [loading, setLoading] = useState(true);
  const [connectedVia, setConnectedVia] = useState<"oauth" | "manual" | undefined>(undefined);

  // Chaves Pix manuais
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState<"cpf" | "cnpj" | "email" | "phone" | "random">("email");
  const [pixReceiver, setPixReceiver] = useState("");

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    async function loadSettings() {
      try {
        const data = await getStorePaymentSettings(storeId);
        if (cancelled) return;
        if (data) {
          setSettings(data);
          setMpStatus(data.mp_connected ? "connected" : "disconnected");
          if (data.mp_connected) setConnectedVia("manual");
          setPixKey(data.pix_manual_key || "");
          setPixKeyType(data.pix_manual_key_type || "email");
          setPixReceiver(data.pix_manual_receiver || "");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setMpStatus("error");
          toast.error("Erro ao carregar configurações de pagamento.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadSettings();
    return () => { cancelled = true; };
  }, [storeId]);

  const handleToggleManual = async (key: "cash_enabled" | "pix_manual_enabled" | "card_on_delivery_enabled", val: boolean) => {
    if (!settings) return;
    try {
      const updated = await updatePaymentSettings(storeId, { [key]: val });
      setSettings(updated);
      toast.success("Método de pagamento atualizado.");
    } catch (err) {
      toast.error("Erro ao atualizar configurações.");
    }
  };

  const handleToggleOnline = async (key: "pix_enabled" | "credit_card_enabled" | "debit_card_enabled", val: boolean) => {
    if (!settings) return;
    if (!settings.mp_connected) {
      toast.error("Conecte sua conta do Mercado Pago primeiro.");
      return;
    }
    try {
      const updated = await updatePaymentSettings(storeId, { [key]: val });
      setSettings(updated);
      toast.success("Método de pagamento online atualizado.");
    } catch (err) {
      toast.error("Erro ao atualizar configurações.");
    }
  };

  const handleSavePixManual = async () => {
    try {
      const updated = await updatePaymentSettings(storeId, {
        pix_manual_key: pixKey,
        pix_manual_key_type: pixKeyType,
        pix_manual_receiver: pixReceiver,
      });
      setSettings(updated);
      toast.success("Chave Pix manual salva com sucesso.");
    } catch (err) {
      toast.error("Erro ao salvar chave Pix.");
    }
  };

  const handleConnectMP = async () => {
    // Conexão OAuth automática ainda não disponível — instrui o lojista a usar credenciais manuais.
    toast.info(
      "Conexão automática (OAuth) em breve. Use a aba 'Credenciais Manuais' para conectar sua conta agora."
    );
  };

  const handleConnectMPManual = async (
    publicKey: string,
    accessToken: string,
    mpLiveMode: boolean
  ) => {
    setMpStatus("connecting");
    try {
      const result = await saveMpCredentials(storeId, publicKey, accessToken, mpLiveMode);
      if (!result.success) {
        setMpStatus("disconnected");
        toast.error(result.message);
        return;
      }
      const data = await getStorePaymentSettings(storeId);
      if (data) {
        setSettings(data);
        setMpStatus("connected");
        setConnectedVia("manual");
        toast.success(result.message);
      }
    } catch (err) {
      setMpStatus("error");
      toast.error("Erro ao salvar credenciais do Mercado Pago.");
    }
  };

  const handleDisconnectMP = async () => {
    setMpStatus("connecting");
    try {
      await disconnectMercadoPago(storeId);
      const data = await getStorePaymentSettings(storeId);
      if (data) {
        setSettings(data);
        setMpStatus("disconnected");
        setConnectedVia(undefined);
        toast.success("Mercado Pago desconectado.");
      }
    } catch (err) {
      setMpStatus("error");
      toast.error("Erro ao desconectar conta.");
    }
  };

  const handleTestPay = async () => {
    try {
      const res = await testPayment(storeId);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error("Ocorreu um erro no teste de pagamento.");
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Configurações de Pagamento">
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando configurações...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Configurações de Pagamento"
      action={
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/configuracoes">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Link>
        </Button>
      }
    >
      <SettingsBreadcrumb current="Pagamento" />
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header descritivo */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Defina como seus clientes podem pagar pelos pedidos no catálogo. Você pode receber de forma manual no momento da entrega/retirada ou de forma online e imediata.
          </p>
        </div>

        {/* 1. MÓDULO MERCADO PAGO ONLINE — somente plano Pro */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <Landmark className="h-5 w-5 text-[#009EE3]" /> Mercado Pago Online
          </h2>

          {!canMP ? (
            <UpgradeNotice
              title="Pagamento online no Plano Pro"
              description="A integração com o Mercado Pago (Pix online, crédito e débito) está disponível no Plano Pro. No Plano Start você continua recebendo pedidos via WhatsApp e pode usar Pix manual, dinheiro e cartão na entrega."
            />
          ) : (
            <>
              <MercadoPagoStatus
                status={mpStatus}
                onConnect={handleConnectMP}
                onDisconnect={handleDisconnectMP}
                onTestPayment={handleTestPay}
                onConnectManual={handleConnectMPManual}
                expiresAt={settings?.mp_token_expires_at}
                connectedVia={connectedVia}
                connectedPublicKey={settings?.mp_public_key}
                accountKind={settings?.mp_account_kind}
                liveModeSaved={settings?.mp_live_mode}
                mpUserId={settings?.mp_user_id}
              />

              {settings?.mp_connected && (
                <Card className="border border-border/80 shadow-[var(--shadow-soft)] animate-fade-in">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold">Métodos Online Ativos</CardTitle>
                    <CardDescription>
                      Habilite ou desabilite os fluxos de checkout transparente do Mercado Pago.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-3.5">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                          <Landmark className="h-4 w-4 text-primary" /> Pix Online
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          QR Code e Copia e Cola gerados na hora com confirmação automática.
                        </p>
                      </div>
                      <Switch
                        checked={settings.pix_enabled}
                        onCheckedChange={(checked) => handleToggleOnline("pix_enabled", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between border-b pb-3.5">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                          <CreditCard className="h-4 w-4 text-primary" /> Cartão de Crédito Online
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Permite que o cliente pague com cartão direto no catálogo com parcelamento.
                        </p>
                      </div>
                      <Switch
                        checked={settings.credit_card_enabled}
                        onCheckedChange={(checked) => handleToggleOnline("credit_card_enabled", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                          <CreditCard className="h-4 w-4 text-primary" /> Cartão de Débito Online
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Permite compras à vista usando o cartão de débito virtual.
                        </p>
                      </div>
                      <Switch
                        checked={settings.debit_card_enabled}
                        onCheckedChange={(checked) => handleToggleOnline("debit_card_enabled", checked)}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* 2. MÓDULO MÉTODOS MANUAIS */}
        <div className="space-y-4 pt-2">
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" /> Métodos de Pagamento Manuais
          </h2>

          <Card className="border border-border/80 shadow-[var(--shadow-soft)]">
            <CardContent className="p-5 space-y-5">
              {/* Dinheiro */}
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-emerald-600" /> Dinheiro em Espécie
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Cliente paga em cédulas no momento da entrega ou retirada.
                  </p>
                </div>
                <Switch
                  checked={settings?.cash_enabled}
                  onCheckedChange={(checked) => handleToggleManual("cash_enabled", checked)}
                />
              </div>

              {/* Cartão Maquininha */}
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-slate-600" /> Cartão na entrega (Maquininha)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    O entregador leva a máquina ou o cliente passa o cartão no balcão.
                  </p>
                </div>
                <Switch
                  checked={settings?.card_on_delivery_enabled}
                  onCheckedChange={(checked) => handleToggleManual("card_on_delivery_enabled", checked)}
                />
              </div>

              {/* Pix Manual */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <Wallet className="h-4 w-4 text-cyan-600" /> Pix Manual (Transferência)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Exibe sua chave Pix no final da compra e o cliente envia comprovante.
                    </p>
                  </div>
                  <Switch
                    checked={settings?.pix_manual_enabled}
                    onCheckedChange={(checked) => handleToggleManual("pix_manual_enabled", checked)}
                  />
                </div>

                {settings?.pix_manual_enabled && (
                  <div className="mt-2 grid gap-3 rounded-2xl border border-dashed bg-muted/10 p-4 sm:grid-cols-3 animate-fade-in">
                    <div className="space-y-1.5">
                      <Label htmlFor="pixType" className="text-xs font-semibold">Tipo de chave</Label>
                      <Select
                        value={pixKeyType}
                        onValueChange={(val: any) => setPixKeyType(val)}
                      >
                        <SelectTrigger id="pixType" className="h-10 bg-card rounded-xl">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">E-mail</SelectItem>
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="cnpj">CNPJ</SelectItem>
                          <SelectItem value="phone">Celular</SelectItem>
                          <SelectItem value="random">Chave Aleatória</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="pixKey" className="text-xs font-semibold">Chave Pix</Label>
                      <Input
                        id="pixKey"
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value)}
                        placeholder="Insira a chave Pix"
                        className="h-10 bg-card rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="pixReceiver" className="text-xs font-semibold">Nome do Recebedor</Label>
                      <Input
                        id="pixReceiver"
                        value={pixReceiver}
                        onChange={(e) => setPixReceiver(e.target.value)}
                        placeholder="Nome completo ou Razão Social"
                        className="h-10 bg-card rounded-xl"
                      />
                    </div>

                    <div className="sm:col-span-3 flex justify-end pt-1">
                      <Button
                        size="sm"
                        onClick={handleSavePixManual}
                        className="h-9 px-4 rounded-xl text-xs font-semibold"
                      >
                        Salvar Chave Pix
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
