// Helper para impressão da comanda da cozinha via QZ Tray.
import type { Order } from "@/lib/domain-types";
import { buildKitchenTicket, kitchenColumnsFor } from "@/lib/kitchen-ticket";
import { buildReceipt, type ReceiptStoreInfo } from "@/lib/receipt-builder";
import { DEFAULT_PRINTER_SETTINGS, type PrinterSettings } from "@/lib/printer-types";
import { printQzReceipt } from "@/lib/qz-tray";
import type { TenantPrinter } from "@/lib/tenant-printers.functions";

export async function printKitchenTicket(
  order: Order,
  printer: TenantPrinter,
  storeInfo?: ReceiptStoreInfo,
): Promise<{ printer: string }> {
  const ov = printer.layout_overrides ?? null;
  const fontSize = ov?.font_size ?? printer.font_size;
  const fontFamily = ov?.font_family ?? printer.font_family;
  const cols = kitchenColumnsFor(printer.paper_width, fontSize, fontFamily);

  let text: string;
  if (ov?.full_kitchen_receipt) {
    const settings: PrinterSettings = {
      ...DEFAULT_PRINTER_SETTINGS,
      printer_name: printer.printer_name,
      paper_width: printer.paper_width,
      font_size: fontSize,
      font_family: fontFamily,
      cut_type: ov?.cut_type ?? "partial",
      feed_lines: ov?.feed_lines ?? 4,
      use_bold_titles: ov?.use_bold_titles ?? true,
      use_double_total: ov?.use_double_total ?? true,
      show_store_name: ov?.show_store_name ?? true,
      show_address: ov?.show_address ?? false,
      show_document: ov?.show_document ?? false,
      show_whatsapp: ov?.show_whatsapp ?? false,
      show_pix: ov?.show_pix ?? false,
      show_instagram: ov?.show_instagram ?? false,
      show_thank_message: ov?.show_thank_message ?? false,
      thank_message: ov?.thank_message ?? "",
      auto_connect: true,
      auto_accept_orders: false,
      tenant_id: printer.tenant_id,
    };
    text = buildReceipt(order, cols, settings, storeInfo ?? {});
  } else {
    text = buildKitchenTicket(order, cols);
  }

  return printQzReceipt(printer.printer_name, text, {
    feedLines: ov?.feed_lines ?? 4,
    cutType: ov?.cut_type ?? "partial",
  });
}
