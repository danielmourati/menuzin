import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Check,
  CheckCircle2,
  ChefHat,
  Coffee,
  Loader2,
  Monitor,
  Plus,
  Printer,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_PRINTER_SETTINGS,
  type FontFamily,
  type FontSize,
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
  type TenantPrinter,
  type TenantPrinterRole,
} from "@/lib/tenant-printers.functions";
import {
  listQzPrintersWithDefault,
  printQzTextTest,
  QzNotRunningError,
  type QzPrinter,
} from "@/lib/qz-tray";
import { getDevicePrinter, setDevicePrinter } from "@/lib/device-printer";

interface PrinterConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PrintMode = "disabled" | "installed" | "shared";

interface LocationItem {
  id: string; // 'caixa' or UUID for extra printers
  isCaixa: boolean;
  name: string;
  role?: TenantPrinterRole;
  printerName: string;
  mode: PrintMode;
  paperWidth: PaperWidth;
  fontSize: FontSize;
  fontFamily: FontFamily;
  useDefaultTypography: boolean; // Utilizar texto simplificado
  useBoldTitles: boolean;
  isActive: boolean;
  extraPrinterRef?: TenantPrinter;
}

const DEFAULT_FONTS: { label: string; value: FontFamily }[] = [
  { label: "Consolas", value: "mono" },
  { label: "Courier New", value: "condensed" },
  { label: "Sans-Serif (Genérica)", value: "sans" },
];

const DEFAULT_SIZES: { label: string; value: FontSize }[] = [
  { label: "Pequeno", value: "compact" },
  { label: "Médio (8.25pt)", value: "normal" },
  { label: "Grande", value: "large" },
];

export function PrinterConfigModal({ open, onOpenChange }: PrinterConfigModalProps) {
  const qc = useQueryClient();

  // Queries
  const { data: mainSettingsData, isLoading: isLoadingMain } = useQuery({
    queryKey: ["printer-settings"],
    queryFn: () => getMyPrinterSettings(),
    enabled: open,
  });

  const { data: extraPrintersData, isLoading: isLoadingExtra } = useQuery({
    queryKey: ["tenant-printers"],
    queryFn: () => listMyTenantPrinters(),
    enabled: open,
  });

  // State
  const [selectedId, setSelectedId] = useState<string>("caixa");
  const [systemPrinters, setSystemPrinters] = useState<QzPrinter[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Form State for Caixa
  const [caixaForm, setCaixaForm] = useState<PrinterSettings>(DEFAULT_PRINTER_SETTINGS);

  // Form State for Extra Printers
  const [extraDrafts, setExtraDrafts] = useState<LocationItem[]>([]);

  // Load Caixa settings
  useEffect(() => {
    if (mainSettingsData?.settings) {
      setCaixaForm(mainSettingsData.settings);
    }
  }, [mainSettingsData]);

  // Load Extra printers
  useEffect(() => {
    if (extraPrintersData?.printers) {
      const mapped: LocationItem[] = extraPrintersData.printers.map((p) => ({
        id: p.id,
        isCaixa: false,
        name: p.name || "Impressora Adicional",
        role: p.role,
        printerName: p.printer_name,
        mode: p.is_active ? "installed" : "disabled",
        paperWidth: p.paper_width,
        fontSize: p.font_size,
        fontFamily: p.font_family,
        useDefaultTypography: true,
        useBoldTitles: true,
        isActive: p.is_active,
        extraPrinterRef: p,
      }));
      setExtraDrafts(mapped);
    }
  }, [extraPrintersData]);

  // Scan system printers via QZ Tray
  const scanPrinters = async () => {
    setIsScanning(true);
    try {
      const res = await listQzPrintersWithDefault();
      setSystemPrinters(res.printers);
    } catch (err) {
      if (err instanceof QzNotRunningError) {
        toast.error("QZ Tray não está em execução no sistema.");
      } else {
        toast.error("Não foi possível carregar as impressoras do sistema.");
      }
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (open) {
      scanPrinters();
    }
  }, [open]);

  // Construct location list
  const caixaLocation: LocationItem = {
    id: "caixa",
    isCaixa: true,
    name: "Impressora do Caixa (Este PC)",
    printerName: caixaForm.printer_name || getDevicePrinter() || "",
    mode: caixaForm.printer_name || getDevicePrinter() ? "installed" : "disabled",
    paperWidth: caixaForm.paper_width,
    fontSize: caixaForm.font_size,
    fontFamily: caixaForm.font_family,
    useDefaultTypography: caixaForm.use_default_typography,
    useBoldTitles: caixaForm.use_bold_titles,
    isActive: true,
  };

  const locations: LocationItem[] = [caixaLocation, ...extraDrafts];
  const activeLocation = locations.find((l) => l.id === selectedId) || caixaLocation;

  // Handlers for active location state update
  const updateActiveLocation = (updates: Partial<LocationItem>) => {
    if (activeLocation.isCaixa) {
      setCaixaForm((prev) => ({
        ...prev,
        ...(updates.printerName !== undefined && { printer_name: updates.printerName }),
        ...(updates.paperWidth !== undefined && { paper_width: updates.paperWidth }),
        ...(updates.fontSize !== undefined && { font_size: updates.fontSize }),
        ...(updates.fontFamily !== undefined && { font_family: updates.fontFamily }),
        ...(updates.useDefaultTypography !== undefined && { use_default_typography: updates.useDefaultTypography }),
        ...(updates.useBoldTitles !== undefined && { use_bold_titles: updates.useBoldTitles }),
      }));
    } else {
      setExtraDrafts((prev) =>
        prev.map((item) => (item.id === activeLocation.id ? { ...item, ...updates } : item)),
      );
    }
  };

  // Mutations
  const saveCaixaMut = useMutation({
    mutationFn: (data: PrinterSettings) => saveMyPrinterSettings({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["printer-settings"] });
    },
  });

  const saveExtraMut = useMutation({
    mutationFn: (item: LocationItem) =>
      saveTenantPrinter({
        data: {
          id: item.id.length > 20 ? item.id : undefined,
          name: item.name,
          role: item.role || "kitchen",
          printer_name: item.printerName,
          paper_width: item.paperWidth,
          font_size: item.fontSize,
          font_family: item.fontFamily,
          is_active: item.mode !== "disabled",
          is_default: false,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-printers"] });
    },
  });

  const deleteExtraMut = useMutation({
    mutationFn: (id: string) => deleteTenantPrinter({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-printers"] });
      setSelectedId("caixa");
      toast.success("Local removido com sucesso");
    },
  });

  const handleSaveAll = async () => {
    try {
      // Save Caixa settings
      if (caixaForm.printer_name) {
        setDevicePrinter(caixaForm.printer_name);
      }
      await saveCaixaMut.mutateAsync(caixaForm);

      // Save Extra printers
      for (const draft of extraDrafts) {
        await saveExtraMut.mutateAsync(draft);
      }

      toast.success("Configurações de impressora salvas com sucesso!");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar configurações");
    }
  };

  const handleAddLocation = () => {
    const newId = crypto.randomUUID();
    const newLocation: LocationItem = {
      id: newId,
      isCaixa: false,
      name: "Cozinha / Bar",
      role: "kitchen",
      printerName: "",
      mode: "installed",
      paperWidth: "80mm",
      fontSize: "normal",
      fontFamily: "mono",
      useDefaultTypography: true,
      useBoldTitles: true,
      isActive: true,
    };
    setExtraDrafts((prev) => [...prev, newLocation]);
    setSelectedId(newId);
  };

  const handleTestPrinter = async () => {
    const targetPrinter = activeLocation.printerName;
    if (!targetPrinter) {
      toast.error("Selecione uma impressora antes de testar.");
      return;
    }
    setIsTesting(true);
    try {
      const testText = [
        "========================================",
        "          TESTE DE IMPRESSAO            ",
        "              MENUIN.APP                ",
        "========================================",
        `Local: ${activeLocation.name}`,
        `Impressora: ${targetPrinter}`,
        `Data/Hora: ${new Date().toLocaleString("pt-BR")}`,
        "========================================",
        "Status: OK - Conexao via QZ Tray",
        "========================================",
      ].join("\n");

      await printQzTextTest(targetPrinter, testText);
      toast.success(`Teste enviado com sucesso para "${targetPrinter}"!`);
    } catch (err) {
      if (err instanceof QzNotRunningError) {
        toast.error("QZ Tray não está em execução no computador.");
      } else {
        toast.error(err instanceof Error ? err.message : "Falha ao enviar impressão de teste");
      }
    } finally {
      setIsTesting(false);
    }
  };

  const getRoleIcon = (role?: TenantPrinterRole, isCaixa?: boolean) => {
    if (isCaixa) return <Monitor className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    switch (role) {
      case "kitchen":
        return <ChefHat className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case "bar":
        return <Coffee className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      default:
        return <Store className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
    }
  };

  const isSaving = saveCaixaMut.isPending || saveExtraMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-background text-foreground border rounded-xl shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" />
            <DialogTitle className="text-lg font-semibold">Impressoras</DialogTitle>
          </div>
        </div>

        {/* Modal Body with Sidebar + Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 min-h-[480px]">
          {/* Sidebar Locais */}
          <div className="md:col-span-1 border-r bg-muted/10 p-4 flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                Locais
              </div>

              <div className="space-y-1">
                {locations.map((loc) => {
                  const isSelected = loc.id === selectedId;
                  return (
                    <button
                      key={loc.id}
                      onClick={() => setSelectedId(loc.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all text-sm font-medium ${
                        isSelected
                          ? "bg-background border shadow-sm text-foreground"
                          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {getRoleIcon(loc.role, loc.isCaixa)}
                      </div>
                      <div className="truncate flex-1">
                        <div className="truncate text-foreground leading-tight font-medium">
                          {loc.name}
                        </div>
                        <span className="text-[11px] text-muted-foreground block truncate">
                          {loc.mode === "disabled"
                            ? "Não utilizada"
                            : loc.printerName || "Nenhuma selecionada"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleAddLocation}
              className="w-full mt-4 flex items-center justify-center gap-2 text-xs"
            >
              <Plus className="w-4 h-4" />
              Adicionar Local
            </Button>
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-2 p-6 flex flex-col justify-between">
            {isLoadingMain || isLoadingExtra ? (
              <div className="flex items-center justify-center h-full min-h-[300px]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header of selected location */}
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                      {getRoleIcon(activeLocation.role, activeLocation.isCaixa)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg leading-snug">
                        {activeLocation.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {activeLocation.isCaixa
                          ? "Impressora configurada para o caixa deste computador"
                          : "Impressora para produção e comanda de setor"}
                      </p>
                    </div>
                  </div>

                  {!activeLocation.isCaixa && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => deleteExtraMut.mutate(activeLocation.id)}
                      title="Excluir este local"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Print Mode Selector (Radio Group) */}
                <RadioGroup
                  value={activeLocation.mode}
                  onValueChange={(val) => updateActiveLocation({ mode: val as PrintMode })}
                  className="grid grid-cols-3 gap-3"
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/40 transition-colors">
                    <RadioGroupItem value="disabled" id="mode-disabled" />
                    <Label htmlFor="mode-disabled" className="cursor-pointer text-xs font-medium">
                      Não utilizo
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/40 transition-colors">
                    <RadioGroupItem value="installed" id="mode-installed" />
                    <Label htmlFor="mode-installed" className="cursor-pointer text-xs font-medium">
                      Impressoras Instaladas
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/40 transition-colors">
                    <RadioGroupItem value="shared" id="mode-shared" />
                    <Label htmlFor="mode-shared" className="cursor-pointer text-xs font-medium">
                      Compartilhadas
                    </Label>
                  </div>
                </RadioGroup>

                {activeLocation.mode !== "disabled" && (
                  <>
                    {/* System Printer Dropdown */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Impressora:</Label>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={scanPrinters}
                          disabled={isScanning}
                          className="h-auto p-0 text-xs text-primary"
                        >
                          {isScanning ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : null}
                          Atualizar lista
                        </Button>
                      </div>

                      <Select
                        value={activeLocation.printerName}
                        onValueChange={(val) => updateActiveLocation({ printerName: val })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione uma impressora instalada no PC" />
                        </SelectTrigger>
                        <SelectContent>
                          {systemPrinters.length > 0 ? (
                            systemPrinters.map((p) => (
                              <SelectItem key={p.name} value={p.name}>
                                {p.name} {p.isDefault ? "(Padrão do Sistema)" : ""}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value={activeLocation.printerName || "empty"} disabled>
                              {activeLocation.printerName || "Nenhuma impressora detectada no QZ Tray"}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Printer Advanced Options Box */}
                    <div className="border rounded-xl p-4 bg-muted/20 space-y-4">
                      {/* Checkbox simplified text */}
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="chk-simplified"
                          checked={activeLocation.useDefaultTypography}
                          onCheckedChange={(checked) =>
                            updateActiveLocation({ useDefaultTypography: !!checked })
                          }
                        />
                        <Label htmlFor="chk-simplified" className="text-xs leading-normal font-medium cursor-pointer">
                          Utilizar texto simplificado (impressoras com drivers genéricos)
                        </Label>
                      </div>

                      {/* Checkbox bold titles */}
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="chk-bold"
                          checked={activeLocation.useBoldTitles}
                          onCheckedChange={(checked) =>
                            updateActiveLocation({ useBoldTitles: !!checked })
                          }
                        />
                        <Label htmlFor="chk-bold" className="text-xs leading-normal font-medium cursor-pointer">
                          Destacar alguns elementos em negrito
                        </Label>
                      </div>

                      {/* Font Family & Size Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {/* Font Select */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Fonte:</Label>
                          <div className="flex items-center gap-2">
                            <Select
                              value={activeLocation.fontFamily}
                              onValueChange={(val) =>
                                updateActiveLocation({ fontFamily: val as FontFamily })
                              }
                            >
                              <SelectTrigger className="w-full h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DEFAULT_FONTS.map((f) => (
                                  <SelectItem key={f.value} value={f.value}>
                                    {f.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 px-2 text-[11px] whitespace-nowrap"
                              onClick={() => updateActiveLocation({ fontFamily: "mono" })}
                            >
                              Definir padrão
                            </Button>
                          </div>
                        </div>

                        {/* Font Size Select */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Tamanho:</Label>
                          <div className="flex items-center gap-2">
                            <Select
                              value={activeLocation.fontSize}
                              onValueChange={(val) =>
                                updateActiveLocation({ fontSize: val as FontSize })
                              }
                            >
                              <SelectTrigger className="w-full h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DEFAULT_SIZES.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 px-2 text-[11px] whitespace-nowrap"
                              onClick={() => updateActiveLocation({ fontSize: "normal" })}
                            >
                              Definir padrão
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Paper Width Select */}
                      <div className="space-y-1.5 pt-1">
                        <Label className="text-xs font-medium text-muted-foreground">Tamanho do papel:</Label>
                        <Select
                          value={activeLocation.paperWidth}
                          onValueChange={(val) =>
                            updateActiveLocation({ paperWidth: val as PaperWidth })
                          }
                        >
                          <SelectTrigger className="w-full h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="80mm">80mm (Bobina padrão)</SelectItem>
                            <SelectItem value="55mm">55mm / 58mm (Bobina estreita)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between border-t pt-4 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestPrinter}
                disabled={isTesting || activeLocation.mode === "disabled"}
                className="flex items-center gap-2 text-xs"
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                Testar Impressora
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="flex items-center gap-2 text-xs"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
