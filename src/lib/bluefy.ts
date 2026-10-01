export const BLUEFY_PREF_KEY = "menuzin:open-in-bluefy";
export const BLUEFY_APP_STORE_URL = "https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055";

export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const platform = (navigator as unknown as { platform?: string }).platform || "";
  if (/iPad|iPhone|iPod/i.test(ua) || /iPad|iPhone|iPod/i.test(platform)) return true;
  // iPadOS / alguns navegadores iOS se identificam como Mac
  return (/Mac/i.test(ua) || /Mac/i.test(platform)) && (navigator.maxTouchPoints ?? 0) > 1;
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
  // Formato documentado pela PNN Soft: bluefy://open?url=example.com
  return `bluefy://open?url=${url.replace(/^https?:\/\//, "")}`;
}
