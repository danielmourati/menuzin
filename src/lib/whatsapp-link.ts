/**
 * Build WhatsApp links from plain, unencoded text. Encode the complete string
 * once so emoji sequences, accents, newlines and nested URLs stay intact.
 * Callers retain responsibility for choosing the recipient/country code.
 */
export function buildWhatsAppLink(phone: string | null | undefined, text?: string): string {
  const recipient = phone ?? "";
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${recipient}${query}`;
}