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
  const effectiveFontFamily = s.use_default_typography !== false ? "mono" : s.font_family;
  const effectiveFontSize = s.use_default_typography !== false ? "normal" : s.font_size;

  const fontStyle = effectiveFontFamily === "sans"
    ? 'system-ui, -apple-system, sans-serif'
    : effectiveFontFamily === "condensed"
      ? '"Consolas", "Courier New", monospace'
      : '"Courier New", Courier, monospace';

  const fontSize = isNarrow
    ? (effectiveFontSize === "compact" ? "8px" : effectiveFontSize === "large" ? "10px" : "9px")
    : (effectiveFontSize === "compact" ? "10px" : effectiveFontSize === "large" ? "12px" : "11px");
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
          fontFamily: fontStyle,
          fontSize,
          lineHeight: 1.1,
          margin: 0,
          letterSpacing: s.font_family === "condensed" ? "-0.4px" : "0",
          fontWeight: s.use_bold_titles ? 500 : 400,
        }}
      >
        {text}
      </pre>
    </div>
  );
}
