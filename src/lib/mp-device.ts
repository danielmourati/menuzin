/** Script oficial de segurança do Mercado Pago: gera o device id usado pelo antifraude. */
declare global {
  interface Window { MP_DEVICE_SESSION_ID?: string }
}

export function loadMpSecurityScript() {
  if (typeof document === "undefined") return;
  if (document.getElementById("mp-security-js")) return;
  const s = document.createElement("script");
  s.id = "mp-security-js";
  s.src = "https://www.mercadopago.com/v2/security.js";
  s.setAttribute("view", "checkout");
  s.async = true;
  document.head.appendChild(s);
}

export function getMpDeviceId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.MP_DEVICE_SESSION_ID || undefined;
}
