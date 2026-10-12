// Helper para impressão da comanda da cozinha via QZ Tray.
import type { Order } from "@/lib/domain-types";
import { buildKitchenTicket } from "@/lib/kitchen-ticket";
import { buildReceipt, type ReceiptStoreInfo } from "@/lib/receipt-builder";
import { DEFAULT_PRINTER_SETTINGS, resolvePrinterTypography, type PrinterSettings } from "@/lib/printer-types";
import { printQzReceipt } from "@/lib/qz-tray";
import type { TenantPrinter } from "@/lib/tenant-printers.functions";
import { webBluetoothPrinter } from "@/lib/bluetooth-printer";

export function buildKitchenTicketForPrinter(order: Order, printer: TenantPrinter, storeInfo?: ReceiptStoreInfo): string {
  const ov = printer.layout_overrides ?? null;
  const fontSize = ov?.font_size ?? printer.font_size;
  const fontFamily = ov?.font_family ?? printer.font_family;
  const { cols, compact } = resolvePrinterTypography({ paper_width: printer.paper_width, font_size: fontSize, font_family: fontFamily, use_default_typography: false });
  if (ov?.full_kitchen_receipt) {
    const settings: PrinterSettings = {
      ...DEFAULT_PRINTER_SETTINGS,
      ...ov,
      tenant_id: printer.tenant_id,
      printer_name: printer.printer_name,
      paper_width: printer.paper_width,
      font_size: fontSize,
      font_family: fontFamily,
      use_default_typography: false,
    };
    return buildReceipt(order, cols, settings, storeInfo ?? {});
  }
  return buildKitchenTicket(order, cols, { doubleBody: ov?.double_kitchen_font === true, compact });
}

export async function printKitchenTicketViaBluetooth(
  order: Order,
  printer?: TenantPrinter,
  options?: { automaticNewOrder?: boolean },
  storeInfo?: ReceiptStoreInfo,
): Promise<void> {
  const overrides = printer?.layout_overrides ?? null;
  const text = printer
    ? buildKitchenTicketForPrinter(order, printer, storeInfo)
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
  const text = buildKitchenTicketForPrinter(order, printer, storeInfo);

  const copies = options?.automaticNewOrder && ov?.duplicate_new_order ? 2 : 1;

  return printQzReceipt(printer.printer_name, text, {
    feedLines: ov?.feed_lines ?? 4,
    cutType: ov?.cut_type ?? "partial",
    copies,
  });
}
