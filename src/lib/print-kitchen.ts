// Helper para impressão da comanda da cozinha via QZ Tray.
import type { Order } from "@/lib/domain-types";
import { buildKitchenTicket, kitchenColumnsFor } from "@/lib/kitchen-ticket";
import { buildReceipt, type ReceiptStoreInfo } from "@/lib/receipt-builder";
import { DEFAULT_PRINTER_SETTINGS, type PrinterSettings } from "@/lib/printer-types";
import { printQzReceipt } from "@/lib/qz-tray";
import type { TenantPrinter } from "@/lib/tenant-printers.functions";
import { webBluetoothPrinter } from "@/lib/bluetooth-printer";

export function buildKitchenTicketForPrinter(order: Order, printer: TenantPrinter): string {
  const ov = printer.layout_overrides ?? null;
  const fontSize = ov?.font_size ?? printer.font_size;
  const fontFamily = ov?.font_family ?? printer.font_family;
  const cols = kitchenColumnsFor(printer.paper_width, fontSize, fontFamily);
  return buildKitchenTicket(order, cols, { doubleBody: ov?.double_kitchen_font === true });
}

export async function printKitchenTicketViaBluetooth(
  order: Order,
  printer?: TenantPrinter,
  options?: { automaticNewOrder?: boolean },
): Promise<void> {
  const overrides = printer?.layout_overrides ?? null;
  const text = printer
    ? buildKitchenTicketForPrinter(order, printer)
    : buildKitchenTicket(order, 32);
  const copies = options?.automaticNewOrder && overrides?.duplicate_new_order ? 2 : 1;
  const feed = "\n".repeat(Math.max(0, overrides?.feed_lines ?? 4));
  const cut =
    overrides?.cut_type === "full" ? "\x1dV0" : overrides?.cut_type === "partial" ? "\x1dV1" : "";
  const payload = new TextEncoder().encode(text + feed + cut);
  for (let copy = 0; copy < copies; copy += 1) {
    await webBluetoothPrinter.print(payload);
  }
}

export async function printKitchenTicket(
  order: Order,
  printer: TenantPrinter,
  storeInfo?: ReceiptStoreInfo,
  options?: { automaticNewOrder?: boolean },
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
    text = buildKitchenTicketForPrinter(order, printer);
  }

  const copies = options?.automaticNewOrder && ov?.duplicate_new_order ? 2 : 1;

  return printQzReceipt(printer.printer_name, text, {
    feedLines: ov?.feed_lines ?? 4,
    cutType: ov?.cut_type ?? "partial",
    copies,
  });
}
