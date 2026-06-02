import type { Order } from "@/lib/domain-types";
import type { PrinterSettings } from "@/lib/printer-types";
import { DEFAULT_PRINTER_SETTINGS, columnsFor } from "@/lib/printer-types";
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
  paperWidth?: "55mm" | "80mm";
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
  const width = paperWidth ?? s.paper_width;
  const isNarrow = width === "55mm";
  const cols = columnsFor(width);
  const fontSize = isNarrow
    ? (s.font_size === "compact" ? "8px" : "9px")
    : (s.font_size === "compact" ? "10px" : "11px");
  const widthClass = isNarrow ? "max-w-[55mm]" : "max-w-[80mm]";
  const pageMargin = isNarrow ? "1mm" : "2mm";

  const text = buildReceipt(order, cols, s, {
    storeName,
    storePhone,
    storeAddress,
    storeCnpj,
    storeInstagram,
    storePixKey,
  });

  return (
    <div className={`printable-order-receipt mx-auto w-full ${widthClass} bg-white text-black p-1 select-none`}>
      <style>{`
        @media print {
          @page { size: ${width} auto; margin: ${pageMargin}; }
          html, body { margin: 0; padding: 0; background: #fff; }
          .printable-order-receipt { width: 100%; max-width: ${width}; padding: 0; }
        }
      `}</style>
      <pre
        className="font-mono whitespace-pre"
        style={{
          fontFamily: '"Courier New", Courier, monospace',
          fontSize,
          lineHeight: 1.1,
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
