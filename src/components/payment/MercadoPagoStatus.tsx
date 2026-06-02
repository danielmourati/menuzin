import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  HelpCircle,
  Key,
  Zap,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { MpConnectionStatus } from "@/lib/payment-types";

interface MercadoPagoStatusProps {
  status: MpConnectionStatus;
  onConnect: () => void;
  onDisconnect: () => void;
  onTestPayment: () => void;
  onConnectManual: (publicKey: string, accessToken: string, liveMode: boolean) => Promise<void>;
  expiresAt?: string;
  connectedPublicKey?: string; // masked key shown when connected via manual
  connectedVia?: "oauth" | "manual"; // how was it connected
  /** Tipo da conta MP conectada — usado para alertar incoerência com mp_live_mode. */
  accountKind?: "test_user" | "production";
  /** Modo configurado no banco — usado em conjunto com accountKind. */
  liveModeSaved?: boolean;
  /** ID da conta MP, para exibir junto do tipo. */
  mpUserId?: string;
}

export function MercadoPagoStatus({
  status,
  onConnect,
  onDisconnect,
  onTestPayment,
  onConnectManual,
  expiresAt,
  connectedPublicKey,
  connectedVia,
  accountKind,
  liveModeSaved,
  mpUserId,
}: MercadoPagoStatusProps) {
  const [testing, setTesting] = useState(false);

  // Manual credentials form
  const [publicKey, setPublicKey] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [liveMode, setLiveMode] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleTest = async () => {
    setTesting(true);
    await onTestPayment();
    setTesting(false);
  };

  const validateForm = (): boolean => {
    if (!publicKey.trim()) {
      setValidationError("Informe a Public Key.");
      return false;
    }
    if (!accessToken.trim()) {
      setValidationError("Informe o Access Token.");
      return false;
    }
    // Validação real é feita pelo servidor contra a API do Mercado Pago.
    // Não impomos prefixo aqui pois MP emite credenciais com formatos variados.
    setValidationError(null);
    return true;
  };

  const handleSaveManual = async () => {
    if (!validateForm()) return;
    setSavingManual(true);
    try {
      await onConnectManual(publicKey, accessToken, liveMode);
      setPublicKey("");
      setAccessToken("");
    } finally {
      setSavingManual(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const mpLogo = (
    <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#009EE3]/10 text-[#009EE3] shrink-0">
      <svg className="h-7 w-7" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M18 33C26.2843 33 33 26.2843 33 18C33 9.71573 26.2843 3 18 3C9.71573 3 3 9.71573 3 18C3 26.2843 9.71573 33 18 33Z"
          fill="#009EE3"
        />
        <path
          d="M24.75 13.5H20.25V24.75H24.75V13.5ZM15.75 13.5H11.25V24.75H15.75V13.5Z"
          fill="white"
        />
      </svg>
    </div>
  );

  const statusBadge = (
    <>
      {status === "connected" && (
        <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 px-2.5 py-1 flex gap-1 items-center font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Conectado
        </Badge>
      )}
      {status === "disconnected" && (
        <Badge className="bg-muted text-muted-foreground px-2.5 py-1 border border-border flex gap-1 items-center font-medium">
          <XCircle className="h-3.5 w-3.5" />
          Desconectado
        </Badge>
      )}
      {status === "expired" && (
        <Badge className="bg-amber-500/15 text-amber-600 border border-amber-500/20 px-2.5 py-1 flex gap-1 items-center font-medium animate-pulse">
          <AlertTriangle className="h-3.5 w-3.5" />
          Token Expirado
        </Badge>
      )}
      {status === "error" && (
        <Badge className="bg-destructive/15 text-destructive border border-destructive/20 px-2.5 py-1 flex gap-1 items-center font-medium">
          <AlertTriangle className="h-3.5 w-3.5" />
          Erro de Conexão
        </Badge>
      )}
      {status === "connecting" && (
        <Badge className="bg-blue-500/15 text-blue-600 border border-blue-500/20 px-2.5 py-1 flex gap-1 items-center font-medium">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Conectando...
        </Badge>
      )}
    </>
  );

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] transition-all">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {mpLogo}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-card-foreground">Mercado Pago Checkout</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px]">
                    <p className="text-xs">
                      Aceite pagamentos online direto no catálogo e receba o valor instantaneamente na sua conta.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xs text-muted-foreground">Checkout Transparente via Pix e Cartão</p>
          </div>
        </div>
        <div>{statusBadge}</div>
      </div>

      {/* Body */}
      <div className="mt-5 rounded-xl border border-muted bg-muted/20 p-4">
        {/* ─── CONNECTED ─── */}
        {status === "connected" ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                <strong className="text-foreground">
                  Os valores dos pedidos online cairão diretamente na sua conta Mercado Pago.
                </strong>{" "}
                A plataforma não cobra comissão por transação.
              </p>
            </div>

            {/* Account kind + mismatch warning */}
            {accountKind && (
              <div
                className={`rounded-lg border px-3.5 py-2.5 text-xs ${
                  (liveModeSaved && accountKind === "test_user") ||
                  (!liveModeSaved && accountKind === "production")
                    ? "border-destructive/40 bg-destructive/5 text-destructive"
                    : "border-emerald-500/30 bg-emerald-500/5 text-muted-foreground"
                }`}
              >
                <span className="font-medium text-foreground">Conta MP: </span>
                {accountKind === "test_user" ? "Usuário de Teste" : "Produção"}
                {mpUserId ? ` (#${mpUserId})` : ""}
                {liveModeSaved && accountKind === "test_user" && (
                  <div className="mt-1.5 font-medium">
                    ⚠ Modo Produção ativo com credenciais de Teste — pagamentos serão rejeitados pelo MP.
                  </div>
                )}
                {!liveModeSaved && accountKind === "production" && (
                  <div className="mt-1.5 font-medium">
                    ⚠ Modo Teste ativo com credenciais de Produção — o MP vai rejeitar com "Unauthorized use of live credentials". Reconecte com credenciais de um{" "}
                    <a
                      href="https://www.mercadopago.com.br/developers/panel/test-users"
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-semibold"
                    >
                      Usuário de Teste
                    </a>
                    .
                  </div>
                )}
              </div>
            )}

            {/* Connection method info */}
            {connectedVia === "manual" && connectedPublicKey && (
              <div className="rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5 px-3.5 py-2.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Chave conectada: </span>
                <code className="font-mono">{connectedPublicKey}</code>
                <span className="ml-2 text-emerald-600 font-medium">(via credenciais manuais)</span>
              </div>
            )}
            {connectedVia === "oauth" && expiresAt && (
              <p className="text-xs text-muted-foreground">
                Sua conexão é válida até{" "}
                <span className="font-semibold">{formatDate(expiresAt)}</span> e será renovada automaticamente.
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                onClick={onDisconnect}
              >
                Desconectar Mercado Pago
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 text-xs font-semibold"
                disabled={testing}
                onClick={handleTest}
              >
                {testing ? (
                  <>
                    <RefreshCw className="mr-1.5 h-3 w-3 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Testar pagamento"
                )}
              </Button>
            </div>
          </div>
        ) : status === "expired" ? (
          /* ─── EXPIRED ─── */
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              A conexão com sua conta expirou por motivos de segurança. Por favor, reconecte para reativar os
              pagamentos online.
            </p>
            <Button
              size="sm"
              className="h-9 bg-[#009EE3] hover:bg-[#0087c2] text-white font-semibold text-xs px-4"
              onClick={onConnect}
            >
              Reconectar conta Mercado Pago
            </Button>
          </div>
        ) : status === "error" ? (
          /* ─── ERROR ─── */
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Ocorreu um erro ao validar suas credenciais com o Mercado Pago. Tente desconectar e conectar novamente.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-9 bg-[#009EE3] hover:bg-[#0087c2] text-white font-semibold text-xs px-4"
                onClick={onConnect}
              >
                Tentar novamente
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                onClick={onDisconnect}
              >
                Desconectar
              </Button>
            </div>
          </div>
        ) : (
          /* ─── DISCONNECTED / CONNECTING ─── */
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Conecte sua conta Mercado Pago para aceitar Pix e cartão diretamente no catálogo. Escolha o método
              de conexão:
            </p>

            <Tabs defaultValue="oauth" className="w-full">
              <TabsList className="h-9 rounded-lg bg-muted/60 p-1 w-full grid grid-cols-2">
                <TabsTrigger value="oauth" className="rounded-md text-xs font-semibold gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  Conexão Automática (OAuth)
                </TabsTrigger>
                <TabsTrigger value="manual" className="rounded-md text-xs font-semibold gap-1.5">
                  <Key className="h-3.5 w-3.5" />
                  Credenciais Manuais
                </TabsTrigger>
              </TabsList>

              {/* ── OAuth Tab ── */}
              <TabsContent value="oauth" className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Autorize diretamente com sua conta Mercado Pago. O token de acesso é gerado e renovado
                  automaticamente pelo nosso servidor — você não precisa copiar nenhuma chave.
                </p>
                <Button
                  className="h-10 bg-[#009EE3] hover:bg-[#0087c2] text-white font-semibold text-sm px-5 rounded-xl shadow-sm transition-all"
                  disabled={status === "connecting"}
                  onClick={onConnect}
                >
                  {status === "connecting" ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Aguardando autorização...
                    </>
                  ) : (
                    "Conectar minha conta Mercado Pago"
                  )}
                </Button>
              </TabsContent>

              {/* ── Manual Credentials Tab ── */}
              <TabsContent value="manual" className="mt-4 space-y-4">
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                  <strong>⚠ Atenção:</strong> O <strong>Access Token</strong> é uma credencial secreta. Nunca o
                  compartilhe. Ele é criptografado pelo servidor antes de ser armazenado.
                </div>

                <div className="space-y-3">
                  {/* Public Key */}
                  <div className="space-y-1.5">
                    <Label htmlFor="mp-public-key" className="text-xs font-semibold">
                      Public Key
                    </Label>
                    <Input
                      id="mp-public-key"
                      value={publicKey}
                      onChange={(e) => {
                        setPublicKey(e.target.value);
                        setValidationError(null);
                      }}
                      placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="h-10 bg-card rounded-xl font-mono text-xs"
                      autoComplete="off"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Encontre em: Mercado Pago → Seu Negócio → Configurações → Credenciais de produção
                    </p>
                  </div>

                  {/* Access Token */}
                  <div className="space-y-1.5">
                    <Label htmlFor="mp-access-token" className="text-xs font-semibold">
                      Access Token{" "}
                      <span className="text-muted-foreground font-normal">(secreto — nunca exibido novamente)</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="mp-access-token"
                        type={showToken ? "text" : "password"}
                        value={accessToken}
                        onChange={(e) => {
                          setAccessToken(e.target.value);
                          setValidationError(null);
                        }}
                        placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        className="h-10 bg-card rounded-xl font-mono text-xs pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showToken ? "Ocultar token" : "Exibir token"}
                      >
                        {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Live Mode Switch */}
                  <div className="flex items-center justify-between rounded-lg border border-dashed bg-muted/10 px-3.5 py-3">
                    <div>
                      <p className="text-xs font-semibold">Modo Produção (Live)</p>
                      <p className="text-[11px] text-muted-foreground">
                        {liveMode
                          ? "Transações reais. Use credenciais da sua conta real do Mercado Pago."
                          : "Modo Teste. Use credenciais de um Usuário de Teste criado no painel do MP."}
                      </p>
                    </div>
                    <Switch
                      id="mp-live-mode"
                      checked={liveMode}
                      onCheckedChange={setLiveMode}
                    />
                  </div>

                  {/* Test mode explainer */}
                  {!liveMode && (
                    <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 px-3.5 py-2.5 text-[11px] text-muted-foreground leading-relaxed">
                      <strong className="text-foreground">Para testar com cartões e Pix de sandbox</strong> você
                      precisa usar as credenciais de um <strong>Usuário de Teste</strong> do MP, não da sua conta
                      real. Crie um em{" "}
                      <a
                        href="https://www.mercadopago.com.br/developers/panel/test-users"
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-semibold text-blue-600"
                      >
                        Contas de teste
                      </a>{" "}
                      e copie as credenciais dele aqui. Caso contrário o MP retornará{" "}
                      <code className="font-mono">Unauthorized use of live credentials</code>.
                    </div>
                  )}


                  {/* Validation Error */}
                  {validationError && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {validationError}
                    </p>
                  )}

                  <Button
                    className="w-full h-10 bg-[#009EE3] hover:bg-[#0087c2] text-white font-semibold text-sm rounded-xl shadow-sm transition-all"
                    disabled={savingManual}
                    onClick={handleSaveManual}
                  >
                    {savingManual ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Salvando credenciais...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Salvar e Conectar
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
