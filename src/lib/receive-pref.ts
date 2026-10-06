// Preferência de recebimento escolhida no topo da loja (por loja, neste aparelho).
export type ReceivePref = {
  mode: "entrega" | "retirada" | "consumo_local";
  cep?: string | null;
  neighborhood?: string | null;
  zoneId?: string | null;
  fee?: number | null;
  label?: string | null;
};

const key = (slug: string) => `menuzin:receive:${slug}`;

export function readReceivePref(slug: string): ReceivePref | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(slug));
    return raw ? (JSON.parse(raw) as ReceivePref) : null;
  } catch {
    return null;
  }
}

export function writeReceivePref(slug: string, pref: ReceivePref) {
  try {
    window.localStorage.setItem(key(slug), JSON.stringify(pref));
    window.dispatchEvent(new CustomEvent("menuzin:receive-pref", { detail: { slug } }));
  } catch {
    /* ignore */
  }
}
