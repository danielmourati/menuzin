import type { Order } from "@/lib/domain-types";
import type { PrinterSettings } from "@/lib/printer-types";
import { DEFAULT_PRINTER_SETTINGS } from "@/lib/printer-types";
import { buildReceipt } from "@/lib/receipt-builder";

interface PrintableOrderProps {
  order: Order;
  storeName?: string;
  storePhone?: string;
  storeAddress?: string;
  storeCnpj?: string;
  storeInstagram?: string;
  storePixKey?: string;
  /** Largura do papel térmico. Se `settings` for fornecido, sua largura prevalece. */
  paperWidth?: "55mm" | "58mm" | "80mm";
  /** Configurações de impressão por tenant (layout, separador, visibilidade...). */
  settings?: PrinterSettings;
}

export function PrintableOrder({
  order,
  storeName = "Burger Prime",
  storePhone = "(86) 99999-9999",
  storeAddress = "Av. Beira Rio, 123 — Centro, Parnaíba/PI",
  storeCnpj,
  storeInstagram,
  storePixKey,
  paperWidth,
  settings,
}: PrintableOrderProps) {
  const s = settings ?? DEFAULT_PRINTER_SETTINGS;
  const widthRaw = paperWidth ?? s.paper_width;
  const isNarrow = widthRaw === "55mm" || widthRaw === "58mm";
  const cols = isNarrow ? 32 : 48;
  const fontSize =
    s.font_size === "compact" ? (isNarrow ? "9px" : "10px") : (isNarrow ? "10px" : "12px");
  const widthClass = isNarrow ? "max-w-[58mm]" : "max-w-[80mm]";
  const pageSize = isNarrow ? "58mm" : "80mm";

  const text = buildReceipt(order, cols, s, {
    storeName,
    storePhone,
    storeAddress,
    storeCnpj,
    storeInstagram,
    storePixKey,
  });

  return (
    <div className={`printable-order-receipt mx-auto w-full ${widthClass} bg-white text-black p-2 select-none`}>
      <style>{`@media print { @page { size: ${pageSize} auto; margin: 2mm; } }`}</style>
      <pre
        className="font-mono leading-tight whitespace-pre"
        style={{
          fontFamily: '"Courier New", Courier, monospace',
          fontSize,
          lineHeight: 1.15,
          margin: 0,
          letterSpacing: 0,
          fontWeight: s.use_bold_titles ? 500 : 400,
        }}
      >
        {text}
      </pre>
    </div>
  );
}
