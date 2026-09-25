// Monta o endereço da loja como "Rua, Nº — Bairro".
// Aceita tanto o formato do banco (snake_case) quanto o da UI (camelCase).
export type TenantAddressLike = {
  address?: string | null;
  address_number?: string | null;
  addressNumber?: string | null;
  neighborhood?: string | null;
};

export function formatTenantAddress(t: TenantAddressLike | null | undefined): string {
  if (!t) return "";
  const street = (t.address ?? "").trim();
  const num = (t.address_number ?? t.addressNumber ?? "").trim();
  const bairro = (t.neighborhood ?? "").trim();
  // Endereços antigos têm número/bairro embutidos na rua: mostra como está.
  if (!num) return street;
  let out = street ? `${street}, ${num}` : num;
  if (bairro && !street.toLowerCase().includes(bairro.toLowerCase())) out += ` — ${bairro}`;
  return out;
}
