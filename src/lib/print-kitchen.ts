// Helper para impressão da comanda simplificada da cozinha via QZ Tray.
import type { Order } from "@/lib/domain-types";
import { buildKitchenTicket, kitchenColumnsFor } from "@/lib/kitchen-ticket";
import { printQzReceipt } from "@/lib/qz-tray";
import type { TenantPrinter } from "@/lib/tenant-printers.functions";

export async function printKitchenTicket(
  order: Order,
  printer: TenantPrinter,
): Promise<{ printer: string }> {
  const cols = kitchenColumnsFor(printer.paper_width);
  const text = buildKitchenTicket(order, cols);
  return printQzReceipt(printer.printer_name, text, {
    feedLines: 4,
    cutType: "partial",
  });
}
