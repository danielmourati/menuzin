// Mantido por compatibilidade — a lógica vive em receipt-builder.ts
// para reaproveitar 100% o builder do cupom real.
export {
  buildReceiptPreviewText,
  buildReceipt,
  type ReceiptStoreInfo as PreviewContext,
} from "@/lib/receipt-builder";
