import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { CashDriverSummary } from "@/lib/cash.functions";
import { buildDriverSummaryText, buildDriverSummaryWhatsApp, driverWhatsAppUrl, type SummaryShift } from "@/lib/driver-summary";

export function DriverSummaryActions({ driver, shift }: { driver: CashDriverSummary; shift: SummaryShift }) {
  const [printing, setPrinting] = useState(false);
  const sendWhats = () => {
    window.open(driverWhatsAppUrl(driver.driver_phone, buildDriverSummaryWhatsApp(driver, shift, "")), "_blank", "noopener");
  };
  const print = async () => {
    setPrinting(true);
    try {
      const [{ getMyPrinterSettings }, { columnsFor }, { printQzReceipt }, { getEffectivePrinterName }] = await Promise.all([
        import("@/lib/printer-settings.functions"), import("@/lib/printer-types"), import("@/lib/qz-tray"), import("@/lib/device-printer"),
      ]);
      const { settings } = await getMyPrinterSettings();
      const cols = columnsFor(settings.paper_width, settings.font_size, settings.font_family);
      const text = buildDriverSummaryText(driver, shift, "", cols);
      const r = await printQzReceipt(getEffectivePrinterName(settings.printer_name, settings.tenant_id), text, {
        feedLines: settings.feed_lines, cutType: settings.cut_type,
      });
      toast.success(`Resumo impresso em ${r.printer}.`);
    } catch (e) {
      toast.error(`Não foi possível imprimir: ${e instanceof Error ? e.message : "verifique a impressora"}`);
    } finally { setPrinting(false); }
  };
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={sendWhats} title={driver.driver_phone ? "Abre o WhatsApp do entregador com o resumo" : "Entregador sem telefone: escolha o contato no WhatsApp"}>
        <MessageCircle className="mr-1.5 h-4 w-4" /> Enviar no WhatsApp
      </Button>
      <Button size="sm" variant="outline" onClick={print} disabled={printing}>
        {printing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Printer className="mr-1.5 h-4 w-4" />} Imprimir resumo
      </Button>
    </div>
  );
}
