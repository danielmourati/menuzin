import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Printer, Save, AlertTriangle, Plug, HelpCircle, CheckCircle2, XCircle, Download, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import {
  getMyPrinterSettings, saveMyPrinterSettings,
} from "@/lib/printer-settings.functions";
import {
  DEFAULT_PRINTER_SETTINGS, columnsFor, type PrinterSettings,
} from "@/lib/printer-types";
import { getMyTenant } from "@/lib/tenants.functions";
import { buildReceiptPreviewText } from "@/lib/receipt-preview";
import {
  ensureQzConnected, listQzPrintersWithDefault, printQzTextTest, QzNotRunningError,
  downloadQzCertificate, downloadQzWindowsInstaller, fetchQzCertificate,
  type QzPrinter,
} from "@/lib/qz-tray";
import { QzInstallGuide } from "@/components/printer/QzInstallGuide";
import { QzDiagnosticsModal, type QzConnectionAttempt } from "@/components/printer/QzDiagnosticsModal";

export const Route = createFileRoute("/admin/configuracoes/impressora")({
  component: PrinterSettingsPage,
});

function PrinterSettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["printer-settings"],
    queryFn: () => getMyPrinterSettings(),
  });
  const { data: tenantData } = useQuery({
    queryKey: ["my-tenant"],
    queryFn: () => getMyTenant(),
    staleTime: 60_000,
  });

  const [form, setForm] = useState<PrinterSettings>(DEFAULT_PRINTER_SETTINGS);
  useEffect(() => {
    if (data?.settings) setForm(data.settings);
  }, [data]);

  const cols = columnsFor(form.paper_width);

  const saveMut = useMutation({
    mutationFn: () => saveMyPrinterSettings({ data: form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["printer-settings"] });
      toast.success("Configurações da impressora salvas");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof PrinterSettings>(k: K, v: PrinterSettings[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const tenant = tenantData?.tenant as
    | { name?: string; whatsapp?: string; address?: string; social?: { instagram?: string } }
    | null
    | undefined;

  const previewText = useMemo(
    () =>
      buildReceiptPreviewText(form, {
        storeName: tenant?.name,
        storeAddress: tenant?.address,
        storePhone: tenant?.whatsapp,
        storeInstagram: tenant?.social?.instagram,
        storePixKey: undefined,
      }),
    [form, tenant],
  );

  const browserSupportsBluetooth = typeof navigator !== "undefined" && "bluetooth" in navigator;
  const browserSupportsUsb = typeof navigator !== "undefined" && "usb" in navigator;

  const [qzBusy, setQzBusy] = useState(false);
  const [qzPrinters, setQzPrinters] = useState<QzPrinter[]>([]);
  const [qzDefaultPrinter, setQzDefaultPrinter] = useState<string | null>(null);
  const [qzStatus, setQzStatus] = useState<"unknown" | "connected" | "offline">("unknown");

  // Persistência por tenant (localStorage já é por máquina/navegador).
  const tenantId = (tenantData?.tenant as { id?: string } | null | undefined)?.id ?? null;
  const trustStorageKey = tenantId ? `qz:trust:${tenantId}` : "qz:trust:default";
  const lastAttemptStorageKey = tenantId ? `qz:last-attempt:${tenantId}` : "qz:last-attempt:default";

  const [qzTrustState, setQzTrustState] = useState<"unknown" | "trusted" | "prompted">("unknown");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = window.localStorage.getItem(trustStorageKey);
    setQzTrustState(v === "prompted" || v === "trusted" ? v : "unknown");
  }, [trustStorageKey]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (qzTrustState === "unknown") window.localStorage.removeItem(trustStorageKey);
    else window.localStorage.setItem(trustStorageKey, qzTrustState);
  }, [qzTrustState, trustStorageKey]);
  const [printerInputMode, setPrinterInputMode] = useState<"select" | "manual">("select");
  const [guideOpen, setGuideOpen] = useState(false);
  const [diagOpen, setDiagOpen] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<QzConnectionAttempt | null>(null);
  // Hidrata última tentativa do tenant atual
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(lastAttemptStorageKey);
    if (!raw) { setLastAttempt(null); return; }
    try {
      const parsed = JSON.parse(raw) as Omit<QzConnectionAttempt, "at"> & { at: string };
      setLastAttempt({ ...parsed, at: new Date(parsed.at) });
    } catch { setLastAttempt(null); }
  }, [lastAttemptStorageKey]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!lastAttempt) { window.localStorage.removeItem(lastAttemptStorageKey); return; }
    window.localStorage.setItem(lastAttemptStorageKey, JSON.stringify({ ...lastAttempt, at: lastAttempt.at.toISOString() }));
  }, [lastAttempt, lastAttemptStorageKey]);

  type TestStep = { label: string; status: "pending" | "ok" | "err"; detail?: string };
  const [testSteps, setTestSteps] = useState<TestStep[] | null>(null);
  const [testBusy, setTestBusy] = useState(false);

  // Status do cert do servidor — para alertar quando ainda for o cert demo.
  const { data: qzCert, refetch: refetchQzCert } = useQuery({
    queryKey: ["qz-cert"],
    queryFn: () => fetchQzCertificate(),
    staleTime: 60_000,
  });
  const isDemoCert = !!qzCert?.subjectCN && /QZ Industries/i.test(qzCert.subjectCN);
  const serverCertReady = !!qzCert?.configured && !isDemoCert;

  type CertTone = "ok" | "warn" | "err";
  const certBadge: { label: string; tone: CertTone; tooltip: string } = !qzCert
    ? { label: "Verificando…", tone: "warn", tooltip: "Consultando cert do servidor." }
    : !qzCert.configured
      ? { label: "Cert não configurado", tone: "err", tooltip: qzCert.error || "QZ_CERT_PEM/QZ_PRIVATE_KEY_PEM ausentes." }
      : isDemoCert
        ? { label: "Cert: demo", tone: "err", tooltip: `CN=${qzCert.subjectCN} — substitua por um cert próprio.` }
        : { label: `Cert: ${qzCert.subjectCN}`, tone: "ok", tooltip: `CN=${qzCert.subjectCN} · assinatura RSA-SHA512 ativa.` };

  const handleQzError = (e: unknown) => {
    if (e instanceof QzNotRunningError) {
      setQzStatus("offline");
      setGuideOpen(true);
      toast.error(e.message, {
        action: { label: "Como instalar", onClick: () => setGuideOpen(true) },
      });
      return;
    }
    toast.error((e as Error).message || "Erro ao se comunicar com o QZ Tray.");
  };

  const handleDetectQz = async () => {
    setQzBusy(true);
    const startedAt = performance.now();
    try {
      // 1) Valida o cert do servidor ANTES de tentar conectar — se for demo
      //    ou estiver ausente, o prompt "Action Required" é inevitável.
      const fresh = await refetchQzCert();
      const cert = fresh.data;
      if (!cert?.configured) {
        setQzTrustState("unknown");
        toast.error("Servidor sem cert do QZ Tray. Configure QZ_CERT_PEM/QZ_PRIVATE_KEY_PEM.", {
          action: { label: "Diagnóstico", onClick: () => setDiagOpen(true) },
        });
        setLastAttempt({
          at: new Date(), ok: false, action: "Detectar (cert)",
          error: cert?.error || "Cert do servidor não configurado.",
        });
        return;
      }
      if (cert.subjectCN && /QZ Industries/i.test(cert.subjectCN)) {
        setQzTrustState("unknown");
        toast.error("Cert demo detectado no servidor — substitua QZ_CERT_PEM/QZ_PRIVATE_KEY_PEM por um par próprio.", {
          action: { label: "Diagnóstico", onClick: () => setDiagOpen(true) },
        });
        setLastAttempt({
          at: new Date(), ok: false, action: "Detectar (cert)",
          error: "Cert demo QZ Industries em uso — Action Required é inevitável.",
        });
        return;
      }

      // 2) Conecta — mede a duração para inferir se houve prompt manual.
      const connectStart = performance.now();
      await ensureQzConnected();
      const connectMs = performance.now() - connectStart;
      const prompted = connectMs > 2000;
      setQzTrustState(prompted ? "prompted" : "trusted");

      const { printers, defaultPrinter } = await listQzPrintersWithDefault();
      setQzPrinters(printers);
      setQzDefaultPrinter(defaultPrinter);
      setQzStatus("connected");
      setLastAttempt({
        at: new Date(), ok: true,
        durationMs: Math.round(performance.now() - startedAt),
        action: `Detectar (${printers.length} impressora(s))${prompted ? " · prompt manual" : ""}`,
      });

      if (prompted) {
        toast.warning(
          `Conectado em ${Math.round(connectMs)}ms — provavelmente o "Action Required" apareceu. Rode o instalador como administrador para suprimir.`,
          { action: { label: "Baixar instalador", onClick: () => void handleDownloadInstaller() }, duration: 8000 },
        );
      } else if (printers.length === 0) {
        toast.warning("Nenhuma impressora encontrada.");
      } else {
        toast.success(`QZ Tray conectado · ${printers.length} impressora(s) · ${Math.round(connectMs)}ms (sem prompt).`);
        const preferred = defaultPrinter || printers[0]?.name;
        if (!form.printer_name && preferred) set("printer_name", preferred);
        setPrinterInputMode("select");
      }
    } catch (e) {
      setLastAttempt({
        at: new Date(), ok: false,
        durationMs: Math.round(performance.now() - startedAt),
        action: "Detectar",
        error: (e as Error).message,
      });
      handleQzError(e);
    } finally {
      setQzBusy(false);
    }
  };

  const [certBusy, setCertBusy] = useState(false);
  const handleDownloadCert = async () => {
    setCertBusy(true);
    try {
      await downloadQzCertificate();
      toast.success("cert.pem baixado. Coloque-o na pasta de instalação do QZ Tray.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCertBusy(false);
    }
  };

  const [installerBusy, setInstallerBusy] = useState(false);
  const handleDownloadInstaller = async () => {
    setInstallerBusy(true);
    try {
      await downloadQzWindowsInstaller();
      toast.success("Instalador baixado. Clique direito → Executar como administrador.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setInstallerBusy(false);
    }
  };

  const handleTestPrint = async () => {
    setQzBusy(true);
    const startedAt = performance.now();
    try {
      await printQzTextTest(form.printer_name, previewText);
      setQzStatus("connected");
      setLastAttempt({
        at: new Date(), ok: true,
        durationMs: Math.round(performance.now() - startedAt),
        action: `Teste de impressão${form.printer_name ? ` → ${form.printer_name}` : ""}`,
      });
      toast.success("Teste de impressão enviado com sucesso.");
    } catch (e) {
      setLastAttempt({
        at: new Date(), ok: false,
        durationMs: Math.round(performance.now() - startedAt),
        action: "Teste de impressão",
        error: (e as Error).message,
      });
      handleQzError(e);
    } finally {
      setQzBusy(false);
    }
  };

  return (
    <AdminLayout
      title="Impressora de Cupom"
      action={
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {/* Status do QZ Tray */}
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Status do QZ Tray</CardTitle>
                  <span
                    title={certBadge.tooltip}
                    className={
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium " +
                      (certBadge.tone === "ok"
                        ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                        : certBadge.tone === "warn"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : "bg-destructive/10 text-destructive")
                    }
                  >
                    {certBadge.tone === "ok" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : certBadge.tone === "warn" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {certBadge.label}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setDiagOpen(true)}>
                    <Stethoscope className="mr-1.5 h-4 w-4" /> Diagnóstico
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setGuideOpen(true)}>
                    <HelpCircle className="mr-1.5 h-4 w-4" /> Como instalar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    {qzStatus === "connected" ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>
                          Conectado
                          {qzTrustState === "trusted"
                            ? " — sem prompts."
                            : qzTrustState === "prompted"
                              ? " — mas exigiu confirmação manual."
                              : "."}
                        </span>
                      </>
                    ) : qzStatus === "offline" ? (
                      <>
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span>QZ Tray não encontrado. Instale e abra o aplicativo.</span>
                      </>
                    ) : (
                      <>
                        <Plug className="h-4 w-4 text-muted-foreground" />
                        <span>Clique em <strong>Detectar</strong> para verificar.</span>
                      </>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={handleDetectQz} disabled={qzBusy} className="ml-auto">
                    {qzBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plug className="mr-1.5 h-4 w-4" />}
                    Detectar
                  </Button>
                </div>

                {qzTrustState === "prompted" && !isDemoCert && (
                  <div className="space-y-2 rounded-md border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">O QZ Tray pediu confirmação nesta máquina.</div>
                        <p className="mt-0.5">
                          Baixe o <strong>instalador v2</strong> abaixo e rode como <strong>administrador</strong>.
                          Ele agora grava o certificado no caminho correto
                          (<code>%PROGRAMDATA%\qz\data\certificates\allowed.pem</code>) e remove o cert de
                          <code> blocked.pem</code> caso você tenha clicado em "Block" antes.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pl-6">
                      <Button size="sm" onClick={handleDownloadInstaller} disabled={installerBusy}>
                        {installerBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
                        Baixar instalador v2
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setQzTrustState("unknown")}>
                        Dispensar aviso
                      </Button>
                    </div>
                    <details className="pl-6">
                      <summary className="cursor-pointer select-none font-medium">
                        Se o aviso continuar após rodar o instalador, remova o bloqueio manualmente
                      </summary>
                      <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                        <li>Clique no ícone do QZ Tray na bandeja do Windows (ao lado do relógio).</li>
                        <li>Abra <strong>Advanced → Site Manager</strong>.</li>
                        <li>Na aba <strong>Blocked</strong>, selecione a entrada do Menuzin e clique em <strong>Remove</strong>.</li>
                        <li>Feche e abra o QZ Tray novamente; volte aqui e clique em <strong>Detectar</strong>.</li>
                      </ol>
                    </details>
                  </div>
                )}

                {isDemoCert && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-xs text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Certificado de demonstração ativo no servidor.</div>
                      <p className="mt-0.5">
                        O QZ Tray recusa esse cert permanentemente — o prompt "Action Required"
                        sempre aparece. Atualize <code>QZ_CERT_PEM</code> e <code>QZ_PRIVATE_KEY_PEM</code> com um par próprio.
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-lg border bg-muted/40 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="text-sm">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">Configurar confiança permanente (Windows)</div>
                        {serverCertReady ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Cert próprio: {qzCert?.subjectCN}
                          </span>
                        ) : null}
                      </div>
                      <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
                        <li>Baixe o instalador abaixo.</li>
                        <li>Clique direito → <strong>Executar como administrador</strong>.</li>
                        <li>Volte aqui e clique em <strong>Detectar</strong>. O prompt não deve mais aparecer.</li>
                      </ol>
                    </div>
                    <Button size="sm" onClick={handleDownloadInstaller} disabled={installerBusy || isDemoCert}>
                      {installerBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
                      Baixar instalador
                    </Button>
                  </div>
                </div>

                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer select-none">Instalação manual (avançado / macOS / Linux)</summary>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={handleDownloadCert} disabled={certBusy}>
                      {certBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
                      Baixar cert.pem
                    </Button>
                  </div>
                </details>
              </CardContent>
            </Card>

            {/* Bloco 1 — Impressora */}
            <Card>
              <CardHeader><CardTitle className="text-base">Impressora</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Label>Nome da impressora</Label>
                    {qzPrinters.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPrinterInputMode((m) => (m === "select" ? "manual" : "select"))}
                        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                      >
                        {printerInputMode === "select" ? "Digitar manualmente" : "Escolher da lista"}
                      </button>
                    )}
                  </div>
                  {qzPrinters.length > 0 && printerInputMode === "select" ? (
                    <Select
                      value={form.printer_name || ""}
                      onValueChange={(v) => set("printer_name", v)}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Selecione a impressora detectada" />
                      </SelectTrigger>
                      <SelectContent>
                        {qzPrinters.map((p) => (
                          <SelectItem key={p.name} value={p.name}>
                            {p.name}{p.isDefault ? " (padrão)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={form.printer_name}
                      onChange={(e) => set("printer_name", e.target.value)}
                      placeholder={qzDefaultPrinter || "Ex: Balcão"}
                      className="mt-1.5"
                    />
                  )}
                  {qzPrinters.length === 0 && qzStatus !== "connected" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Clique em <strong>Detectar</strong> acima para listar impressoras do sistema.
                    </p>
                  )}
                </div>
                <div>
                  <Label>Modelo</Label>
                  <Input
                    value={form.printer_model}
                    onChange={(e) => set("printer_model", e.target.value)}
                    placeholder="ESC/POS compatível"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Tipo de conexão</Label>
                  <Select
                    value={form.connection_type}
                    onValueChange={(v) => set("connection_type", v as PrinterSettings["connection_type"])}
                  >
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="browser">QZ Tray — Impressão local (recomendado)</SelectItem>
                      <SelectItem value="bluetooth">Bluetooth</SelectItem>
                      <SelectItem value="usb">USB</SelectItem>
                      <SelectItem value="network">Rede / IP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Perfil ESC/POS</Label>
                  <Select
                    value={form.escpos_profile}
                    onValueChange={(v) => set("escpos_profile", v as PrinterSettings["escpos_profile"])}
                  >
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="generic">Genérico ESC/POS</SelectItem>
                      <SelectItem value="mini_bt_58">Mini Bluetooth 58mm</SelectItem>
                      <SelectItem value="generic_80">80mm Genérica</SelectItem>
                      <SelectItem value="elgin_i8_i9">ELGIN i8 / i9 compatível</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(form.connection_type === "bluetooth" || form.connection_type === "usb") && (
                  <div className="md:col-span-2 flex items-start gap-2 rounded-md border border-amber-300/50 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-100">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      Impressão direta via {form.connection_type === "bluetooth" ? "Bluetooth" : "USB"} depende de suporte do navegador
                      (Web {form.connection_type === "bluetooth" ? "Bluetooth" : "USB"}) ou de um agente local.{" "}
                      {form.connection_type === "bluetooth" && !browserSupportsBluetooth &&
                        "Seu navegador atual não expõe Web Bluetooth — será usado o fallback de impressão do sistema."}
                      {form.connection_type === "usb" && !browserSupportsUsb &&
                        "Seu navegador atual não expõe WebUSB — será usado o fallback de impressão do sistema."}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bloco 2 — Papel */}
            <Card>
              <CardHeader><CardTitle className="text-base">Papel</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(["58mm", "80mm"] as const).map((w) => (
                    <Button
                      key={w}
                      type="button"
                      variant={form.paper_width === w ? "default" : "outline"}
                      onClick={() => set("paper_width", w)}
                    >
                      {w}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Largura: <strong>{form.paper_width}</strong> · Colunas calculadas: <strong>{cols}</strong>
                </p>
              </CardContent>
            </Card>

            {/* Bloco 3 — Layout do cupom */}
            <Card>
              <CardHeader><CardTitle className="text-base">Layout do cupom</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label>Tamanho da fonte</Label>
                    <Select
                      value={form.font_size}
                      onValueChange={(v) => set("font_size", v as PrinterSettings["font_size"])}
                    >
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="compact">Compacta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Separador</Label>
                    <Select
                      value={form.separator_char}
                      onValueChange={(v) => set("separator_char", v)}
                    >
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-">Traços ( - )</SelectItem>
                        <SelectItem value="=">Iguais ( = )</SelectItem>
                        <SelectItem value=".">Pontos ( . )</SelectItem>
                        <SelectItem value="*">Asteriscos ( * )</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo de corte</Label>
                    <Select
                      value={form.cut_type}
                      onValueChange={(v) => set("cut_type", v as PrinterSettings["cut_type"])}
                    >
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem corte</SelectItem>
                        <SelectItem value="partial">Corte parcial</SelectItem>
                        <SelectItem value="full">Corte total</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Linhas em branco no final</Label>
                    <Input
                      type="number" min={0} max={10}
                      value={form.feed_lines}
                      onChange={(e) => set("feed_lines", Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <Toggle label="Negrito em títulos" value={form.use_bold_titles} onChange={(v) => set("use_bold_titles", v)} />
                  <Toggle label="Fonte dupla no total" value={form.use_double_total} onChange={(v) => set("use_double_total", v)} />
                  <Toggle label="Exibir nome da loja" value={form.show_store_name} onChange={(v) => set("show_store_name", v)} />
                  <Toggle label="Exibir endereço" value={form.show_address} onChange={(v) => set("show_address", v)} />
                  <Toggle label="Exibir CNPJ/CPF" value={form.show_document} onChange={(v) => set("show_document", v)} />
                  <Toggle label="Exibir WhatsApp" value={form.show_whatsapp} onChange={(v) => set("show_whatsapp", v)} />
                  <Toggle label="Exibir PIX" value={form.show_pix} onChange={(v) => set("show_pix", v)} />
                  <Toggle label="Exibir Instagram" value={form.show_instagram} onChange={(v) => set("show_instagram", v)} />
                  <Toggle label="Exibir mensagem de agradecimento" value={form.show_thank_message} onChange={(v) => set("show_thank_message", v)} />
                </div>

                {form.show_thank_message && (
                  <div>
                    <Label>Mensagem de agradecimento</Label>
                    <Input
                      value={form.thank_message}
                      onChange={(e) => set("thank_message", e.target.value)}
                      maxLength={120}
                      className="mt-1.5"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bloco 4 — Teste / Prévia */}
          <Card className="lg:sticky lg:top-4 self-start">
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Prévia · {form.paper_width}</CardTitle>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={handleDetectQz} disabled={qzBusy}>
                  <Plug className="mr-1.5 h-4 w-4" /> Detectar
                </Button>
                <Button size="sm" onClick={handleTestPrint} disabled={qzBusy}>
                  {qzBusy ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Printer className="mr-1.5 h-4 w-4" />
                  )}
                  Testar impressão
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {qzPrinters.length > 0 && (
                <div>
                  <Label className="text-xs">Impressora QZ Tray</Label>
                  <Select
                    value={form.printer_name || ""}
                    onValueChange={(v) => set("printer_name", v)}
                  >
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione a impressora" /></SelectTrigger>
                    <SelectContent>
                      {qzPrinters.map((p) => (
                        <SelectItem key={p.name} value={p.name}>
                          {p.name}{p.isDefault ? " (padrão)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div
                className="receipt-preview mx-auto"
                style={{
                  background: "#fff",
                  color: "#111",
                  fontFamily: '"Courier New", Courier, monospace',
                  fontSize: form.font_size === "compact" ? "12px" : "13px",
                  lineHeight: 1.35,
                  whiteSpace: "pre",
                  overflowX: "auto",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  maxWidth: form.paper_width === "58mm" ? "320px" : "440px",
                  maxHeight: "70vh",
                }}
              >
                {previewText}
              </div>

              <p className="text-xs text-muted-foreground">
                Prévia em texto puro · {columnsFor(form.paper_width)} colunas. A impressão real é enviada via QZ Tray para a impressora selecionada.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <QzInstallGuide
        open={guideOpen}
        onOpenChange={setGuideOpen}
        onRetry={handleDetectQz}
        retrying={qzBusy}
      />

      <QzDiagnosticsModal
        open={diagOpen}
        onOpenChange={setDiagOpen}
        selectedPrinter={form.printer_name}
        defaultPrinter={qzDefaultPrinter}
        qzPrinters={qzPrinters}
        qzStatus={qzStatus}
        lastAttempt={lastAttempt}
        onRetryDetect={handleDetectQz}
        retrying={qzBusy}
      />
    </AdminLayout>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <Label className="text-sm font-normal">{label}</Label>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
