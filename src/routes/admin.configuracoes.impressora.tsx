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
import { Loader2, Printer, Save, AlertTriangle, Plug, HelpCircle, CheckCircle2, XCircle } from "lucide-react";
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
  ensureQzConnected, listQzPrinters, printQzTextTest, QzNotRunningError,
} from "@/lib/qz-tray";
import { QzInstallGuide } from "@/components/printer/QzInstallGuide";

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
  const [qzPrinters, setQzPrinters] = useState<string[]>([]);

  const handleDetectQz = async () => {
    setQzBusy(true);
    try {
      await ensureQzConnected();
      const list = await listQzPrinters();
      setQzPrinters(list);
      if (list.length === 0) {
        toast.warning("Nenhuma impressora encontrada.");
      } else {
        toast.success(`QZ Tray conectado · ${list.length} impressora(s) encontrada(s).`);
        if (!form.printer_name && list[0]) set("printer_name", list[0]);
      }
    } catch (e) {
      toast.error((e as Error).message || "Erro ao conectar ao QZ Tray.");
    } finally {
      setQzBusy(false);
    }
  };

  const handleTestPrint = async () => {
    setQzBusy(true);
    try {
      await printQzTextTest(form.printer_name, previewText);
      toast.success("Teste de impressão enviado com sucesso.");
    } catch (e) {
      const msg = (e as Error).message || "Erro ao enviar teste de impressão.";
      toast.error(msg);
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
            {/* Bloco 1 — Impressora */}
            <Card>
              <CardHeader><CardTitle className="text-base">Impressora</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Nome da impressora</Label>
                  <Input
                    value={form.printer_name}
                    onChange={(e) => set("printer_name", e.target.value)}
                    placeholder="Ex: Balcão"
                    className="mt-1.5"
                  />
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
                        <SelectItem key={p} value={p}>{p}</SelectItem>
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
