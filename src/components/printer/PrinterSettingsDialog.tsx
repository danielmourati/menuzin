import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "@tanstack/react-router";
import { Loader2, Save, Plug, ChevronDown, ExternalLink, Printer } from "lucide-react";
import { toast } from "sonner";
import { getMyPrinterSettings, saveMyPrinterSettings } from "@/lib/printer-settings.functions";
import { DEFAULT_PRINTER_SETTINGS, type PrinterSettings } from "@/lib/printer-types";
import { ensureQzConnected, listQzPrintersWithDefault, type QzPrinter } from "@/lib/qz-tray";

interface PrinterSettingsDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function PrinterSettingsDialog({ open, onOpenChange }: PrinterSettingsDialogProps) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["printer-settings"],
    queryFn: () => getMyPrinterSettings(),
    enabled: open,
  });

  const [form, setForm] = useState<PrinterSettings>(DEFAULT_PRINTER_SETTINGS);
  useEffect(() => { if (data?.settings) setForm(data.settings); }, [data]);

  const [detecting, setDetecting] = useState(false);
  const [printers, setPrinters] = useState<QzPrinter[]>([]);

  const saveMut = useMutation({
    mutationFn: () => saveMyPrinterSettings({ data: form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["printer-settings"] });
      toast.success("Configurações salvas");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof PrinterSettings>(k: K, v: PrinterSettings[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleDetect = async () => {
    setDetecting(true);
    try {
      await ensureQzConnected();
      const { printers, defaultPrinter } = await listQzPrintersWithDefault();
      setPrinters(printers);
      if (!form.printer_name && (defaultPrinter || printers[0]?.name)) {
        set("printer_name", defaultPrinter || printers[0]!.name);
      }
      toast.success(`${printers.length} impressora(s) encontrada(s)`);
    } catch (e) {
      toast.error((e as Error).message || "Falha ao conectar ao QZ Tray");
    } finally {
      setDetecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" /> Configurar impressora
          </DialogTitle>
          <DialogDescription>
            Ajustes rápidos. Para opções avançadas use a página completa.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Tipo de conexão</Label>
              <Select
                value={form.connection_type}
                onValueChange={(v) => set("connection_type", v as PrinterSettings["connection_type"])}
              >
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="browser">QZ Tray — impressão térmica local</SelectItem>
                  <SelectItem value="bluetooth">Bluetooth</SelectItem>
                  <SelectItem value="usb">USB</SelectItem>
                  <SelectItem value="network">Rede / IP</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Sem QZ Tray, o sistema usa a impressão genérica do navegador.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Nome da impressora</Label>
                <Button size="sm" variant="outline" onClick={handleDetect} disabled={detecting} className="h-7 text-xs">
                  {detecting ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Plug className="mr-1.5 h-3 w-3" />}
                  Detectar
                </Button>
              </div>
              {printers.length > 0 ? (
                <Select value={form.printer_name || ""} onValueChange={(v) => set("printer_name", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {printers.map((p) => (
                      <SelectItem key={p.name} value={p.name}>{p.name}{p.isDefault ? " (padrão)" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="mt-1.5"
                  value={form.printer_name}
                  onChange={(e) => set("printer_name", e.target.value)}
                  placeholder="Ex: Balcão"
                />
              )}
            </div>

            <div>
              <Label>Largura do papel</Label>
              <div className="mt-1.5 flex gap-2">
                {(["55mm", "80mm"] as const).map((w) => (
                  <Button
                    key={w}
                    type="button"
                    size="sm"
                    variant={form.paper_width === w ? "default" : "outline"}
                    onClick={() => set("paper_width", w)}
                  >
                    {w}
                  </Button>
                ))}
              </div>
            </div>

            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                <ChevronDown className="h-3.5 w-3.5" />
                Tutorial: como instalar e configurar
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1.5">
                <p><strong>QZ Tray (impressora térmica):</strong> baixe o instalador em <a href="https://qz.io/download/" target="_blank" rel="noreferrer" className="text-primary hover:underline">qz.io/download</a>, execute como administrador e clique em <strong>Detectar</strong> acima.</p>
                <p><strong>Impressão genérica:</strong> selecione "Rede / IP" ou deixe sem QZ — usaremos o diálogo de impressão do navegador (<kbd>Ctrl+P</kbd>) para qualquer impressora instalada no sistema.</p>
                <p>Para diagnóstico completo, baixar certificado e cancelar prompts, use a página avançada abaixo.</p>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" asChild className="sm:mr-auto">
            <Link to="/admin/configuracoes/impressora" onClick={() => onOpenChange(false)}>
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Configuração completa
            </Link>
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || isLoading}>
            {saveMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
