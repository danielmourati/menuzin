// Helper para impressão da comanda simplificada da cozinha via QZ Tray.
import type { Order } from "@/lib/domain-types";
import { buildKitchenTicket, kitchenColumnsFor } from "@/lib/kitchen-ticket";
import { printQzReceipt } from "@/lib/qz-tray";
import type { TenantPrinter } from "@/lib/tenant-printers.functions";

export async function printKitchenTicket(
  order: Order,
  printer: TenantPrinter,
): Promise<{ printer: string }> {
  const ov = printer.layout_overrides ?? null;
  const fontSize = ov?.font_size ?? printer.font_size;
  const fontFamily = ov?.font_family ?? printer.font_family;
  const cols = kitchenColumnsFor(printer.paper_width, fontSize, fontFamily);
  const text = buildKitchenTicket(order, cols);
  return printQzReceipt(printer.printer_name, text, {
    feedLines: ov?.feed_lines ?? 4,
    cutType: ov?.cut_type ?? "partial",
  });
}
