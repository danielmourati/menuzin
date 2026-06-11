import { MessageCircle } from "lucide-react";

export const WHATSAPP_CONTACT_URL =
  "https://wa.me/5586994422827?text=" +
  encodeURIComponent("Olá, gostaria de saber mais sobre o Menuzin!");

export function WhatsAppFloatingButton() {
  return (
    <a
      href={WHATSAPP_CONTACT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_25px_-5px_rgba(37,211,102,0.55)] ring-4 ring-[#25D366]/20 transition hover:scale-105 hover:bg-[#1ebe5d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40"
    >
      <MessageCircle className="h-7 w-7 fill-white" strokeWidth={0} />
      <span className="pointer-events-none absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-30" />
    </a>
  );
}
