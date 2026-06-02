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
import { Loader2, Printer, Save, AlertTriangle, Plug } from "lucide-react";
import { toast } from "sonner";
import {
  getMyPrinterSettings, saveMyPrinterSettings,
} from "@/lib/printer-settings.functions";
import {
  DEFAULT_PRINTER_SETTINGS, columnsFor, type PrinterSettings,
} from "@/lib/printer-types";
import { getMyTenant } from "@/lib/tenants.functions";
import { buildReceiptPreviewText } from "@/lib/receipt-preview";
import { ensureQzConnected, listQzPrinters, printQzTextTest } from "@/lib/qz-tray";

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

  // Pedido fictício para o cupom de teste
  const testOrder: Order = useMemo(
    () => ({
      id: "00000000-0000-0000-0000-000000000000",
      number: 1234,
      storeId: "test",
      customerName: "Cliente Teste",
      whatsapp: "(00) 00000-0000",
      mode: "retirada",
      status: "novo",
      paymentStatus: "manual",
      payment: "Pagar no balcão",
      items: [
        { productId: "p1", name: "Produto Teste", qty: 1, unitPrice: 10, addons: [] },
        { productId: "p2", name: "Taxa de Serviço", qty: 1, unitPrice: 1, addons: [] },
      ],
      subtotal: 11,
      deliveryFee: 0,
      total: 11,
      createdAt: new Date().toISOString(),
      statusHistory: [],
    }),
    [],
  );

  const tenant = tenantData?.tenant as
    | { name?: string; whatsapp?: string; address?: string; social?: { instagram?: string } }
    | null
    | undefined;

  const browserSupportsBluetooth = typeof navigator !== "undefined" && "bluetooth" in navigator;
  const browserSupportsUsb = typeof navigator !== "undefined" && "usb" in navigator;

  const handleTestPrint = () => {
    document.body.classList.add("printing-receipt");
    setTimeout(() => {
      window.print();
      document.body.classList.remove("printing-receipt");
    }, 100);
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
                      <SelectItem value="bluetooth">Bluetooth</SelectItem>
                      <SelectItem value="usb">USB</SelectItem>
                      <SelectItem value="network">Rede / IP</SelectItem>
                      <SelectItem value="browser">Navegador / Sistema (recomendado)</SelectItem>
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
              <Button size="sm" onClick={handleTestPrint}>
                <Printer className="mr-1.5 h-4 w-4" /> Imprimir teste
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-muted/40 p-2 flex justify-center max-h-[70vh] overflow-auto">
                <div className="shadow-sm ring-1 ring-border rounded-sm">
                  <PrintableOrder
                    order={testOrder}
                    storeName={form.show_store_name ? (tenant?.name || "Nome da Loja") : ""}
                    storePhone={form.show_whatsapp ? tenant?.whatsapp : undefined}
                    storeAddress={form.show_address ? tenant?.address : undefined}
                    storeInstagram={form.show_instagram ? tenant?.social?.instagram : undefined}
                    paperWidth={form.paper_width}
                    settings={form}
                  />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                A prévia usa o cupom real da plataforma com um pedido fictício e as opções de layout escolhidas.
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
