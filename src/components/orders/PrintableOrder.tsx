import type { Order } from "@/lib/domain-types";
import type { PrinterSettings } from "@/lib/printer-types";
import { DEFAULT_PRINTER_SETTINGS, resolvePrinterTypography } from "@/lib/printer-types";
import { buildReceipt } from "@/lib/receipt-builder";
import { parsePrintSpans } from "@/lib/escpos-format";

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
  const { cols } = resolvePrinterTypography({ ...s, paper_width: width });
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
    <div className={`printable-order-receipt mx-auto w-full ${widthClass} p-1 select-none`}>
      <style>{`
        @media print {
          @page { size: ${width} auto; margin: ${pageMargin}; }
          html, body { margin: 0; padding: 0; background: var(--receipt-paper); }
          .printable-order-receipt { width: 100%; max-width: ${width}; padding: 0; }
        }
      `}</style>
      <pre
        className="receipt-text font-mono whitespace-pre"
        style={{
          width: `${cols}ch`,
          fontSize: isNarrow ? "9px" : "11px",
          lineHeight: 1.1,
          margin: 0,
          letterSpacing: 0,
        }}
      >
        {parsePrintSpans(text).map((span, index) => span.bold
          ? <strong key={index}>{span.text}</strong>
          : <span key={index}>{span.text}</span>)}
      </pre>
    </div>
  );
}
