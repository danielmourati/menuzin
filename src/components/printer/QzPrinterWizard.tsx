// Wizard único para configuração do QZ Tray.
//
// Roda 5 passos sequenciais e mostra os 3 estados visuais (pendente/ok/erro)
// por passo. Foi desenhado para ser a ÚNICA superfície que o admin do tenant
// precisa abrir na 1ª configuração — sem botões duplicados, sem instruções
// dispersas. A página /admin/configuracoes/impressora abre este wizard
// automaticamente quando algum dos passos 1–3 ainda não está ok.
//
// Toda a lógica de validar cert/assinatura, detectar prompt manual, instalar
// `allowed.pem` e selecionar impressora já existe em src/lib/qz-tray.ts e
// nas rotas /api/public/qz*. Este componente apenas as costura.

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  Loader2,
  Plug,
  Printer,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_PRINTER_SETTINGS,
  type PrinterSettings,
} from "@/lib/printer-types";
import {
  downloadQzCertificate,
  downloadQzWindowsInstaller,
  ensureQzConnected,
  fetchQzCertificate,
  listQzPrintersWithDefault,
  printQzTextTest,
  QzNotRunningError,
  type QzPrinter,
} from "@/lib/qz-tray";
import {
  getMyPrinterSettings,
  saveMyPrinterSettings,
} from "@/lib/printer-settings.functions";
import { getMyTenant } from "@/lib/tenants.functions";
import { buildReceiptPreviewText } from "@/lib/receipt-preview";

type StepStatus = "pending" | "running" | "ok" | "err";
type StepKey = "server" | "qz" | "trust" | "printer" | "test";

interface StepState {
  status: StepStatus;
  detail?: string;
}

const STEP_TITLES: Record<StepKey, string> = {
  server: "Servidor pronto",
  qz: "QZ Tray instalado e aberto",
  trust: "Certificado confiável (sem pop-up)",
  printer: "Impressora selecionada",
  test: "Imprimir teste",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Disparado depois do passo 5 concluir com sucesso. */
  onComplete?: () => void;
}

export function QzPrinterWizard({ open, onOpenChange, onComplete }: Props) {
  const qc = useQueryClient();

  const { data: settingsData } = useQuery({
    queryKey: ["printer-settings"],
    queryFn: () => getMyPrinterSettings(),
    enabled: open,
  });
  const { data: tenantData } = useQuery({
    queryKey: ["my-tenant"],
    queryFn: () => getMyTenant(),
    enabled: open,
    staleTime: 60_000,
  });

  const [form, setForm] = useState<PrinterSettings>(DEFAULT_PRINTER_SETTINGS);
  useEffect(() => {
    if (settingsData?.settings) setForm(settingsData.settings);
  }, [settingsData]);

  const [steps, setSteps] = useState<Record<StepKey, StepState>>({
    server: { status: "pending" },
    qz: { status: "pending" },
    trust: { status: "pending" },
    printer: { status: "pending" },
    test: { status: "pending" },
  });
  const [printers, setPrinters] = useState<QzPrinter[]>([]);
  const [showLinuxMac, setShowLinuxMac] = useState(false);
  const [busy, setBusy] = useState<StepKey | "all" | null>(null);

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
      }),
    [form, tenant],
  );

  const updateStep = (key: StepKey, patch: Partial<StepState>) =>
    setSteps((s) => ({ ...s, [key]: { ...s[key], ...patch } }));

  // === Execução dos passos ===
  const runStepServer = async (): Promise<boolean> => {
    updateStep("server", { status: "running", detail: undefined });
    try {
      const c = await fetchQzCertificate();
      if (!c.configured) {
        updateStep("server", {
          status: "err",
          detail: "Servidor sem certificado. Contate o suporte da plataforma.",
        });
        return false;
      }
      if (c.subjectCN && /QZ Industries/i.test(c.subjectCN)) {
        updateStep("server", {
          status: "err",
          detail: "Certificado demo em uso no servidor — contate o suporte.",
        });
        return false;
      }
      updateStep("server", {
        status: "ok",
        detail: c.subjectCN ? `CN=${c.subjectCN}` : "Pronto",
      });
      return true;
    } catch (e) {
      updateStep("server", { status: "err", detail: (e as Error).message });
      return false;
    }
  };

  const runStepQzAndTrust = async (): Promise<boolean> => {
    updateStep("qz", { status: "running", detail: undefined });
    updateStep("trust", { status: "pending", detail: undefined });
    try {
      const t0 = performance.now();
      await ensureQzConnected();
      const ms = Math.round(performance.now() - t0);
      updateStep("qz", { status: "ok", detail: "Conectado" });

      const prompted = ms > 2000;
      updateStep("trust", {
        status: prompted ? "err" : "ok",
        detail: prompted
          ? `${ms} ms — QZ Tray pediu confirmação manual. Rode o configurador.`
          : `${ms} ms — sem pop-up`,
      });
      return !prompted;
    } catch (e) {
      if (e instanceof QzNotRunningError) {
        updateStep("qz", {
          status: "err",
          detail: "QZ Tray não está aberto. Instale ou inicie o aplicativo.",
        });
      } else {
        updateStep("qz", { status: "err", detail: (e as Error).message });
      }
      return false;
    }
  };

  const runStepPrinter = async (): Promise<boolean> => {
    updateStep("printer", { status: "running", detail: undefined });
    try {
      const { printers: list, defaultPrinter } = await listQzPrintersWithDefault();
      setPrinters(list);
      if (list.length === 0) {
        updateStep("printer", {
          status: "err",
          detail: "Nenhuma impressora detectada no Windows.",
        });
        return false;
      }
      let target = form.printer_name?.trim();
      if (!target) {
        target = defaultPrinter || list[0]?.name;
        if (target) setForm((p) => ({ ...p, printer_name: target! }));
      }
      updateStep("printer", {
        status: target ? "ok" : "err",
        detail: target
          ? `${list.length} impressora(s) · selecionada: ${target}`
          : "Selecione uma impressora abaixo.",
      });
      return !!target;
    } catch (e) {
      updateStep("printer", { status: "err", detail: (e as Error).message });
      return false;
    }
  };

  const runStepTest = async (): Promise<boolean> => {
    updateStep("test", { status: "running", detail: undefined });
    try {
      await printQzTextTest(form.printer_name, previewText);
      updateStep("test", { status: "ok", detail: "Cupom enviado para a impressora." });
      return true;
    } catch (e) {
      updateStep("test", { status: "err", detail: (e as Error).message });
      return false;
    }
  };

  // Roda todos os passos em sequência, parando no primeiro erro.
  const runAll = async () => {
    if (busy) return;
    setBusy("all");
    try {
      if (!(await runStepServer())) return;
      const trusted = await runStepQzAndTrust();
      if (!trusted) return;
      if (!(await runStepPrinter())) return;
      // Não dispara teste de impressão automaticamente — exige clique.
    } finally {
      setBusy(null);
    }
  };

  // Auto-roda passos 1–3 ao abrir.
  const ranOnceRef = useRef(false);
  useEffect(() => {
    if (!open) {
      ranOnceRef.current = false;
      return;
    }
    if (ranOnceRef.current) return;
    ranOnceRef.current = true;
    void runAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const saveMut = useMutation({
    mutationFn: () => saveMyPrinterSettings({ data: form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["printer-settings"] });
    },
  });

  // === Ações de cada passo ===
  const handleDownloadInstaller = async () => {
    try {
      await downloadQzWindowsInstaller();
      toast.success("Configurador baixado. Clique direito → Executar como administrador.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDownloadCert = async () => {
    try {
      await downloadQzCertificate();
      toast.success("cert.pem baixado.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleRecheckTrust = async () => {
    setBusy("trust");
    try {
      await runStepQzAndTrust();
    } finally {
      setBusy(null);
    }
  };

  const handleDetect = async () => {
    setBusy("printer");
    try {
      await runStepPrinter();
    } finally {
      setBusy(null);
    }
  };

  const handlePrintTest = async () => {
    setBusy("test");
    try {
      // Garante que a impressora selecionada está salva antes de testar.
      try {
        await saveMut.mutateAsync();
      } catch {
        /* segue mesmo assim — teste é local */
      }
      const ok = await runStepTest();
      if (ok) onComplete?.();
    } finally {
      setBusy(null);
    }
  };

  const allGreen =
    steps.server.status === "ok" &&
    steps.qz.status === "ok" &&
    steps.trust.status === "ok" &&
    steps.printer.status === "ok" &&
    steps.test.status === "ok";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" /> Configurar impressora
          </DialogTitle>
          <DialogDescription>
            Vamos verificar tudo em 5 passos. Quando todos ficarem verdes, a
            impressão acontece direto, sem pop-ups.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-3">
          {(["server", "qz", "trust", "printer", "test"] as const).map((key, i) => (
            <li key={key} className="rounded-md border bg-card p-3">
              <div className="flex items-start gap-3">
                <StepIcon status={steps[key].status} />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">
                      {i + 1}. {STEP_TITLES[key]}
                    </div>
                  </div>
                  {steps[key].detail && (
                    <p
                      className={
                        "text-xs " +
                        (steps[key].status === "err"
                          ? "text-destructive"
                          : "text-muted-foreground")
                      }
                    >
                      {steps[key].detail}
                    </p>
                  )}

                  {/* Ações por passo */}
                  {key === "qz" && steps.qz.status === "err" && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href="https://qz.io/download/" target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Baixar QZ Tray
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleRecheckTrust}
                        disabled={busy !== null}
                      >
                        {busy === "trust" || busy === "all" ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plug className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Testar de novo
                      </Button>
                    </div>
                  )}

                  {key === "trust" && steps.trust.status === "err" && steps.qz.status === "ok" && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={handleDownloadInstaller}
                          disabled={busy !== null}
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          Baixar configurador Menuzin (.bat)
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleRecheckTrust}
                          disabled={busy !== null}
                        >
                          {busy === "trust" ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Testar de novo
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Clique direito no arquivo → <strong>Executar como administrador</strong>.
                        Ao final, volte aqui e clique em <em>Testar de novo</em>.
                      </p>
                      <button
                        type="button"
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                        onClick={() => setShowLinuxMac((v) => !v)}
                      >
                        <ChevronDown
                          className={
                            "h-3 w-3 transition-transform " +
                            (showLinuxMac ? "rotate-180" : "")
                          }
                        />
                        Não estou no Windows
                      </button>
                      {showLinuxMac && (
                        <div className="space-y-1 rounded-md border bg-muted/30 p-2 text-[11px] text-muted-foreground">
                          <p>
                            Baixe o cert e copie para o caminho do seu sistema, depois reinicie o QZ Tray:
                          </p>
                          <ul className="ml-3 list-disc space-y-0.5">
                            <li>
                              macOS:{" "}
                              <code>/Library/Application Support/qz/data/certificates/allowed.pem</code>
                            </li>
                            <li>
                              Linux: <code>/etc/qz/data/certificates/allowed.pem</code>
                            </li>
                          </ul>
                          <Button size="sm" variant="outline" onClick={handleDownloadCert}>
                            <Download className="mr-1.5 h-3.5 w-3.5" /> Baixar cert.pem
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {key === "printer" && steps.qz.status === "ok" && (
                    <div className="space-y-2">
                      {printers.length > 0 ? (
                        <Select
                          value={form.printer_name || ""}
                          onValueChange={(v) => setForm((p) => ({ ...p, printer_name: v }))}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {printers.map((p) => (
                              <SelectItem key={p.name} value={p.name}>
                                {p.name}
                                {p.isDefault ? " (padrão)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="space-y-1">
                          <Label className="text-xs">Nome da impressora (manual)</Label>
                          <Input
                            className="h-9 text-sm"
                            value={form.printer_name}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, printer_name: e.target.value }))
                            }
                            placeholder="Ex: BematechMP4200"
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleDetect}
                          disabled={busy !== null}
                        >
                          {busy === "printer" ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Plug className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Detectar impressoras
                        </Button>
                      </div>
                    </div>
                  )}

                  {key === "test" &&
                    steps.printer.status === "ok" &&
                    steps.trust.status === "ok" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handlePrintTest}
                          disabled={busy !== null}
                        >
                          {busy === "test" ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Printer className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Imprimir cupom de teste
                        </Button>
                      </div>
                    )}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="sm:mr-auto">
            Fechar
          </Button>
          <Button variant="outline" onClick={runAll} disabled={busy !== null}>
            {busy === "all" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
            )}
            Verificar tudo de novo
          </Button>
          {allGreen && (
            <Button onClick={() => onOpenChange(false)}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Tudo certo
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "ok")
    return <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />;
  if (status === "err")
    return <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />;
  if (status === "running")
    return <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-muted-foreground" />;
  return (
    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-muted-foreground/30 text-[10px] text-muted-foreground">
      •
    </span>
  );
}
