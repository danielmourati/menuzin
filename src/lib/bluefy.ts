export const BLUEFY_PREF_KEY = "menuzin:open-in-bluefy";
export const BLUEFY_APP_STORE_URL = "https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055";

export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

export function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function getBluefyPref(): boolean {
  try {
    return localStorage.getItem(BLUEFY_PREF_KEY) === "1";
  } catch {
    return false;
  }
}

export function setBluefyPref(on: boolean) {
  try {
    if (on) localStorage.setItem(BLUEFY_PREF_KEY, "1");
    else localStorage.removeItem(BLUEFY_PREF_KEY);
  } catch {
    /* ignore */
  }
}

export function bluefyLink(url: string) {
  return `bluefy://open?url=${encodeURIComponent(url)}`;
}
