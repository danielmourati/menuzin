// Helper para impressão silenciosa de pedidos via QZ Tray. Reaproveita
// o builder de cupom usado na prévia, garantindo paridade byte a byte.
import type { Order } from "@/lib/domain-types";
import type { PrinterSettings } from "@/lib/printer-types";
import { columnsFor } from "@/lib/printer-types";
import { buildReceipt, type ReceiptStoreInfo } from "@/lib/receipt-builder";
import { printQzReceipt } from "@/lib/qz-tray";
import { getEffectivePrinterName } from "@/lib/device-printer";

export async function printOrderViaQz(
  order: Order,
  settings: PrinterSettings,
  storeInfo: ReceiptStoreInfo = {},
): Promise<{ printer: string }> {
  const cols = columnsFor(settings.paper_width);
  const text = buildReceipt(order, cols, settings, storeInfo);
  const effectivePrinter = getEffectivePrinterName(settings.printer_name, settings.tenant_id);
  return printQzReceipt(effectivePrinter, text, {
    feedLines: settings.feed_lines,
    cutType: settings.cut_type,
  });
}
