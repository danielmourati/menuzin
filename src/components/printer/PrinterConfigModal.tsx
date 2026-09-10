// Modal único de impressoras: lista de locais à esquerda, ajustes do local
// selecionado à direita, opções avançadas recolhidas e estado da impressão no
// rodapé. É a única tela de configuração de impressora do sistema.
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  Coffee,
  HelpCircle,
  Loader2,
  Monitor,
  Plus,
  Printer,
  RefreshCw,
  Store,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_PRINTER_SETTINGS,
  type PaperWidth,
  type PrinterSettings,
} from "@/lib/printer-types";
import {
  getMyPrinterSettings,
  saveMyPrinterSettings,
} from "@/lib/printer-settings.functions";
import {
  deleteTenantPrinter,
  listMyTenantPrinters,
  saveTenantPrinter,
  type PrinterLayoutOverrides,
  type TenantPrinter,
  type TenantPrinterRole,
} from "@/lib/tenant-printers.functions";
import {
  ensureQzConnected,
  listQzPrintersWithDefault,
  printQzTextTest,
  QzNotRunningError,
  type QzPrinter,
} from "@/lib/qz-tray";
import { setDevicePrinter } from "@/lib/device-printer";
import { ReceiptLayoutFields } from "@/components/printer/ReceiptLayoutFields";
import { QzInstallGuide } from "@/components/printer/QzInstallGuide";
import { QzDiagnosticsModal } from "@/components/printer/QzDiagnosticsModal";
import { useTenantPlan, UpgradeNotice } from "@/lib/plan-features";

interface PrinterConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExtraDraft = {
  localId: string;
  id?: string;
  name: string;
  role: TenantPrinterRole;
  printer_name: string;
  paper_width: PaperWidth;
  is_active: boolean;
  layout_overrides: PrinterLayoutOverrides | null;
};

const ROLE_LABEL: Record<TenantPrinterRole, string> = {
  receipt: "Caixa",
  kitchen: "Cozinha",
  bar: "Bar",
  counter: "Balcão",
  other: "Outro",
};

const DEFAULT_OVERRIDES: PrinterLayoutOverrides = {
  font_family: "mono",
  font_size: "normal",
  separator_char: "-",
  cut_type: "partial",
  feed_lines: 3,
  use_bold_titles: true,
  use_double_total: true,
  show_store_name: true,
  show_address: false,
  show_document: false,
  show_whatsapp: false,
  show_pix: false,
  show_instagram: false,
  show_thank_message: false,
  thank_message: "",
};

function fromTenantPrinter(p: TenantPrinter): ExtraDraft {
  return {
    localId: p.id,
    id: p.id,
    name: p.name || "Impressora",
    role: p.role,
    printer_name: p.printer_name,
    paper_width: p.paper_width,
    is_active: p.is_active,
    layout_overrides: p.layout_overrides ?? null,
  };
}

function roleIcon(role?: TenantPrinterRole, isCaixa?: boolean) {
  if (isCaixa) return <Monitor className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
  if (role === "kitchen") return <ChefHat className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
  if (role === "bar") return <Coffee className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
  return <Store className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
}

export function PrinterConfigModal({ open, onOpenChange }: PrinterConfigModalProps) {
  const qc = useQueryClient();
  const { can } = useTenantPlan();
  const canMultiple = can("multiplePrinters");
  const canAutoAccept = can("kitchenPrinter");

  const { data: mainData, isLoading: loadingMain } = useQuery({
    queryKey: ["printer-settings"],
    queryFn: () => getMyPrinterSettings(),
    enabled: open,
  });
  const { data: extraData, isLoading: loadingExtra } = useQuery({
    queryKey: ["tenant-printers"],
    queryFn: () => listMyTenantPrinters(),
    enabled: open && canMultiple,
  });

  const [caixa, setCaixa] = useState<PrinterSettings>(DEFAULT_PRINTER_SETTINGS);
  const [drafts, setDrafts] = useState<ExtraDraft[]>([]);
  const [selectedId, setSelectedId] = useState<string>("caixa");
  const [systemPrinters, setSystemPrinters] = useState<QzPrinter[]>([]);
  const [scanning, setScanning] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [qzStatus, setQzStatus] = useState<"unknown" | "connected" | "offline">("unknown");
  const [guideOpen, setGuideOpen] = useState(false);
  const [diagOpen, setDiagOpen] = useState(false);

  useEffect(() => {
    if (mainData?.settings) setCaixa(mainData.settings);
  }, [mainData]);

  useEffect(() => {
    if (extraData?.printers) {
      setDrafts((prev) => [
        ...extraData.printers.map(fromTenantPrinter),
        ...prev.filter((d) => !d.id),
      ]);
    }
  }, [extraData]);

  const detect = async (silent = false) => {
    setScanning(true);
    try {
      await ensureQzConnected();
      const res = await listQzPrintersWithDefault();
      setSystemPrinters(res.printers);
      setQzStatus("connected");
      if (!silent) toast.success(`${res.printers.length} impressora(s) encontrada(s)`);
    } catch (err) {
      setQzStatus("offline");
      if (!silent) {
        toast.error(
          err instanceof QzNotRunningError
            ? "O programa de impressão não está aberto neste computador."
            : err instanceof Error
              ? err.message
              : "Não foi possível encontrar impressoras.",
        );
      }
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSelectedId("caixa");
      setAdvancedOpen(false);
      void detect(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selected = useMemo(
    () => drafts.find((d) => d.localId === selectedId) ?? null,
    [drafts, selectedId],
  );
  const isCaixa = selectedId === "caixa";

  const updateDraft = (patch: Partial<ExtraDraft>) => {
    setDrafts((prev) =>
      prev.map((d) => (d.localId === selectedId ? { ...d, ...patch } : d)),
    );
  };

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTenantPrinter({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-printers"] }),
  });

  const removeSelected = () => {
    if (!selected) return;
    setSelectedId("caixa");
    setDrafts((prev) => prev.filter((d) => d.localId !== selected.localId));
    if (selected.id) {
      deleteMut.mutate(selected.id, {
        onSuccess: () => toast.success("Local removido"),
        onError: (e: Error) => toast.error(e.message),
      });
    }
  };

  const addLocation = () => {
    const localId = crypto.randomUUID();
    setDrafts((prev) => [
      ...prev,
      {
        localId,
        name: "Cozinha",
        role: "kitchen",
        printer_name: "",
        paper_width: "80mm",
        is_active: true,
        layout_overrides: null,
      },
    ]);
    setSelectedId(localId);
  };

  const currentPrinterName = isCaixa ? caixa.printer_name : (selected?.printer_name ?? "");

  const testPrint = async () => {
    if (!currentPrinterName) {
      toast.error("Escolha uma impressora antes de testar.");
      return;
    }
    setTesting(true);
    try {
      await printQzTextTest(
        currentPrinterName,
        [
          "======================================",
          "         TESTE DE IMPRESSAO",
          "======================================",
          `Local: ${isCaixa ? "Caixa" : selected?.name}`,
          `Impressora: ${currentPrinterName}`,
          new Date().toLocaleString("pt-BR"),
          "======================================",
        ].join("\n"),
      );
      toast.success("Teste enviado para a impressora.");
    } catch (err) {
      toast.error(
        err instanceof QzNotRunningError
          ? "O programa de impressão não está aberto neste computador."
          : err instanceof Error
            ? err.message
            : "Não foi possível imprimir.",
      );
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (caixa.printer_name) setDevicePrinter(caixa.printer_name);
      await saveMyPrinterSettings({ data: caixa });
      for (const d of drafts) {
        if (!d.name.trim()) continue;
        await saveTenantPrinter({
          data: {
            id: d.id,
            name: d.name,
            role: d.role,
            printer_name: d.printer_name,
            paper_width: d.paper_width,
            font_size: d.layout_overrides?.font_size ?? "normal",
            font_family: d.layout_overrides?.font_family ?? "mono",
            is_active: d.is_active,
            is_default: false,
            layout_overrides: d.layout_overrides,
          },
        });
      }
      qc.invalidateQueries({ queryKey: ["printer-settings"] });
      qc.invalidateQueries({ queryKey: ["tenant-printers"] });
      qc.invalidateQueries({ queryKey: ["tenant-printers-indicator"] });
      toast.success("Configuração salva.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const printerSelect = (value: string, onChange: (v: string) => void) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Escolha a impressora</Label>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          onClick={() => detect()}
          disabled={scanning}
        >
          {scanning ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-3 w-3" />
          )}
          Procurar impressoras
        </Button>
      </div>
      {systemPrinters.length > 0 ? (
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a impressora" />
          </SelectTrigger>
          <SelectContent>
            {systemPrinters.map((p) => (
              <SelectItem key={p.name} value={p.name}>
                {p.name}
                {p.isDefault ? " (a mais usada)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Clique em Procurar impressoras"
        />
      )}
    </div>
  );

  const paperSelect = (value: PaperWidth, onChange: (v: PaperWidth) => void) => (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">Tamanho do papel</Label>
      <Select value={value} onValueChange={(v) => onChange(v as PaperWidth)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="80mm">80mm (bobina comum)</SelectItem>
          <SelectItem value="55mm">58mm (bobina pequena)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const advancedBlock = (
    <div className="rounded-lg border bg-muted/20">
      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium"
      >
        Opções avançadas
        <ChevronDown
          className={"h-4 w-4 transition-transform " + (advancedOpen ? "rotate-180" : "")}
        />
      </button>
      {advancedOpen && (
        <div className="space-y-4 border-t px-3 py-3">
          {isCaixa ? (
            <>
              <p className="text-xs text-muted-foreground">
                Aparência do cupom da loja. Se não mexer aqui, usamos a configuração
                recomendada.
              </p>
              <ReceiptLayoutFields
                value={caixa}
                onChange={(patch) =>
                  setCaixa((prev) => ({
                    ...prev,
                    ...patch,
                    ...(patch.font_family || patch.font_size
                      ? { use_default_typography: false }
                      : {}),
                  }))
                }
              />
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
                <span className="text-sm">Conectar à impressão sozinho ao entrar</span>
                <Switch
                  checked={caixa.auto_connect}
                  onCheckedChange={(v) => setCaixa((p) => ({ ...p, auto_connect: v }))}
                />
              </div>
            </>
          ) : selected ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Aparência do cupom</Label>
                  <p className="text-xs text-muted-foreground">
                    {selected.layout_overrides
                      ? "Personalizada para esta impressora."
                      : "Seguindo o padrão da loja."}
                  </p>
                </div>
                <Switch
                  checked={Boolean(selected.layout_overrides)}
                  onCheckedChange={(v) =>
                    updateDraft({ layout_overrides: v ? { ...DEFAULT_OVERRIDES } : null })
                  }
                />
              </div>
              {selected.layout_overrides && (
                <ReceiptLayoutFields
                  value={selected.layout_overrides}
                  onChange={(patch) =>
                    updateDraft({
                      layout_overrides: { ...selected.layout_overrides, ...patch },
                    })
                  }
                />
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[88vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b px-5 py-4">
            <Printer className="h-5 w-5 text-primary" />
            <div>
              <DialogTitle className="text-base font-semibold">Impressoras</DialogTitle>
              <DialogDescription className="text-xs">
                Escolha o local à esquerda e ajuste a impressora ao lado.
              </DialogDescription>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[220px_1fr]">
            {/* Locais */}
            <div className="flex flex-col gap-2 border-b bg-muted/10 p-3 md:border-b-0 md:border-r">
              <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Onde imprimir
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
                <button
                  type="button"
                  onClick={() => setSelectedId("caixa")}
                  className={
                    "flex w-full shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors " +
                    (isCaixa ? "border bg-background shadow-sm" : "hover:bg-muted/60")
                  }
                >
                  {roleIcon(undefined, true)}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">Caixa (recibo)</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {caixa.printer_name || "Nenhuma escolhida"}
                    </span>
                  </span>
                </button>

                {canMultiple &&
                  drafts.map((d) => (
                    <button
                      key={d.localId}
                      type="button"
                      onClick={() => setSelectedId(d.localId)}
                      className={
                        "flex w-full shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors " +
                        (selectedId === d.localId
                          ? "border bg-background shadow-sm"
                          : "hover:bg-muted/60")
                      }
                    >
                      {roleIcon(d.role)}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {d.name || "Sem nome"}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {d.is_active
                            ? d.printer_name || "Nenhuma escolhida"
                            : "Não está em uso"}
                        </span>
                      </span>
                    </button>
                  ))}
              </div>

              {canMultiple && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-auto w-full gap-2 text-xs"
                  onClick={addLocation}
                >
                  <Plus className="h-4 w-4" /> Adicionar local
                </Button>
              )}
            </div>

            {/* Detalhe */}
            <div className="min-h-[320px] flex-1 overflow-y-auto p-5">
              {loadingMain || (canMultiple && loadingExtra) ? (
                <div className="grid h-full place-items-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : isCaixa ? (
                <div className="space-y-4">
                  <div className="border-b pb-3">
                    <h3 className="text-base font-semibold">Caixa (recibo do cliente)</h3>
                    <p className="text-xs text-muted-foreground">
                      Impressora usada para o recibo deste computador.
                    </p>
                  </div>

                  {printerSelect(caixa.printer_name, (v) =>
                    setCaixa((p) => ({ ...p, printer_name: v })),
                  )}
                  {paperSelect(caixa.paper_width, (v) =>
                    setCaixa((p) => ({ ...p, paper_width: v })),
                  )}

                  {canAutoAccept ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                      <div className="space-y-0.5">
                        <span className="text-sm font-medium">
                          Imprimir e aceitar pedidos automaticamente
                        </span>
                        <p className="text-xs text-muted-foreground">
                          O pedido é aceito assim que chega e o cupom sai na hora.
                        </p>
                      </div>
                      <Switch
                        checked={caixa.auto_accept_orders}
                        onCheckedChange={(v) =>
                          setCaixa((p) => ({ ...p, auto_accept_orders: v }))
                        }
                      />
                    </div>
                  ) : (
                    <UpgradeNotice
                      title="Impressão automática no Plano Pro"
                      description="No Plano Pro o pedido é aceito assim que chega e o cupom sai sozinho."
                    />
                  )}

                  {advancedBlock}
                </div>
              ) : !canMultiple ? (
                <UpgradeNotice
                  title="Mais de uma impressora no Plano Pro"
                  description="No Plano Pro você pode ter impressoras separadas para cozinha, bar e balcão. O recibo do caixa continua funcionando normalmente."
                />
              ) : selected ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3 border-b pb-3">
                    <div>
                      <h3 className="text-base font-semibold">{selected.name || "Novo local"}</h3>
                      <p className="text-xs text-muted-foreground">
                        Impressora do setor (comanda de produção).
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={removeSelected}
                      title="Excluir este local"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Nome do local</Label>
                      <Input
                        value={selected.name}
                        onChange={(e) => updateDraft({ name: e.target.value })}
                        placeholder="Ex.: Cozinha"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Onde fica</Label>
                      <Select
                        value={selected.role}
                        onValueChange={(v) => updateDraft({ role: v as TenantPrinterRole })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ROLE_LABEL) as TenantPrinterRole[]).map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {printerSelect(selected.printer_name, (v) => updateDraft({ printer_name: v }))}
                  {paperSelect(selected.paper_width, (v) => updateDraft({ paper_width: v }))}

                  <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                    <span className="text-sm">Em uso</span>
                    <Switch
                      checked={selected.is_active}
                      onCheckedChange={(v) => updateDraft({ is_active: v })}
                    />
                  </div>

                  {advancedBlock}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Escolha um local na lista.</p>
              )}
            </div>
          </div>

          {/* Rodapé */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs">
                {qzStatus === "connected" ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Impressão ligada
                  </>
                ) : qzStatus === "offline" ? (
                  <>
                    <XCircle className="h-3.5 w-3.5 text-destructive" /> Programa de impressão não
                    encontrado
                  </>
                ) : (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />{" "}
                    Verificando impressão…
                  </>
                )}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setGuideOpen(true)}
              >
                <HelpCircle className="h-3.5 w-3.5" /> Ajuda
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => setDiagOpen(true)}
              >
                Diagnóstico
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={testPrint}
                disabled={testing}
              >
                {testing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Printer className="h-3.5 w-3.5" />
                )}
                Imprimir teste
              </Button>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <QzInstallGuide
        open={guideOpen}
        onOpenChange={setGuideOpen}
        onRetry={() => detect()}
        retrying={scanning}
      />
      <QzDiagnosticsModal
        open={diagOpen}
        onOpenChange={setDiagOpen}
        selectedPrinter={currentPrinterName}
        defaultPrinter={systemPrinters.find((p) => p.isDefault)?.name ?? null}
        qzPrinters={systemPrinters}
        qzStatus={qzStatus}
        lastAttempt={null}
        onRetryDetect={() => detect()}
        retrying={scanning}
      />
    </>
  );
}
